/**
 * Meta WhatsApp Cloud API sender (server-only).
 * Credentials are read from secrets inside the function, never at module scope.
 */

export type WhatsAppSendResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "invalid_number" | "provider_error" };

type CloudConfig = {
  token: string;
  phoneNumberId: string;
  template: string;
  language: string;
  version: string;
};

function cloudConfig(): CloudConfig | null {
  const token = process.env["WHATSAPP_API_TOKEN"];
  const phoneNumberId = process.env["WHATSAPP_PHONE_NUMBER_ID"];
  if (!token || !phoneNumberId) return null;
  return {
    token,
    phoneNumberId,
    template: process.env["WHATSAPP_OTP_TEMPLATE_NAME"] || "otp_verification",
    language: process.env["WHATSAPP_OTP_TEMPLATE_LANG"] || "en_US",
    version: process.env["WHATSAPP_API_VERSION"] || "v21.0",
  };
}

export function isWhatsAppConfigured(): boolean {
  return cloudConfig() !== null;
}

/** Sends the one-time code using an approved authentication template. */
export async function sendWhatsAppOtpMessage(
  phoneE164: string,
  code: string,
): Promise<WhatsAppSendResult> {
  const cfg = cloudConfig();
  if (!cfg) return { ok: false, reason: "not_configured" };

  const body = {
    messaging_product: "whatsapp",
    to: phoneE164.replace(/^\+/, ""),
    type: "template",
    template: {
      name: cfg.template,
      language: { code: cfg.language },
      components: [
        { type: "body", parameters: [{ type: "text", text: code }] },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: code }],
        },
      ],
    },
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${cfg.version}/${cfg.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (res.ok) return { ok: true };

    const text = await res.text();
    // Log server-side only; never surfaced to the browser.
    console.error("[whatsapp] send failed", res.status, text.slice(0, 500));

    if (/invalid.*recipient|not.*whatsapp|131026|131_?51/i.test(text)) {
      return { ok: false, reason: "invalid_number" };
    }

    // Some templates have no URL button; retry once without the button component.
    if (/button|component/i.test(text)) {
      const retry = await fetch(
        `https://graph.facebook.com/${cfg.version}/${cfg.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cfg.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...body,
            template: {
              ...body.template,
              components: [{ type: "body", parameters: [{ type: "text", text: code }] }],
            },
          }),
        },
      );
      if (retry.ok) return { ok: true };
      console.error("[whatsapp] retry failed", retry.status, (await retry.text()).slice(0, 500));
    }

    return { ok: false, reason: "provider_error" };
  } catch (err) {
    console.error("[whatsapp] network error", err);
    return { ok: false, reason: "provider_error" };
  }
}
