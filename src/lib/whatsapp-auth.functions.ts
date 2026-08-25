import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const sendSchema = z.object({ phone: z.string().trim().min(6).max(20) });
const verifySchema = z.object({
  phone: z.string().trim().min(6).max(20),
  sessionId: z.string().uuid(),
  code: z.string().trim().regex(/^\d{6}$/, "Please enter the 6-digit code."),
});

function callerIp(): string | null {
  const req = getRequest();
  const h = req?.headers;
  if (!h) return null;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null
  );
}

/** Sends (or resends) a WhatsApp one-time code. Never returns the code. */
export const sendWhatsAppOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => sendSchema.parse(input))
  .handler(async ({ data }) => {
    const { normalizeIndianPhone, issueOtp, maskPhone } = await import("./whatsapp-auth.server");
    const phone = normalizeIndianPhone(data.phone);
    if (!phone) return { ok: false as const, message: "Please enter a valid mobile number." };

    const result = await issueOtp(phone, callerIp());
    if (!result.ok) return { ok: false as const, message: result.message };
    return { ok: true as const, sessionId: result.sessionId, masked: maskPhone(phone) };
  });

/** Verifies the code and returns a single-use token the browser exchanges for a session. */
export const verifyWhatsAppOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => verifySchema.parse(input))
  .handler(async ({ data }) => {
    const { normalizeIndianPhone, verifyOtpAndSignIn } = await import("./whatsapp-auth.server");
    const phone = normalizeIndianPhone(data.phone);
    if (!phone) return { ok: false as const, message: "Please enter a valid mobile number." };

    const result = await verifyOtpAndSignIn(phone, data.sessionId, data.code);
    if (!result.ok) return { ok: false as const, message: result.message };
    return { ok: true as const, tokenHash: result.tokenHash };
  });
