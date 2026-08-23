import { createFileRoute } from "@tanstack/react-router";

/**
 * PhonePe server-to-server webhook.
 *
 * v2 (Standard Checkout): the `Authorization` header carries
 * SHA256(username:password) configured on the PhonePe dashboard.
 * v1 (legacy): X-VERIFY checksum over the base64 body.
 *
 * In both cases the body is only used to learn WHICH order changed — the
 * payment itself is always re-confirmed with PhonePe's Order Status API
 * before an order can become PAID.
 */
export const Route = createFileRoute("/api/public/phonepe/callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getPhonePeConfig, verifyCallbackChecksum, verifyWebhookAuth, checkStatus } = await import(
          "@/lib/phonepe.server"
        );
        const cfg = getPhonePeConfig();
        if (!cfg) return new Response("not configured", { status: 503 });

        const rawBody = await request.text();
        let merchantTransactionId: string | undefined;

        if (cfg.version === "v2") {
          const authOk = verifyWebhookAuth(request.headers.get("authorization"));
          if (authOk === false) return new Response("invalid signature", { status: 401 });
          try {
            const body = JSON.parse(rawBody) as { payload?: Record<string, any> };
            merchantTransactionId = body.payload?.["merchantOrderId"] as string | undefined;
          } catch {
            return new Response("bad request", { status: 400 });
          }
        } else {
          let base64 = "";
          try {
            base64 = String((JSON.parse(rawBody) as { response?: string }).response ?? "");
          } catch {
            return new Response("bad request", { status: 400 });
          }
          if (!base64) return new Response("bad request", { status: 400 });
          if (!verifyCallbackChecksum(request.headers.get("x-verify"), base64, cfg)) {
            return new Response("invalid signature", { status: 401 });
          }
          try {
            const decoded = JSON.parse(Buffer.from(base64, "base64").toString("utf8")) as {
              data?: Record<string, any>;
            };
            merchantTransactionId = decoded.data?.["merchantTransactionId"] as string | undefined;
          } catch {
            return new Response("bad payload", { status: 400 });
          }
        }

        if (!merchantTransactionId) return new Response("missing transaction", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: payment } = await supabaseAdmin
          .from("payments")
          .select("id, order_id, amount, status")
          .eq("gateway_order_id", merchantTransactionId)
          .maybeSingle();
        if (!payment) return new Response("unknown transaction", { status: 404 });
        // Duplicate webhook for a settled payment: acknowledge and stop.
        if (payment.status === "paid") return new Response("ok");

        // Never trust the webhook body — ask PhonePe directly.
        const status = await checkStatus(merchantTransactionId, cfg);
        if (!status) return new Response("status unavailable", { status: 502 });

        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("order_number, total")
          .eq("id", payment.order_id)
          .maybeSingle();
        if (!order) return new Response("unknown order", { status: 404 });

        const expectedPaise = Math.round(Number(order.total) * 100);
        const amountOk = status.amountPaise == null || status.amountPaise === expectedPaise;

        await supabaseAdmin
          .from("payments")
          .update({
            status: amountOk ? status.state.toLowerCase() : "awaiting_verification",
            transaction_id: status.transactionId,
            webhook_status: status.code,
            raw: status.raw as never,
          })
          .eq("id", payment.id);

        const origin = new URL(request.url).origin;
        if (status.state === "PAID" && amountOk) {
          const { settleOrderPaid } = await import("@/lib/payments.server");
          await settleOrderPaid(order.order_number, { transactionId: status.transactionId, siteUrl: origin });
        } else if (status.state === "PAID" && !amountOk) {
          console.error("phonepe webhook amount mismatch", order.order_number, status.amountPaise, expectedPaise);
        } else if (status.state !== "PENDING" && status.state !== "PAID") {
          const { settleOrderUnpaid } = await import("@/lib/payments.server");
          await settleOrderUnpaid(order.order_number, status.state);
        }

        return new Response("ok");
      },
    },
  },
});
