/**
 * PhonePe Payment Gateway (Standard Checkout) — server-only helper.
 *
 * Requires these secrets:
 *   PHONEPE_MERCHANT_ID, PHONEPE_SALT_KEY, PHONEPE_SALT_INDEX, PHONEPE_ENV ("sandbox" | "live")
 *
 * Nothing here is ever trusted from the browser: amounts come from the
 * database, and every status/callback is verified with the X-VERIFY checksum.
 */
import { createHash } from "node:crypto";

export type PhonePeConfig = {
  merchantId: string;
  saltKey: string;
  saltIndex: string;
  host: string;
};

export function getPhonePeConfig(): PhonePeConfig | null {
  const merchantId = process.env["PHONEPE_MERCHANT_ID"];
  const saltKey = process.env["PHONEPE_SALT_KEY"];
  if (!merchantId || !saltKey) return null;
  const saltIndex = process.env["PHONEPE_SALT_INDEX"] || "1";
  const env = (process.env["PHONEPE_ENV"] || "sandbox").toLowerCase();
  const host =
    env === "live" || env === "production"
      ? "https://api.phonepe.com/apis/hermes"
      : "https://api-preprod.phonepe.com/apis/pg-sandbox";
  return { merchantId, saltKey, saltIndex, host };
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function checksum(payload: string, path: string, cfg: PhonePeConfig) {
  return `${sha256(payload + path + cfg.saltKey)}###${cfg.saltIndex}`;
}

/** Verifies an inbound webhook/redirect checksum in a constant-shaped way. */
export function verifyCallbackChecksum(header: string | null, base64Body: string, cfg: PhonePeConfig) {
  if (!header) return false;
  const expected = `${sha256(base64Body + cfg.saltKey)}###${cfg.saltIndex}`;
  if (header.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < header.length; i += 1) diff |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export type PhonePeState = "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "EXPIRED";

/** Maps every PhonePe transaction code onto our internal payment states. */
export function mapState(code: string | undefined | null): PhonePeState {
  switch ((code ?? "").toUpperCase()) {
    case "PAYMENT_SUCCESS":
    case "COMPLETED":
    case "SUCCESS":
      return "PAID";
    case "PAYMENT_PENDING":
    case "PENDING":
    case "PAYMENT_INITIATED":
      return "PENDING";
    case "PAYMENT_CANCELLED":
    case "CANCELLED":
      return "CANCELLED";
    case "TIMED_OUT":
    case "PAYMENT_EXPIRED":
      return "EXPIRED";
    default:
      return "FAILED";
  }
}

export type InitiateArgs = {
  merchantTransactionId: string;
  amountPaise: number;
  redirectUrl: string;
  callbackUrl: string;
  userRef: string;
  phone?: string;
  /** UPI intent app hint — opens Google Pay / PhonePe / Paytm directly on mobile. */
  targetApp?: "GOOGLE_PAY" | "PHONEPE" | "PAYTM" | null;
  /** Ask PhonePe for a dynamic UPI QR for this exact transaction. */
  qr?: boolean;
  mobileFlow: boolean;
};

export type InitiateResult =
  | { ok: true; redirectUrl: string | null; intentUrl: string | null; qrData: string | null }
  | { ok: false; error: string };

export async function initiatePayment(args: InitiateArgs, cfg: PhonePeConfig): Promise<InitiateResult> {
  const payload: Record<string, unknown> = {
    merchantId: cfg.merchantId,
    merchantTransactionId: args.merchantTransactionId,
    merchantUserId: args.userRef.slice(0, 36),
    amount: args.amountPaise,
    redirectUrl: args.redirectUrl,
    redirectMode: "REDIRECT",
    callbackUrl: args.callbackUrl,
    paymentInstrument: args.qr
      ? { type: "UPI_QR" }
      : args.targetApp
        ? { type: "UPI_INTENT", targetApp: args.targetApp }
        : { type: "PAY_PAGE" },
  };
  if (args.phone) payload["mobileNumber"] = args.phone.replace(/\D/g, "").slice(-10);
  // PhonePe only accepts ANDROID/IOS here; on desktop the field must be omitted
  // so the gateway renders its web pay page (with the live scan-and-pay QR).
  if (args.mobileFlow) payload["deviceContext"] = { deviceOS: "ANDROID" };



  const base64 = Buffer.from(JSON.stringify(payload)).toString("base64");
  const path = "/pg/v1/pay";

  let res: Response;
  try {
    res = await fetch(`${cfg.host}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        "X-VERIFY": checksum(base64, path, cfg),
      },
      body: JSON.stringify({ request: base64 }),
    });
  } catch (error) {
    console.error("phonepe initiate network error", error);
    return { ok: false, error: "Could not reach the payment gateway. Please try again." };
  }

  const json = (await res.json().catch(() => null)) as
    | { success?: boolean; message?: string; data?: Record<string, any> }
    | null;
  if (!res.ok || !json?.success) {
    console.error("phonepe initiate failed", res.status, json?.message);
    return { ok: false, error: json?.message || "The payment could not be started. Please try again." };
  }

  const instrumentResponse = json.data?.["instrumentResponse"] ?? {};
  const redirect = instrumentResponse?.redirectInfo?.url as string | undefined;
  const intent = instrumentResponse?.intentUrl as string | undefined;
  const qrData = (instrumentResponse?.qrData ?? instrumentResponse?.qrString) as string | undefined;
  if (!redirect && !intent && !qrData)
    return { ok: false, error: "The payment gateway did not return a payment link." };
  return {
    ok: true,
    redirectUrl: redirect ?? intent ?? null,
    intentUrl: intent ?? null,
    qrData: qrData ?? null,
  };
}

export type StatusResult = {
  state: PhonePeState;
  code: string;
  transactionId: string | null;
  amountPaise: number | null;
  method: string | null;
  raw: Record<string, unknown>;
};

export async function checkStatus(merchantTransactionId: string, cfg: PhonePeConfig): Promise<StatusResult | null> {
  const path = `/pg/v1/status/${cfg.merchantId}/${merchantTransactionId}`;
  try {
    const res = await fetch(`${cfg.host}${path}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        "X-VERIFY": checksum("", path, cfg),
        "X-MERCHANT-ID": cfg.merchantId,
      },
    });
    const json = (await res.json().catch(() => null)) as
      | { code?: string; success?: boolean; data?: Record<string, any> }
      | null;
    if (!json) return null;
    const data = json.data ?? {};
    return {
      state: mapState(json.code ?? data["state"]),
      code: String(json.code ?? data["state"] ?? "UNKNOWN"),
      transactionId: (data["transactionId"] as string) ?? null,
      amountPaise: typeof data["amount"] === "number" ? (data["amount"] as number) : null,
      method: (data["paymentInstrument"]?.type as string) ?? null,
      raw: json as Record<string, unknown>,
    };
  } catch (error) {
    console.error("phonepe status error", error);
    return null;
  }
}
