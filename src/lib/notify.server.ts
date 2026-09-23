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
