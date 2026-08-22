import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Indian mobile number in E.164 (+91XXXXXXXXXX). */
const phoneSchema = z
  .string()
  .trim()
  .transform((raw) => {
    const digits = raw.replace(/[^\d+]/g, "");
    if (/^\+91[6-9]\d{9}$/.test(digits)) return digits;
    if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;
    if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
    return "";
  })
  .refine((v) => v.length === 13, "Please enter a valid Indian mobile number.");

const requestSchema = z.object({
  phone: phoneSchema,
  full_name: z.string().trim().max(120).optional(),
});

const verifySchema = z.object({
  phone: phoneSchema,
  code: z.string().trim().regex(/^\d{6}$/, "Incorrect OTP. Please check the code and try again."),
  full_name: z.string().trim().max(120).optional(),
});

/** Request a WhatsApp one-time code. Never returns the code itself. */
export const requestWhatsappOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendWhatsAppOTP, isWhatsAppConfigured } = await import("@/lib/whatsapp.server");
    const { hashOtp, generateOtp, OTP_TTL_MS, RESEND_COOLDOWN_MS } = await import("@/lib/otp.server");

    if (!isWhatsAppConfigured()) {
      return {
        ok: false as const,
        reason: "not_configured" as const,
        message: "WhatsApp verification is currently being configured. Please use email verification for now.",
      };
    }

    const windowStart = new Date(Date.now() - 15 * 60_000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("phone_otps")
      .select("id, created_at")
      .eq("phone", data.phone)
      .gte("created_at", windowStart)
      .order("created_at", { ascending: false });

    const list = recent ?? [];
    if (list.length >= 5) {
      return {
        ok: false as const,
        reason: "rate_limited" as const,
        message: "Too many attempts. Please wait before requesting another OTP.",
      };
    }
    const last = list[0];
    if (last && Date.now() - new Date(last.created_at as string).getTime() < RESEND_COOLDOWN_MS) {
      return {
        ok: false as const,
        reason: "cooldown" as const,
        message: "Please wait a moment before requesting another OTP.",
      };
    }

    const code = generateOtp();
    const sent = await sendWhatsAppOTP(data.phone, code);
    if (!sent.ok) {
      // Nothing was delivered — do not create a code and do not claim success.
      return { ok: false as const, reason: sent.reason, message: sent.message };
    }

    // Invalidate any earlier live codes for this number, then store only the hash.
    await supabaseAdmin
      .from("phone_otps")
      .update({ consumed_at: new Date().toISOString() })
      .eq("phone", data.phone)
      .is("consumed_at", null);

    const { error } = await supabaseAdmin.from("phone_otps").insert({
      phone: data.phone,
      code_hash: await hashOtp(data.phone, code),
      channel: "whatsapp",
      expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    });
    if (error) throw new Error("We could not send the OTP right now. Please try again.");

    return { ok: true as const, expiresInSeconds: OTP_TTL_MS / 1000, resendInSeconds: RESEND_COOLDOWN_MS / 1000 };
  });

/**
 * Verifies the WhatsApp OTP server-side and, on success, returns a one-time
 * token the browser exchanges for a real Supabase session. The OTP itself is
 * never trusted client-side and each code can be used only once.
 */
export const verifyWhatsappOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => verifySchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { hashOtp, MAX_ATTEMPTS, aliasEmailFor } = await import("@/lib/otp.server");

    const { data: row } = await supabaseAdmin
      .from("phone_otps")
      .select("id, code_hash, attempts, expires_at, consumed_at")
      .eq("phone", data.phone)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) {
      return { ok: false as const, message: "This OTP has expired. Please request a new OTP." };
    }
    if (new Date(row.expires_at as string).getTime() < Date.now()) {
      await supabaseAdmin.from("phone_otps").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);
      return { ok: false as const, message: "This OTP has expired. Please request a new OTP." };
    }
    if ((row.attempts as number) >= MAX_ATTEMPTS) {
      await supabaseAdmin.from("phone_otps").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);
      return { ok: false as const, message: "Too many attempts. Please wait before requesting another OTP." };
    }

    const hash = await hashOtp(data.phone, data.code);
    if (hash !== row.code_hash) {
      await supabaseAdmin
        .from("phone_otps")
        .update({ attempts: (row.attempts as number) + 1 })
        .eq("id", row.id);
      return { ok: false as const, message: "Incorrect OTP. Please check the code and try again." };
    }

    // Burn the code immediately — no replay.
    await supabaseAdmin.from("phone_otps").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);

    // Match the existing customer by phone; never create a duplicate profile.
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .eq("phone", data.phone)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    let userId = (profile?.id as string | undefined) ?? null;
    let email = (profile?.email as string | null | undefined) ?? null;

    if (!userId) {
      const alias = aliasEmailFor(data.phone);
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: alias,
        email_confirm: true,
        phone: data.phone,
        phone_confirm: true,
        user_metadata: { full_name: data.full_name ?? "", phone: data.phone },
      });
      if (createError || !created?.user) {
        console.error("createUser failed", createError);
        throw new Error("We could not complete sign-in. Please try again.");
      }
      userId = created.user.id;
      email = alias;
    } else if (!email) {
      const { data: userRecord } = await supabaseAdmin.auth.admin.getUserById(userId);
      email = userRecord?.user?.email ?? null;
      if (!email) {
        const alias = aliasEmailFor(data.phone);
        await supabaseAdmin.auth.admin.updateUserById(userId, { email: alias, email_confirm: true });
        email = alias;
      }
    }

    await supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        phone: data.phone,
        ...(data.full_name ? { full_name: data.full_name } : {}),
        ...(profile?.email ? {} : { email }),
        auth_method: "whatsapp",
        last_login_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    // Mint a single-use token the browser swaps for a session (no password involved).
    const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: email!,
    });
    if (linkError || !link?.properties?.hashed_token) {
      console.error("generateLink failed", linkError);
      throw new Error("We could not complete sign-in. Please try again.");
    }

    return { ok: true as const, tokenHash: link.properties.hashed_token };
  });

/** Records the sign-in method after a successful email OTP verification. */
export const recordEmailLogin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        full_name: z.string().trim().max(120).optional(),
        phone: z.string().trim().max(20).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: userRecord } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (!userRecord?.user) return { ok: false as const };
    await supabaseAdmin.from("profiles").upsert(
      {
        id: data.userId,
        email: userRecord.user.email ?? null,
        ...(data.full_name ? { full_name: data.full_name } : {}),
        ...(data.phone ? { phone: data.phone } : {}),
        auth_method: "email",
        last_login_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    return { ok: true as const };
  });
