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
  if (order.payment_status === "paid") return false;

  // Conditional update = the idempotency lock. Concurrent callers get 0 rows.
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
  if (!updated || updated.length === 0) return false;

  const items = await orderItems(order.id);
  const fullAddress = `${order.address}, ${order.city}, ${order.state} - ${order.pincode}`;
  const placedAt = istNow();
  const base = info.siteUrl?.replace(/\/$/, "") ?? "https://swastikcamphor.lovable.app";

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

  // Customer confirmation
  if (customerClaim)
  try {
    await sendTemplateEmail("order-confirmation", order.email, {
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
        items,
      },
      idempotencyKey: `order-paid-customer-${order.order_number}`,
    });
  } catch (error) {
    console.error("customer confirmation email failed", error);
  }

  // Admin notification
  if (adminClaim)
  try {
    await sendTemplateEmail("new-order-notification", "", {
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
        adminUrl: `${base}/admin/orders`,
        items,
      },
      idempotencyKey: `order-paid-admin-${order.order_number}`,
      replyTo: order.email,
    });
  } catch (error) {
    console.error("admin order email failed", error);
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

  return true;
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
