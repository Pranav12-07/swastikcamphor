import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

export type AdminPaymentRow = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  email: string;
  phone: string;
  createdAt: string;
  paidAt: string | null;
  total: number;
  orderStatus: string;
  paymentStatus: string;
  method: string;
  gateway: string | null;
  reference: string | null;
  gatewayOrderId: string | null;
  paymentCreatedAt: string | null;
  verifiedAt: string | null;
  failureReason: string | null;
  duplicateReference: boolean;
};

export type AdminPaymentSummary = {
  collectedToday: number;
  collected7d: number;
  collected30d: number;
  collectedAll: number;
  awaitingCount: number;
  awaitingValue: number;
  codCount: number;
  codValue: number;
  refundedValue: number;
  failedCount: number;
  methodSplit: Array<{ method: string; count: number; value: number }>;
};

/** Payment ledger: every order joined with its latest payment attempt. */
export const adminListPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ rows: AdminPaymentRow[]; summary: AdminPaymentSummary }> => {
    const { assertPerm } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "orders");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: orders }, { data: payments }] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select(
          "id, order_number, customer_name, email, phone, created_at, paid_at, total, status, payment_status, payment_method, payment_provider, payment_id",
        )
        .order("created_at", { ascending: false })
        .limit(1000),
      supabaseAdmin
        .from("payments")
        .select("order_id, method, gateway, gateway_order_id, transaction_id, status, verified_at, failure_reason, created_at")
        .order("created_at", { ascending: false })
        .limit(3000),
    ]);

    const latest = new Map<string, NonNullable<typeof payments>[number]>();
    for (const p of payments ?? []) if (!latest.has(p.order_id)) latest.set(p.order_id, p);

    // A UPI reference must only ever settle one order — flag re-use for the admin.
    const refCount = new Map<string, number>();
    for (const o of orders ?? []) {
      const ref = (o.payment_id ?? latest.get(o.id)?.transaction_id ?? "").trim().toUpperCase();
      if (ref) refCount.set(ref, (refCount.get(ref) ?? 0) + 1);
    }

    const rows: AdminPaymentRow[] = (orders ?? []).map((o) => {
      const p = latest.get(o.id);
      const reference = (o.payment_id ?? p?.transaction_id ?? null) || null;
      return {
        orderId: o.id,
        orderNumber: o.order_number,
        customerName: o.customer_name,
        email: o.email,
        phone: o.phone,
        createdAt: o.created_at,
        paidAt: o.paid_at ?? null,
        total: Number(o.total ?? 0),
        orderStatus: o.status,
        paymentStatus: o.payment_status,
        method: (o.payment_method ?? p?.method ?? "upi").toString(),
        gateway: (o.payment_provider ?? p?.gateway ?? null) as string | null,
        reference,
        gatewayOrderId: p?.gateway_order_id ?? null,
        paymentCreatedAt: p?.created_at ?? null,
        verifiedAt: p?.verified_at ?? null,
        failureReason: p?.failure_reason ?? null,
        duplicateReference: Boolean(reference && (refCount.get(reference.trim().toUpperCase()) ?? 0) > 1),
      };
    });

    const now = Date.now();
    const since = (days: number) => now - days * 86400000;
    const paidRows = rows.filter((r) => r.paymentStatus === "paid");
    const paidAt = (r: AdminPaymentRow) => new Date(r.paidAt ?? r.createdAt).getTime();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const sum = (list: AdminPaymentRow[]) => list.reduce((s, r) => s + r.total, 0);
    const awaiting = rows.filter((r) => r.paymentStatus === "awaiting_verification");
    const cod = rows.filter((r) => r.paymentStatus === "cod_pending");

    const methods = new Map<string, { count: number; value: number }>();
    for (const r of paidRows) {
      const key = (r.method || "upi").toLowerCase();
      const cur = methods.get(key) ?? { count: 0, value: 0 };
      methods.set(key, { count: cur.count + 1, value: cur.value + r.total });
    }

    return {
      rows,
      summary: {
        collectedToday: sum(paidRows.filter((r) => paidAt(r) >= startOfToday.getTime())),
        collected7d: sum(paidRows.filter((r) => paidAt(r) >= since(7))),
        collected30d: sum(paidRows.filter((r) => paidAt(r) >= since(30))),
        collectedAll: sum(paidRows),
        awaitingCount: awaiting.length,
        awaitingValue: sum(awaiting),
        codCount: cod.length,
        codValue: sum(cod),
        refundedValue: sum(rows.filter((r) => r.paymentStatus.includes("refund"))),
        failedCount: rows.filter((r) => ["failed", "cancelled", "expired"].includes(r.paymentStatus)).length,
        methodSplit: [...methods.entries()]
          .map(([method, v]) => ({ method, ...v }))
          .sort((a, b) => b.value - a.value),
      },
    };
  });

const actionSchema = z.object({
  orderId: uuid,
  action: z.enum(["approve", "reject", "refund", "mark_cod_collected"]),
  reference: z.string().trim().max(60).optional(),
  reason: z.string().trim().max(300).optional(),
  amount: z.number().nonnegative().optional(),
});

/**
 * Single entry point for every manual payment decision an admin can make.
 * Approvals and refunds run the shared settlement routines so stock, emails
 * and order events stay consistent with gateway-driven transitions.
 */
export const adminResolvePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => actionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { assertPerm, logAudit } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "orders");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const siteUrl = new URL(getRequest().url).origin;

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, payment_id, payment_provider, payment_status, total")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) return { ok: false as const, error: "Order not found." };

    const {
      settleOrderPaid,
      settleOrderRefunded,
      rejectManualPayment,
    } = await import("@/lib/payments.server");

    if (data.action === "approve" || data.action === "mark_cod_collected") {
      const reference = (data.reference ?? order.payment_id ?? "").trim().toUpperCase() || null;

      // Guard against the same UPI reference being used to settle two orders.
      if (reference) {
        const { data: clash } = await supabaseAdmin
          .from("orders")
          .select("order_number")
          .eq("payment_id", reference)
          .eq("payment_status", "paid")
          .neq("id", order.id)
          .limit(1);
        if (clash && clash.length > 0) {
          return { ok: false as const, error: `Reference ${reference} is already settled on order ${clash[0]!.order_number}.` };
        }
        await supabaseAdmin.from("orders").update({ payment_id: reference }).eq("id", order.id);
      }

      const done = await settleOrderPaid(order.order_number, {
        transactionId: reference,
        provider: data.action === "mark_cod_collected" ? "cod" : (order.payment_provider ?? "upi_manual"),
        siteUrl,
      });
      await supabaseAdmin
        .from("payments")
        .update({ status: "paid", verified_by: context.userId, verified_at: new Date().toISOString() })
        .eq("order_id", order.id)
        .neq("status", "paid");
      await logAudit({
        actorId: context.userId,
        action: "payment.approved",
        entity: "order",
        entityId: order.id,
        details: { reference, alreadyPaid: !done },
      });
      return { ok: true as const, message: done ? "Payment verified and confirmation sent." : "This order was already paid." };
    }

    if (data.action === "reject") {
      const reason = data.reason?.trim() || "The UPI reference could not be matched to a received payment.";
      await rejectManualPayment(order.order_number, { reason, actorId: context.userId, siteUrl });
      await logAudit({ actorId: context.userId, action: "payment.rejected", entity: "order", entityId: order.id, details: { reason } });
      return { ok: true as const, message: "Payment rejected and the customer has been informed." };
    }

    if (order.payment_status !== "paid") {
      return { ok: false as const, error: "Only a paid order can be refunded." };
    }
    const amount = data.amount && data.amount > 0 ? Math.min(data.amount, Number(order.total)) : Number(order.total);
    const done = await settleOrderRefunded(order.order_number, {
      amount,
      reason: data.reason?.trim() || null,
      actorId: context.userId,
      siteUrl,
    });
    await logAudit({
      actorId: context.userId,
      action: "payment.refunded",
      entity: "order",
      entityId: order.id,
      details: { amount, reason: data.reason ?? null },
    });
    return {
      ok: true as const,
      message: done ? `Refund of ₹${amount.toLocaleString("en-IN")} recorded.` : "This order was already refunded.",
    };
  });
