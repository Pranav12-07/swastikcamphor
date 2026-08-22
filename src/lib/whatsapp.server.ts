/**
 * WhatsApp OTP delivery provider abstraction.
 *
 * The authentication logic never talks to a provider directly — it calls
 * `sendWhatsAppOTP()` and reacts to the result. Swapping providers (Twilio,
 * Meta WhatsApp Cloud API, …) means editing only this file.
 *
 * Server-only: never import from a component or a client-reachable module scope.
 */

export type WhatsAppSendResult =
  | { ok: true; provider: string; messageId: string | null }
  | { ok: false; reason: "not_configured" | "provider_error"; message: string };

/** True when a real, authorized WhatsApp Business provider is wired up. */
export function isWhatsAppConfigured(): boolean {
  if (process.env["WHATSAPP_OTP_ENABLED"] === "false") return false;
  return whichProvider() !== null;
}

function whichProvider(): "twilio" | "meta" | null {
  const explicit = process.env["WHATSAPP_PROVIDER"];
  const hasTwilio = Boolean(process.env["TWILIO_API_KEY"] && process.env["LOVABLE_API_KEY"]);
  const hasMeta = Boolean(process.env["WHATSAPP_ACCESS_TOKEN"] && process.env["WHATSAPP_PHONE_NUMBER_ID"]);
  if (explicit === "twilio") return hasTwilio ? "twilio" : null;
  if (explicit === "meta") return hasMeta ? "meta" : null;
  if (hasTwilio) return "twilio";
  if (hasMeta) return "meta";
  return null;
}

/**
 * Delivers a one-time code over WhatsApp. Returns `ok: false` (never throws and
 * never pretends) when no provider is configured or the provider rejects it.
 */
export async function sendWhatsAppOTP(phoneE164: string, otp: string): Promise<WhatsAppSendResult> {
  const provider = whichProvider();
  if (!provider) {
    return {
      ok: false,
      reason: "not_configured",
      message: "WhatsApp verification is currently being configured. Please use email verification for now.",
    };
  }
  try {
    return provider === "twilio"
      ? await sendViaTwilio(phoneE164, otp)
      : await sendViaMetaCloud(phoneE164, otp);
  } catch (error) {
    console.error("WhatsApp OTP delivery failed", error);
    return {
      ok: false,
      reason: "provider_error",
      message: "WhatsApp verification is temporarily unavailable. Please use email verification.",
    };
  }
}

const OTP_TEXT = (otp: string) =>
  `Your Swastik Camphor verification code is ${otp}. This code expires in 5 minutes. Do not share this code with anyone.`;

/** Twilio WhatsApp through the Lovable connector gateway. */
async function sendViaTwilio(phoneE164: string, otp: string): Promise<WhatsAppSendResult> {
  const from = process.env["TWILIO_WHATSAPP_FROM"] ?? "whatsapp:+14155238886";
  const response = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`,
      "X-Connection-Api-Key": process.env["TWILIO_API_KEY"]!,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: `whatsapp:${phoneE164}`,
      From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
      Body: OTP_TEXT(otp),
    }),
  });
  const body = await response.text();
  if (!response.ok) {
    console.error(`Twilio WhatsApp send failed [${response.status}]: ${body}`);
    return {
      ok: false,
      reason: "provider_error",
      message: "WhatsApp verification is temporarily unavailable. Please use email verification.",
    };
  }
  let messageId: string | null = null;
  try {
    messageId = (JSON.parse(body) as { sid?: string }).sid ?? null;
  } catch {
    /* non-JSON success body — delivery still accepted */
  }
  return { ok: true, provider: "twilio", messageId };
}

/** Meta WhatsApp Cloud API with an approved authentication template. */
async function sendViaMetaCloud(phoneE164: string, otp: string): Promise<WhatsAppSendResult> {
  const apiUrl = process.env["WHATSAPP_API_URL"] ?? "https://graph.facebook.com/v21.0";
  const phoneNumberId = process.env["WHATSAPP_PHONE_NUMBER_ID"]!;
  const template = process.env["WHATSAPP_TEMPLATE_NAME"];

  const payload = template
    ? {
        messaging_product: "whatsapp",
        to: phoneE164.replace("+", ""),
        type: "template",
        template: {
          name: template,
          language: { code: process.env["WHATSAPP_TEMPLATE_LANG"] ?? "en" },
          components: [
            { type: "body", parameters: [{ type: "text", text: otp }] },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [{ type: "text", text: otp }],
            },
          ],
        },
      }
    : {
        messaging_product: "whatsapp",
        to: phoneE164.replace("+", ""),
        type: "text",
        text: { body: OTP_TEXT(otp) },
      };

  const response = await fetch(`${apiUrl}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env["WHATSAPP_ACCESS_TOKEN"]}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await response.text();
  if (!response.ok) {
    console.error(`WhatsApp Cloud API send failed [${response.status}]: ${body}`);
    return {
      ok: false,
      reason: "provider_error",
      message: "WhatsApp verification is temporarily unavailable. Please use email verification.",
    };
  }
  let messageId: string | null = null;
  try {
    messageId = (JSON.parse(body) as { messages?: { id: string }[] }).messages?.[0]?.id ?? null;
  } catch {
    /* provider returned a non-JSON success body */
  }
  return { ok: true, provider: "meta", messageId };
}
