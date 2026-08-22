/** Server-only OTP primitives. Never imported from browser code. */

export const OTP_TTL_MS = 5 * 60_000;
export const RESEND_COOLDOWN_MS = 60_000;
export const MAX_ATTEMPTS = 5;

/** Cryptographically secure 6-digit code. */
export function generateOtp(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0]! % 1_000_000).padStart(6, "0");
}

/** SHA-256 of phone + code + server pepper — plaintext codes are never stored. */
export async function hashOtp(phone: string, code: string): Promise<string> {
  const pepper = process.env["OTP_PEPPER"] ?? process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "swastik-otp";
  const bytes = new TextEncoder().encode(`${phone}:${code}:${pepper}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Deterministic internal address for phone-only customers (never emailed). */
export function aliasEmailFor(phoneE164: string): string {
  return `wa${phoneE164.replace(/\D/g, "")}@phone.swastikcamphor.in`;
}
