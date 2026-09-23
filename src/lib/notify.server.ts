/**
 * Server-only admin activity notifier.
 * Every important website/admin event lands in `admin_notifications`
 * (visible at /admin/notifications) and is emailed to the configured admin inbox.
 */

const FALLBACK_ADMIN_EMAIL = "shop@online.swastikcamphor.in";

export type AdminEvent = {
  type: string;
  title: string;
  body?: string;
  link?: string | null;
  /** Prevents duplicate mails for the same logical event. */
  idempotencyKey?: string;
  details?: Record<string, string | number | boolean | null | undefined>;
};

async function adminEmail(): Promise<string> {
  const fromEnv = process.env["ADMIN_NOTIFICATION_EMAIL"];
  if (fromEnv) return fromEnv;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("store_settings")
      .select("value")
      .eq("key", "contact")
      .maybeSingle();
    const value = (data?.value ?? {}) as Record<string, unknown>;
    const email = value["admin_email"];
    if (typeof email === "string" && email.includes("@")) return email;
  } catch {
    /* fall through to default */
  }
  return FALLBACK_ADMIN_EMAIL;
}

export async function notifyAdmin(event: AdminEvent): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  try {
    await supabaseAdmin.from("admin_notifications").insert({
      type: event.type,
      title: event.title,
      body: event.body ?? null,
      link: event.link ?? null,
    });
  } catch (error) {
    console.error("admin notification insert failed", error);
  }

  try {
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    await sendTemplateEmail("admin-alert", await adminEmail(), {
      templateData: {
        eventType: event.type,
        title: event.title,
        body: event.body ?? "",
        link: event.link ?? "",
        occurredAt: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        details: Object.entries(event.details ?? {})
          .filter(([, v]) => v !== undefined && v !== null && v !== "")
          .map(([k, v]) => ({ label: k, value: String(v) })),
      },
      idempotencyKey: event.idempotencyKey ?? `${event.type}-${crypto.randomUUID()}`,
    });
  } catch (error) {
    console.error("admin notification email failed", error);
  }
}

export async function getAdminEmail(): Promise<string> {
  return adminEmail();
}

/**
 * Every address that should receive store/order mail:
 * the configured shop inbox plus the account email of every admin user.
 */
export async function getAdminEmails(): Promise<string[]> {
  const recipients = new Set<string>();
  const configured = await adminEmail();
  if (configured) recipients.add(configured.toLowerCase());

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const ids = new Set((roles ?? []).map((r) => r.user_id as string));
    if (ids.size > 0) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      for (const user of list?.users ?? []) {
        if (ids.has(user.id) && user.email?.includes("@")) {
          recipients.add(user.email.toLowerCase());
        }
      }
    }
  } catch (error) {
    console.error("admin recipient lookup failed", error);
  }

  return [...recipients];
}

/** Sends one template to every admin recipient; resolves sent=true if any delivery worked. */
export async function sendAdminTemplateEmail(
  template: string,
  options: { templateData: Record<string, unknown>; idempotencyKey: string; replyTo?: string },
): Promise<{ sent: boolean; reason?: string }> {
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  const recipients = await getAdminEmails();
  let sent = false;
  let reason: string | undefined;
  for (const to of recipients) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (sendTemplateEmail as any)(template, to, {
        ...options,
        idempotencyKey: `${options.idempotencyKey}-${to}`,
      });
      if (result?.sent) sent = true;
      else reason = result?.reason ?? reason;
    } catch (error) {
      reason = error instanceof Error ? error.message : String(error);
      console.error(`admin email to ${to} failed`, error);
    }
  }
  if (recipients.length === 0) reason = "no admin recipients";
  return { sent, reason };
}
