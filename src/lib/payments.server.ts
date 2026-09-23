/**
 * Server-only order settlement.
 *
 * Every transition to PAID goes through `settleOrderPaid`, which is idempotent:
 * webhook + status-poll + redirect can all call it and only the first one wins,
 * so emails, stock and notifications never fire twice.
 */
import type { PhonePeState } from "@/lib/phonepe.server";

type OrderRow = {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  subtotal: number;
  shipping: number;
  discount: number;
  tax: number;
  total: number;
  status: string;
  payment_status: string;
  created_at: string;
};

const ORDER_FIELDS =
  "id, order_number, user_id, customer_name, email, phone, address, city, state, pincode, subtotal, shipping, discount, tax, total, status, payment_status, created_at";

export async function getOrderByNumber(orderNumber: string): Promise<OrderRow | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("orders")
    .select(ORDER_FIELDS)
    .eq("order_number", orderNumber)
    .maybeSingle();
  return (data as unknown as OrderRow) ?? null;
}

async function orderItems(orderId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("order_items")
    .select("product_slug, name, size, unit_price, qty")
    .eq("order_id", orderId);
  return (data ?? []).map((l) => ({
    slug: l.product_slug,
    name: l.name,
    size: l.size ?? "",
    qty: l.qty,
    price: Number(l.unit_price),
  }));
}

function istNow() {
  return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

/**
 * Marks an order PAID exactly once and fires the mandatory confirmation emails.
 * Returns true when this call performed the transition.
 */
export async function settleOrderPaid(
  orderNumber: string,
  info: { transactionId?: string | null; provider?: string; siteUrl?: string },
): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const order = await getOrderByNumber(orderNumber);
  if (!order) return false;
  let transitioned = false;

  if (order.payment_status !== "paid") {
    // Conditional update = the payment idempotency lock. Concurrent callers get 0 rows.
    const { data: updated } = await supabaseAdmin
      .from("orders")
      .update({
        payment_status: "paid",
        status: order.status === "pending" || order.status === "placed" ? "confirmed" : order.status,
        payment_provider: info.provider ?? "phonepe",
        payment_method: info.provider === "cod" ? "cod" : "upi",
        payment_id: info.transactionId ?? null,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .neq("payment_status", "paid")
      .select("id");
    transitioned = Boolean(updated && updated.length > 0);
  }

  const items = await orderItems(order.id);
  const fullAddress = `${order.address}, ${order.city}, ${order.state} - ${order.pincode}`;
  const placedAt = istNow();
  const base = info.siteUrl?.replace(/\/$/, "") ?? "https://swastikcamphor.lovable.app";

  if (transitioned) {
    await supabaseAdmin.from("order_events").insert({
      order_id: order.id,
      status: "confirmed",
      note: `Payment verified${info.transactionId ? ` (txn ${info.transactionId})` : ""}`,
    });

    if (order.user_id) {
      await supabaseAdmin.from("customer_notifications").insert({
        user_id: order.user_id,
        title: `Payment received for order ${order.order_number}`,
        body: `We have received your payment. Your order is confirmed and being packed.`,
        link: `/orders/${order.order_number}`,
      });
    }
  }

  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");

  // Claim the email slots atomically: only the caller that flips the flag sends.
  const claimEmail = async (column: "customer_confirmation_sent" | "admin_notification_sent") => {
    const patch =
      column === "customer_confirmation_sent"
        ? { customer_confirmation_sent: true }
        : { admin_notification_sent: true };
    const { data } = await supabaseAdmin
      .from("orders")
      .update(patch)
      .eq("id", order.id)
      .eq(column, false)
      .select("id");
    return Boolean(data && data.length > 0);
  };
  const customerClaim = await claimEmail("customer_confirmation_sent");
  const adminClaim = await claimEmail("admin_notification_sent");

  // A later status check reaches this path again after a temporary mail failure.
  // If both delivery flags are already set, there is nothing left to retry.
  if (!customerClaim && !adminClaim) return transitioned;

  // Branded PDF receipt, rendered server-side and hosted behind a signed link.
  // Always generated on settlement (even if the email was already claimed) so
  // the invoice is downloadable from the order page and can be re-sent.
  let receiptUrl = "";
  {
    const { storeReceiptPdf } = await import("@/lib/receipt.server");
    receiptUrl =
      (await storeReceiptPdf({
        orderNumber: order.order_number,
        paymentStatus: "paid",
        paymentMethod: info.provider === "cod" ? "Cash on delivery" : "UPI",
        paymentReference: info.transactionId ?? null,
        customerName: order.customer_name,
        email: order.email,
        phone: order.phone,
        address: fullAddress,
        items: items.map((it: { name?: string; size?: string; qty?: number; price?: number }) => ({
          name: it.name ?? "",
          size: it.size ?? "",
          qty: Number(it.qty ?? 0),
          price: Number(it.price ?? 0),
        })),
        subtotal: Number(order.subtotal),
        shipping: Number(order.shipping),
        discount: Number(order.discount),
        tax: Number(order.tax),
        total: Number(order.total),
      })) ?? "";
  }

  const tag = `[order-email ${order.order_number}]`;
  console.log(`${tag} PAYMENT VERIFIED (txn ${info.transactionId ?? "n/a"})`);
  console.log(`${tag} receipt PDF ${receiptUrl ? "generated" : "MISSING — pdf/link step returned empty"}`);

  const releaseClaim = async (column: "customer_confirmation_sent" | "admin_notification_sent") => {
    await supabaseAdmin
      .from("orders")
      .update(column === "customer_confirmation_sent" ? { customer_confirmation_sent: false } : { admin_notification_sent: false })
      .eq("id", order.id);
  };

  // Customer confirmation
  if (customerClaim) try {
    console.log(`${tag} CUSTOMER EMAIL TRIGGERED -> ${order.email}`);
    const result = await sendTemplateEmail("order-confirmation", order.email, {
      templateData: {
        orderNumber: order.order_number,
        customerName: order.customer_name,
        email: order.email,
        phone: order.phone,
        address: fullAddress,
        paymentMethod: info.provider === "cod" ? "cod" : "upi",
        paymentStatus: "paid",
        transactionId: info.transactionId ?? "",
        orderStatus: "ORDER CONFIRMED",
        subtotal: Number(order.subtotal),
        shipping: Number(order.shipping),
        discount: Number(order.discount),
        tax: Number(order.tax),
        total: Number(order.total),
        placedAt,
        orderUrl: `${base}/orders/${order.order_number}`,
        receiptUrl,
        items,
      },
      idempotencyKey: `order-paid-customer-${order.order_number}`,
    });
    if (result.sent) {
      console.log(`${tag} CUSTOMER EMAIL SENT`);
    } else {
      console.error(`${tag} CUSTOMER EMAIL FAILED — ${result.reason}`);
      await releaseClaim("customer_confirmation_sent");
    }
  } catch (error) {
    console.error(`${tag} CUSTOMER EMAIL FAILED`, error);
    // Release the claim so the receipt can be resent once sending works.
    await releaseClaim("customer_confirmation_sent");
  }

  // Admin notification — only ever reached after the payment is verified.
  if (adminClaim)
  if (transitioned) try {
    const { sendAdminTemplateEmail, getAdminEmails } = await import("@/lib/notify.server");
    console.log(`${tag} ADMIN EMAIL TRIGGERED -> ${(await getAdminEmails()).join(", ")}`);
    const result = await sendAdminTemplateEmail("new-order-notification", {
      templateData: {
        orderNumber: order.order_number,
        customerName: order.customer_name,
        email: order.email,
        phone: order.phone,
        address: order.address,
        city: order.city,
        state: order.state,
        pincode: order.pincode,
        paymentMethod: info.provider === "cod" ? "cod" : "upi",
        paymentStatus: "paid",
        transactionId: info.transactionId ?? "",
        placedAt,
        subtotal: Number(order.subtotal),
        shipping: Number(order.shipping),
        discount: Number(order.discount),
        tax: Number(order.tax),
        total: Number(order.total),
        adminUrl: `${base}/admin/orders/${order.id}`,
        receiptUrl,
        items,
      },
      idempotencyKey: `order-paid-admin-${order.order_number}`,
      replyTo: order.email,
    });
    if (result.sent) {
      console.log(`${tag} ADMIN EMAIL SENT`);
    } else {
      console.error(`${tag} ADMIN EMAIL FAILED — ${result.reason}`);
      await releaseClaim("admin_notification_sent");
    }
  } catch (error) {
    console.error(`${tag} ADMIN EMAIL FAILED`, error);
    // Release the claim so an admin can resend from the order view.
    await releaseClaim("admin_notification_sent");
  }

  try {
    const { notifyAdmin } = await import("@/lib/notify.server");
    await notifyAdmin({
      type: "order_paid",
      title: `Payment received — ${order.order_number}`,
      body: `${order.customer_name} paid Rs. ${Number(order.total).toLocaleString("en-IN")}`,
      link: `/admin/orders`,
      idempotencyKey: `order-paid-${order.order_number}`,
    });
  } catch (error) {
    console.error("admin notification failed", error);
  }

  return transitioned;
}

/** Failed / cancelled / expired payment: never confirm, release reserved stock once. */
export async function settleOrderUnpaid(orderNumber: string, state: Exclude<PhonePeState, "PAID" | "PENDING">) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const order = await getOrderByNumber(orderNumber);
  if (!order || order.payment_status === "paid") return;

  const paymentStatus = state === "CANCELLED" ? "cancelled" : state === "EXPIRED" ? "expired" : "failed";
  const { data: updated } = await supabaseAdmin
    .from("orders")
    .update({ payment_status: paymentStatus, status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", order.id)
    .neq("status", "cancelled")
    .neq("payment_status", "paid")
    .select("id");
  if (!updated || updated.length === 0) return;

  // Return the reserved stock exactly once.
  const items = await orderItems(order.id);
  for (const item of items) {
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("id, stock_quantity")
      .eq("slug", item.slug)
      .maybeSingle();
    if (!product) continue;
    const next = Number(product.stock_quantity ?? 0) + item.qty;
    await supabaseAdmin.from("products").update({ stock_quantity: next }).eq("id", product.id);
    await supabaseAdmin.from("inventory_transactions").insert({
      product_id: product.id,
      change: item.qty,
      resulting_stock: next,
      reason: "payment_failed_release",
      reference: order.order_number,
    });
  }

  await supabaseAdmin.from("order_events").insert({
    order_id: order.id,
    status: "cancelled",
    note: `Payment ${paymentStatus}`,
  });
}

/**
 * Admin-approved refund. Restores stock once, records the refund on the payment
 * row and tells the customer. Idempotent: a second call is a no-op.
 */
export async function settleOrderRefunded(
  orderNumber: string,
  info: { amount?: number | null; reason?: string | null; actorId?: string | null; siteUrl?: string },
): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const order = await getOrderByNumber(orderNumber);
  if (!order) return false;
  if (order.payment_status === "refunded") return false;

  const amount = info.amount != null && info.amount > 0 ? Number(info.amount) : Number(order.total);
  const partial = amount < Number(order.total);

  const { data: updated } = await supabaseAdmin
    .from("orders")
    .update({
      payment_status: partial ? "partially_refunded" : "refunded",
      status: partial ? order.status : "refunded",
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .neq("payment_status", "refunded")
    .select("id");
  if (!updated || updated.length === 0) return false;

  await supabaseAdmin
    .from("payments")
    .update({
      status: partial ? "partially_refunded" : "refunded",
      failure_reason: info.reason ?? null,
      verified_by: info.actorId ?? null,
      verified_at: new Date().toISOString(),
    })
    .eq("order_id", order.id);

  // Full refunds return the goods to stock; partial refunds do not.
  if (!partial) {
    const items = await orderItems(order.id);
    for (const item of items) {
      const { data: product } = await supabaseAdmin
        .from("products")
        .select("id, stock_quantity")
        .eq("slug", item.slug)
        .maybeSingle();
      if (!product) continue;
      const next = Number(product.stock_quantity ?? 0) + item.qty;
      await supabaseAdmin.from("products").update({ stock_quantity: next }).eq("id", product.id);
      await supabaseAdmin.from("inventory_transactions").insert({
        product_id: product.id,
        change: item.qty,
        resulting_stock: next,
        reason: "refund_release",
        reference: order.order_number,
      });
    }
  }

  await supabaseAdmin.from("order_events").insert({
    order_id: order.id,
    status: partial ? "partially_refunded" : "refunded",
    note: `Refund of Rs. ${amount.toLocaleString("en-IN")}${info.reason ? ` — ${info.reason}` : ""}`,
    actor_id: info.actorId ?? null,
  });

  if (order.user_id) {
    await supabaseAdmin.from("customer_notifications").insert({
      user_id: order.user_id,
      title: `Refund initiated for order ${order.order_number}`,
      body: `Rs. ${amount.toLocaleString("en-IN")} will reach your account in 5-7 business days.`,
      link: `/orders/${order.order_number}`,
    });
  }

  const base = info.siteUrl?.replace(/\/$/, "") ?? "https://swastikcamphor.lovable.app";
  try {
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    await sendTemplateEmail("order-status-update", order.email, {
      templateData: {
        orderNumber: order.order_number,
        customerName: order.customer_name,
        status: "refunded",
        statusLabel: partial ? "Partial refund initiated" : "Refund initiated",
        note: `We have initiated a refund of Rs. ${amount.toLocaleString("en-IN")}${info.reason ? ` (${info.reason})` : ""}. It reaches your original payment method within 5-7 business days.`,
        trackUrl: `${base}/orders/${order.order_number}`,
      },
      idempotencyKey: `order-refund-${order.order_number}`,
    });
  } catch (error) {
    console.error("refund email failed", error);
  }

  return true;
}

/** Admin rejects a manual UPI reference — the order returns to unpaid. */
export async function rejectManualPayment(
  orderNumber: string,
  info: { reason: string; actorId?: string | null; siteUrl?: string },
): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const order = await getOrderByNumber(orderNumber);
  if (!order || order.payment_status === "paid") return false;

  await supabaseAdmin
    .from("orders")
    .update({ payment_status: "pending", updated_at: new Date().toISOString() })
    .eq("id", order.id)
    .neq("payment_status", "paid");

  await supabaseAdmin
    .from("payments")
    .update({ status: "failed", failure_reason: info.reason, verified_by: info.actorId ?? null, verified_at: new Date().toISOString() })
    .eq("order_id", order.id)
    .eq("status", "awaiting_verification");

  await supabaseAdmin.from("order_events").insert({
    order_id: order.id,
    status: "payment: rejected",
    note: info.reason,
    actor_id: info.actorId ?? null,
  });

  if (order.user_id) {
    await supabaseAdmin.from("customer_notifications").insert({
      user_id: order.user_id,
      title: `We could not verify your payment for ${order.order_number}`,
      body: info.reason,
      link: `/orders/${order.order_number}`,
    });
  }

  const base = info.siteUrl?.replace(/\/$/, "") ?? "https://swastikcamphor.lovable.app";
  try {
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    await sendTemplateEmail("order-status-update", order.email, {
      templateData: {
        orderNumber: order.order_number,
        customerName: order.customer_name,
        status: "payment_failed",
        statusLabel: "Payment could not be verified",
        note: `${info.reason} Please retry the payment or share the correct UPI reference from your bank app.`,
        trackUrl: `${base}/orders/${order.order_number}`,
      },
      idempotencyKey: `order-payment-rejected-${order.order_number}-${Date.now()}`,
    });
  } catch (error) {
    console.error("payment rejection email failed", error);
  }

  return true;
}
