import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const startSchema = z.object({
  orderNumber: z.string().trim().min(3).max(40),
  app: z.enum(["gpay", "phonepe", "paytm", "any", "qr"]).default("any"),
  mobile: z.boolean().default(false),
});

const statusSchema = z.object({ orderNumber: z.string().trim().min(3).max(40) });

const referenceSchema = z.object({
  orderNumber: z.string().trim().min(3).max(40),
  reference: z
    .string()
    .trim()
    .min(6, "Enter the 12-digit UPI reference / UTR number")
    .max(40)
    .regex(/^[A-Za-z0-9-]+$/, "Only letters, numbers and dashes are allowed"),
});

export type PaymentStateResponse = {
  state: "PENDING" | "AWAITING" | "PAID" | "FAILED" | "CANCELLED" | "EXPIRED" | "COD";

  orderNumber: string;
  total: number;
  paymentStatus: string;
  orderStatus: string;
  transactionId: string | null;
  paymentMethod: string;
  paymentReference: string | null;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  items: Array<{ name: string; size: string; qty: number; price: number; image: string | null }>;
  subtotal: number;
  shipping: number;
  discount: number;
  tax: number;
};

/** Creates (or reuses) a PhonePe payment for an order and returns the pay URL. */
export const startPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => startSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getPhonePeConfig, initiatePayment, checkStatus } = await import("@/lib/phonepe.server");
    const { getOrderByNumber } = await import("@/lib/payments.server");

    const cfg = getPhonePeConfig();
    if (!cfg) {
      return {
        ok: false as const,
        error:
          "Online payment is not configured yet. Please choose cash on delivery or contact us to complete your order.",
      };
    }

    const order = await getOrderByNumber(data.orderNumber);
    if (!order) return { ok: false as const, error: "We could not find that order." };
    if (order.user_id && order.user_id !== context.userId) return { ok: false as const, error: "We could not find that order." };
    if (order.payment_status === "paid") return { ok: false as const, error: "This order is already paid." };

    const origin = new URL(getRequest().url).origin;
    // Amount is always taken from the database, never from the browser.
    const amountPaise = Math.round(Number(order.total) * 100);

    // Reuse a still-pending attempt instead of creating a new charge.
    const { data: existing } = await supabaseAdmin
      .from("payments")
      .select("id, gateway_order_id, status, created_at")
      .eq("order_id", order.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.gateway_order_id) {
      const status = await checkStatus(existing.gateway_order_id, cfg);
      if (status?.state === "PAID") {
        const { settleOrderPaid } = await import("@/lib/payments.server");
        await settleOrderPaid(order.order_number, { transactionId: status.transactionId, siteUrl: origin });
        return { ok: false as const, error: "This order is already paid." };
      }
    }

    const merchantTransactionId = `SC${order.order_number}${Date.now().toString(36).toUpperCase()}`.slice(0, 34);

    const targetApp =
      data.mobile && data.app === "gpay"
        ? ("GOOGLE_PAY" as const)
        : data.mobile && data.app === "phonepe"
          ? ("PHONEPE" as const)
          : data.mobile && data.app === "paytm"
            ? ("PAYTM" as const)
            : null;

    const result = await initiatePayment(
      {
        merchantTransactionId,
        qr: data.app === "qr",
        amountPaise,
        redirectUrl: `${origin}/order-success/${order.order_number}`,
        callbackUrl: `${origin}/api/public/phonepe/callback`,
        userRef: order.user_id ?? order.order_number,
        phone: order.phone,
        targetApp,
        mobileFlow: data.mobile,
      },
      cfg,
    );
    if (!result.ok) return { ok: false as const, error: result.error };

    await supabaseAdmin.from("payments").insert({
      order_id: order.id,
      method: "upi",
      amount: Number(order.total),
      status: "pending",
      gateway: "phonepe",
      gateway_order_id: merchantTransactionId,
      currency: "INR",
    });
    await supabaseAdmin
      .from("orders")
      .update({
        payment_provider: "phonepe",
        payment_order_id: merchantTransactionId,
        payment_status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    return {
      ok: true as const,
      redirectUrl: result.redirectUrl,
      intentUrl: result.intentUrl,
      qrData: result.qrData,
      transactionRef: merchantTransactionId,
    };
  });

/** Authoritative payment state — always re-verified with PhonePe while pending. */
export const getPaymentState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => statusSchema.parse(input))
  .handler(async ({ data, context }): Promise<PaymentStateResponse> => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getPhonePeConfig, checkStatus } = await import("@/lib/phonepe.server");
    const { getOrderByNumber, settleOrderPaid, settleOrderUnpaid } = await import("@/lib/payments.server");

    const order = await getOrderByNumber(data.orderNumber);
    if (!order) throw new Error("Order not found");
    if (order.user_id && order.user_id !== context.userId) throw new Error("Order not found");
    const origin = new URL(getRequest().url).origin;

    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("gateway_order_id, transaction_id, status, method, gateway")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let paymentStatus = order.payment_status;
    let transactionId: string | null = payment?.transaction_id ?? null;

    const cfg = getPhonePeConfig();
    const pendingish = ["pending", "processing", "awaiting_verification"].includes(paymentStatus);
    // Manual UPI references are verified by a human in the admin portal, never by the gateway.
    const manual = payment?.gateway === "upi_manual";
    if (cfg && pendingish && !manual && payment?.gateway_order_id) {
      const status = await checkStatus(payment.gateway_order_id, cfg);

      if (status) {
        const expected = Math.round(Number(order.total) * 100);
        const amountOk = status.amountPaise == null || status.amountPaise === expected;
        transactionId = status.transactionId ?? transactionId;
        await supabaseAdmin
          .from("payments")
          .update({
            status: status.state.toLowerCase(),
            transaction_id: status.transactionId,
            webhook_status: status.code,
            raw: status.raw as never,
          })
          .eq("gateway_order_id", payment.gateway_order_id);

        if (status.state === "PAID" && amountOk) {
          await settleOrderPaid(order.order_number, { transactionId: status.transactionId, siteUrl: origin });
          paymentStatus = "paid";
        } else if (status.state === "PAID" && !amountOk) {
          console.error("phonepe amount mismatch", order.order_number, status.amountPaise, expected);
          paymentStatus = "awaiting_verification";
        } else if (status.state !== "PENDING" && status.state !== "PAID") {
          await settleOrderUnpaid(order.order_number, status.state);
          paymentStatus = status.state.toLowerCase();
        }
      }
    }

    const fresh = await getOrderByNumber(order.order_number);
    const finalStatus = fresh?.payment_status ?? paymentStatus;

    const { data: lines } = await supabaseAdmin
      .from("order_items")
      .select("name, size, unit_price, qty, image_url")
      .eq("order_id", order.id);

    const state: PaymentStateResponse["state"] =
      finalStatus === "paid"
        ? "PAID"
        : finalStatus === "awaiting_verification"
          ? "AWAITING"
          : finalStatus === "cod_pending"
            ? "COD"
            : finalStatus === "cancelled"
              ? "CANCELLED"
              : finalStatus === "expired"
                ? "EXPIRED"
                : finalStatus === "failed"
                  ? "FAILED"
                  : "PENDING";


    return {
      state,
      orderNumber: order.order_number,
      total: Number(order.total),
      paymentStatus: finalStatus,
      orderStatus: fresh?.status ?? order.status,
      transactionId,
      paymentMethod:
        finalStatus === "cod_pending" || fresh?.payment_status === "cod_pending"
          ? "Cash on delivery"
          : payment?.method === "upi" || !payment?.method
            ? "UPI"
            : String(payment.method).toUpperCase(),
      paymentReference: transactionId ?? payment?.gateway_order_id ?? null,
      customerName: order.customer_name,
      email: order.email,
      phone: order.phone,
      address: `${order.address}, ${order.city}, ${order.state} - ${order.pincode}`,
      subtotal: Number(order.subtotal),
      shipping: Number(order.shipping),
      discount: Number(order.discount),
      tax: Number(order.tax),
      items: (lines ?? []).map((l) => ({
        name: l.name,
        size: l.size ?? "",
        qty: l.qty,
        price: Number(l.unit_price),
        image: l.image_url ?? null,
      })),
    };
  });
