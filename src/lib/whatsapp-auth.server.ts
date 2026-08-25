/**
 * WhatsApp OTP login core (server-only).
 * Codes are stored as salted SHA-256 hashes and never logged or returned.
 */
import { sendWhatsAppOtpMessage, isWhatsAppConfigured } from "./whatsapp.server";

export const OTP_TTL_MS = 5 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 45 * 1000;
export const MAX_ATTEMPTS = 5;
const PHONE_WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_PHONE = 3;
const MAX_PER_IP = 5;

export type OtpOutcome = { ok: true; sessionId: string } | { ok: false; message: string };

/** Normalises any Indian mobile input to +91XXXXXXXXXX, or null when invalid. */
export function normalizeIndianPhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  const ten = digits.length > 10 ? digits.slice(-10) : digits;
  if (!/^[6-9]\d{9}$/.test(ten)) return null;
  return `+91${ten}`;
}

export function maskPhone(e164: string): string {
  const tail = e164.slice(-4);
  return `+91 ******${tail}`;
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function pepper(): string {
  return process.env["SUPABASE_SERVICE_ROLE_KEY"]?.slice(0, 24) ?? "swastik-otp";
}

async function hashCode(phone: string, code: string): Promise<string> {
  return sha256(`${phone}:${code}:${pepper()}`);
}

function randomCode(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(100000 + ((arr[0] ?? 0) % 900000));
}

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

export async function logAuthEvent(
  admin: Admin,
  event: string,
  data: { phone?: string; userId?: string; detail?: string },
) {
  await admin.from("auth_events").insert({
    event,
    phone: data.phone ?? null,
    user_id: data.userId ?? null,
    detail: data.detail ?? null,
  });
}

/** Creates and delivers a fresh code, enforcing all rate limits. */
export async function issueOtp(phone: string, ip: string | null): Promise<OtpOutcome> {
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");

  if (!isWhatsAppConfigured()) {
    console.error("[whatsapp] missing WHATSAPP_API_TOKEN / WHATSAPP_PHONE_NUMBER_ID");
    return { ok: false, message: "WhatsApp login is not available right now. Please use email login." };
  }

  const windowStart = new Date(Date.now() - PHONE_WINDOW_MS).toISOString();
  const ipHash = ip ? await sha256(`${ip}:${pepper()}`) : null;

  const { data: recent } = await admin
    .from("whatsapp_otp_sessions")
    .select("id, created_at")
    .eq("phone", phone)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: false });

  if (recent && recent.length > 0) {
    const last = new Date(recent[0]!.created_at).getTime();
    if (Date.now() - last < RESEND_COOLDOWN_MS) {
      return { ok: false, message: "Please wait before requesting another OTP." };
    }
    if (recent.length >= MAX_PER_PHONE) {
      return { ok: false, message: "Too many OTP requests. Please wait and try again." };
    }
  }

  if (ipHash) {
    const { count } = await admin
      .from("whatsapp_otp_sessions")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", windowStart);
    if ((count ?? 0) >= MAX_PER_IP) {
      return { ok: false, message: "Too many OTP requests. Please wait and try again." };
    }
  }

  // A new code invalidates every earlier live code for this number.
  await admin
    .from("whatsapp_otp_sessions")
    .update({ consumed_at: new Date().toISOString() })
    .eq("phone", phone)
    .is("consumed_at", null);

  const code = randomCode();
  const { data: session, error } = await admin
    .from("whatsapp_otp_sessions")
    .insert({
      phone,
      code_hash: await hashCode(phone, code),
      expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
      ip_hash: ipHash,
    })
    .select("id")
    .single();

  if (error || !session) {
    console.error("[whatsapp] session insert failed", error);
    return { ok: false, message: "Unable to send the OTP right now. Please try again in a few minutes." };
  }

  await logAuthEvent(admin, "otp_requested", { phone });

  const sent = await sendWhatsAppOtpMessage(phone, code);
  if (!sent.ok) {
    await admin
      .from("whatsapp_otp_sessions")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", session.id);
    await logAuthEvent(admin, "otp_send_failed", { phone, detail: sent.reason });
    if (sent.reason === "invalid_number") {
      return { ok: false, message: "This number is not on WhatsApp. Please check and try again." };
    }
    return { ok: false, message: "Unable to send the OTP right now. Please try again in a few minutes." };
  }

  await logAuthEvent(admin, "otp_sent", { phone });
  return { ok: true, sessionId: session.id };
}

export type VerifyOutcome =
  | { ok: true; tokenHash: string }
  | { ok: false; message: string };

/** Verifies a code, then merges/creates the customer and mints a login token. */
export async function verifyOtpAndSignIn(
  phone: string,
  sessionId: string,
  code: string,
): Promise<VerifyOutcome> {
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");

  const { data: session } = await admin
    .from("whatsapp_otp_sessions")
    .select("id, phone, code_hash, attempts, consumed_at, expires_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.phone !== phone || session.consumed_at) {
    return { ok: false, message: "This OTP has expired. Please request a new OTP." };
  }
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await logAuthEvent(admin, "otp_expired", { phone });
    return { ok: false, message: "This OTP has expired. Please request a new OTP." };
  }
  if (session.attempts >= MAX_ATTEMPTS) {
    return { ok: false, message: "Too many attempts. Please try again later." };
  }

  if ((await hashCode(phone, code)) !== session.code_hash) {
    await admin
      .from("whatsapp_otp_sessions")
      .update({ attempts: session.attempts + 1 })
      .eq("id", session.id);
    await logAuthEvent(admin, "otp_failed", { phone });
    const left = MAX_ATTEMPTS - (session.attempts + 1);
    return {
      ok: false,
      message: left > 0 ? "Incorrect OTP. Please try again." : "Too many attempts. Please try again later.",
    };
  }

  await admin
    .from("whatsapp_otp_sessions")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", session.id);

  const digits = phone.replace(/^\+91/, "");
  const { data: matches } = await admin
    .from("profiles")
    .select("id, email, full_name, phone")
    .or(`phone.eq.${phone},phone.eq.${digits},phone.eq.91${digits}`)
    .order("created_at", { ascending: true });

  let userId = matches?.[0]?.id ?? null;
  let email = matches?.[0]?.email ?? null;

  if (!userId) {
    email = `wa${digits}@phone.swastikcamphor.in`;
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { phone, auth_method: "whatsapp" },
    });
    if (createError || !created?.user) {
      console.error("[whatsapp] createUser failed", createError);
      return { ok: false, message: "We could not complete sign-in. Please try again." };
    }
    userId = created.user.id;
  }

  if (!email) {
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    email = authUser?.user?.email ?? `wa${digits}@phone.swastikcamphor.in`;
  }

  await admin.from("profiles").upsert(
    {
      id: userId,
      phone,
      country_code: "+91",
      phone_verified: true,
      email,
      auth_method: "whatsapp",
      last_login_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError || !link?.properties?.hashed_token) {
    console.error("[whatsapp] generateLink failed", linkError);
    return { ok: false, message: "We could not complete sign-in. Please try again." };
  }

  await logAuthEvent(admin, "login_success", { phone, userId, detail: "whatsapp" });
  return { ok: true, tokenHash: link.properties.hashed_token };
}
