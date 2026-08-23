/**
 * PhonePe Payment Gateway — server-only helper.
 *
 * Uses PhonePe's CURRENT Standard Checkout API (v2, OAuth client credentials):
 *   PHONEPE_CLIENT_ID, PHONEPE_CLIENT_VERSION, PHONEPE_CLIENT_SECRET,
 *   PHONEPE_ENVIRONMENT ("PRODUCTION" | "SANDBOX")
 *
 * Legacy salt-key credentials (PHONEPE_MERCHANT_ID / PHONEPE_SALT_KEY /
 * PHONEPE_SALT_INDEX / PHONEPE_ENV) are still honoured as a fallback so an
 * existing deployment keeps working until the new keys are in place.
 *
 * Nothing here is ever trusted from the browser: amounts come from the
 * database, and every payment is re-confirmed with PhonePe's Order Status API.
 */
import { createHash } from "node:crypto";

export type PhonePeConfig =
  | {
      version: "v2";
      clientId: string;
      clientVersion: string;
      clientSecret: string;
      /** Base host for OAuth token requests. */
      authHost: string;
      /** Base host for Standard Checkout requests. */
      apiHost: string;
    }
  | {
      version: "v1";
      merchantId: string;
      saltKey: string;
      saltIndex: string;
      host: string;
    };

export function getPhonePeConfig(): PhonePeConfig | null {
  const clientId = process.env["PHONEPE_CLIENT_ID"];
  const clientSecret = process.env["PHONEPE_CLIENT_SECRET"];
  if (clientId && clientSecret) {
    const env = (process.env["PHONEPE_ENVIRONMENT"] || "PRODUCTION").toUpperCase();
    const production = env === "PRODUCTION" || env === "LIVE" || env === "PROD";
    return {
      version: "v2",
      clientId,
      clientSecret,
      clientVersion: process.env["PHONEPE_CLIENT_VERSION"] || "1",
      authHost: production
        ? "https://api.phonepe.com/apis/identity-manager"
        : "https://api-preprod.phonepe.com/apis/pg-sandbox",
      apiHost: production
        ? "https://api.phonepe.com/apis/pg"
        : "https://api-preprod.phonepe.com/apis/pg-sandbox",
    };
  }

  const merchantId = process.env["PHONEPE_MERCHANT_ID"];
  const saltKey = process.env["PHONEPE_SALT_KEY"];
  if (!merchantId || !saltKey) return null;
  const saltIndex = process.env["PHONEPE_SALT_INDEX"] || "1";
  const env = (process.env["PHONEPE_ENV"] || "sandbox").toLowerCase();
  const host =
    env === "live" || env === "production"
      ? "https://api.phonepe.com/apis/hermes"
      : "https://api-preprod.phonepe.com/apis/pg-sandbox";
  return { version: "v1", merchantId, saltKey, saltIndex, host };
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function checksum(payload: string, path: string, cfg: Extract<PhonePeConfig, { version: "v1" }>) {
  return `${sha256(payload + path + cfg.saltKey)}###${cfg.saltIndex}`;
}

function timingSafeEqualHex(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verifies an inbound webhook.
 * v2: PhonePe sends `Authorization: SHA256(username:password)` using the
 * credentials configured on the merchant dashboard.
 * v1: legacy X-VERIFY checksum over the base64 body.
 */
export function verifyWebhookAuth(header: string | null) {
  const user = process.env["PHONEPE_WEBHOOK_USERNAME"];
  const pass = process.env["PHONEPE_WEBHOOK_PASSWORD"];
  if (!user || !pass) return null; // not configured — caller decides
  if (!header) return false;
  const provided = header.trim().replace(/^SHA256\s+/i, "").toLowerCase();
  return timingSafeEqualHex(provided, sha256(`${user}:${pass}`));
}

export function verifyCallbackChecksum(
  header: string | null,
  base64Body: string,
  cfg: Extract<PhonePeConfig, { version: "v1" }>,
) {
  if (!header) return false;
  return timingSafeEqualHex(header, `${sha256(base64Body + cfg.saltKey)}###${cfg.saltIndex}`);
}

export type PhonePeState = "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "EXPIRED";

/** Maps every PhonePe transaction/order state onto our internal payment states. */
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
    case "EXPIRED":
      return "EXPIRED";
    default:
      return "FAILED";
  }
}

/* ------------------------------------------------------------------ */
/* OAuth token (v2)                                                    */
/* ------------------------------------------------------------------ */

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(cfg: Extract<PhonePeConfig, { version: "v2" }>): Promise<string | null> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt - 60_000 > now) return tokenCache.token;

  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_version: cfg.clientVersion,
    client_secret: cfg.clientSecret,
    grant_type: "client_credentials",
  });

  try {
    const res = await fetch(`${cfg.authHost}/v1/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = (await res.json().catch(() => null)) as
      | { access_token?: string; expires_at?: number; message?: string; code?: string }
      | null;
    if (!res.ok || !json?.access_token) {
      // Never log credentials — only the safe diagnostic fields.
      console.error("phonepe auth failed", res.status, json?.code ?? json?.message ?? "unknown");
      return null;
    }
    const expiresAt = json.expires_at ? json.expires_at * 1000 : now + 10 * 60_000;
    tokenCache = { token: json.access_token, expiresAt };
    return json.access_token;
  } catch (error) {
    console.error("phonepe auth network error", (error as Error).message);
    return null;
  }
}

export type InitiateArgs = {
  merchantTransactionId: string;
  amountPaise: number;
  redirectUrl: string;
  callbackUrl: string;
  userRef: string;
  phone?: string;
  /** UPI intent app hint (legacy v1 only). */
  targetApp?: "GOOGLE_PAY" | "PHONEPE" | "PAYTM" | null;
  /** Ask PhonePe for a dynamic UPI QR (legacy v1 only). */
  qr?: boolean;
  mobileFlow: boolean;
};

export type InitiateResult =
  | { ok: true; redirectUrl: string | null; intentUrl: string | null; qrData: string | null; gatewayOrderId?: string | null }
  | { ok: false; error: string; blocked?: boolean };

/**
 * PhonePe rejects transactions when the calling server IP is not the one the
 * merchant was onboarded with. Our checkout runs on serverless workers with
 * rotating egress IPs, so detect it and fall back to the direct UPI QR.
 */
export function isMerchantBlocked(message: string | undefined | null) {
  const m = (message ?? "").toLowerCase();
  return (
    m.includes("ip address") ||
    m.includes("not whitelisted") ||
    m.includes("merchant not onboarded") ||
    m.includes("unauthorized")
  );
}

export async function initiatePayment(args: InitiateArgs, cfg: PhonePeConfig): Promise<InitiateResult> {
  return cfg.version === "v2" ? initiateV2(args, cfg) : initiateV1(args, cfg);
}

async function initiateV2(
  args: InitiateArgs,
  cfg: Extract<PhonePeConfig, { version: "v2" }>,
): Promise<InitiateResult> {
  const token = await getAccessToken(cfg);
  if (!token)
    return { ok: false, error: "The payment gateway could not be reached. Please try again in a moment." };

  const payload = {
    merchantOrderId: args.merchantTransactionId,
    amount: args.amountPaise,
    expireAfter: 1800,
    metaInfo: { udf1: args.userRef.slice(0, 36) },
    paymentFlow: {
      type: "PG_CHECKOUT",
      message: "Swastik Camphor order payment",
      merchantUrls: { redirectUrl: args.redirectUrl },
    },
  };

  let res: Response;
  try {
    res = await fetch(`${cfg.apiHost}/checkout/v2/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        Authorization: `O-Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("phonepe initiate network error", (error as Error).message);
    return { ok: false, error: "Could not reach the payment gateway. Please try again." };
  }

  const json = (await res.json().catch(() => null)) as
    | { orderId?: string; state?: string; redirectUrl?: string; message?: string; code?: string }
    | null;

  if (!res.ok || !json?.redirectUrl) {
    const message = json?.message ?? json?.code ?? `HTTP ${res.status}`;
    console.error("phonepe initiate failed", res.status, message);
    if (res.status === 401) tokenCache = null;
    if (isMerchantBlocked(message))
      return {
        ok: false,
        error:
          "The card/UPI gateway is temporarily unavailable. Please pay with the UPI QR below — we verify it automatically.",
        blocked: true,
      };
    return { ok: false, error: "The payment could not be started. Please try again." };
  }

  return {
    ok: true,
    redirectUrl: json.redirectUrl,
    intentUrl: null,
    qrData: null,
    gatewayOrderId: json.orderId ?? null,
  };
}

async function initiateV1(
  args: InitiateArgs,
  cfg: Extract<PhonePeConfig, { version: "v1" }>,
): Promise<InitiateResult> {
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
    console.error("phonepe initiate network error", (error as Error).message);
    return { ok: false, error: "Could not reach the payment gateway. Please try again." };
  }

  const json = (await res.json().catch(() => null)) as
    | { success?: boolean; message?: string; data?: Record<string, any> }
    | null;
  if (!res.ok || !json?.success) {
    console.error("phonepe initiate failed", res.status, json?.message);
    if (isMerchantBlocked(json?.message))
      return {
        ok: false,
        error:
          "The card/UPI gateway is temporarily unavailable. Please pay with the UPI QR below — we verify it automatically.",
        blocked: true,
      };
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
  return cfg.version === "v2" ? statusV2(merchantTransactionId, cfg) : statusV1(merchantTransactionId, cfg);
}

async function statusV2(
  merchantOrderId: string,
  cfg: Extract<PhonePeConfig, { version: "v2" }>,
): Promise<StatusResult | null> {
  const token = await getAccessToken(cfg);
  if (!token) return null;
  try {
    const res = await fetch(`${cfg.apiHost}/checkout/v2/order/${encodeURIComponent(merchantOrderId)}/status?details=true`, {
      method: "GET",
      headers: { accept: "application/json", Authorization: `O-Bearer ${token}` },
    });
    if (res.status === 401) tokenCache = null;
    const json = (await res.json().catch(() => null)) as
      | { orderId?: string; state?: string; amount?: number; paymentDetails?: Array<Record<string, any>> }
      | null;
    if (!json || !json.state) return null;
    const detail = (json.paymentDetails ?? []).slice(-1)[0] ?? {};
    return {
      state: mapState(json.state),
      code: String(json.state),
      transactionId: (detail["transactionId"] as string) ?? json.orderId ?? null,
      amountPaise: typeof json.amount === "number" ? json.amount : null,
      method: (detail["paymentMode"] as string) ?? null,
      raw: json as Record<string, unknown>,
    };
  } catch (error) {
    console.error("phonepe status error", (error as Error).message);
    return null;
  }
}

async function statusV1(
  merchantTransactionId: string,
  cfg: Extract<PhonePeConfig, { version: "v1" }>,
): Promise<StatusResult | null> {
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
    console.error("phonepe status error", (error as Error).message);
    return null;
  }
}
