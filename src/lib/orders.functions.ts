import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ORDER_COLUMNS =
  "id, order_number, status, payment_status, payment_provider, total, subtotal, shipping, discount, steal_deal_discount, tax, items, customer_name, email, phone, address, city, state, pincode, tracking_number, courier, expected_delivery, delivery_note, created_at, updated_at";

export type TrackedOrder = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_provider: string | null;
  total: number;
  subtotal: number;
  shipping: number;
  discount: number;
  steal_deal_discount: number | null;
  tax: number;
  items: Array<{ name?: string; size?: string; qty?: number; quantity?: number; price?: number }>;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  tracking_number: string | null;
  courier: string | null;
  expected_delivery: string | null;
  delivery_note: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderEvent = { id: string; status: string; note: string | null; created_at: string };

/** Orders belonging to the signed-in customer. */
export const getMyOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as TrackedOrder[];
  });

/** A single order + its timeline — RLS restricts this to the owner. */
export const getMyOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ orderNumber: z.string().trim().min(3).max(40) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("order_number", data.orderNumber)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found");
    const { data: events } = await context.supabase
      .from("order_events")
      .select("id, status, note, created_at")
      .eq("order_id", (order as { id: string }).id)
      .order("created_at", { ascending: true });
    return { order: order as unknown as TrackedOrder, events: (events ?? []) as OrderEvent[] };
  });

/** Guest tracking: order number + the email used on the order must both match. */
export const trackOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        orderNumber: z.string().trim().min(3).max(40),
        email: z.string().trim().email().max(255),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("order_number", data.orderNumber.toUpperCase())
      .ilike("email", data.email)
      .maybeSingle();
    if (!order) throw new Error("We could not find an order with those details.");
    const { data: events } = await supabaseAdmin
      .from("order_events")
      .select("id, status, note, created_at")
      .eq("order_id", (order as { id: string }).id)
      .order("created_at", { ascending: true });
    return { order: order as unknown as TrackedOrder, events: (events ?? []) as OrderEvent[] };
  });

/**
 * A fresh signed download link for the customer's hosted PDF invoice.
 * Only the owner of a paid order can request it; the PDF is regenerated
 * on demand if it is missing from storage.
 */
export const getMyReceiptUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ orderNumber: z.string().trim().min(3).max(40) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("order_number", data.orderNumber)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found");
    const o = order as unknown as TrackedOrder;
    if (o.payment_status !== "paid") throw new Error("Invoice is available once the payment is confirmed.");

    const { storeReceiptPdf } = await import("@/lib/receipt.server");
    const url = await storeReceiptPdf({
      orderNumber: o.order_number,
      paymentStatus: o.payment_status,
      paymentMethod: o.payment_provider === "cod" ? "Cash on delivery" : "UPI",
      paymentReference: null,
      customerName: o.customer_name,
      email: o.email,
      phone: o.phone,
      address: `${o.address}, ${o.city}, ${o.state} ${o.pincode}`,
      items: (o.items ?? []).map((i) => ({
        name: i.name ?? "Item",
        size: i.size ?? "",
        qty: Number(i.qty ?? i.quantity ?? 1),
        price: Number(i.price ?? 0),
      })),
      subtotal: Number(o.subtotal),
      shipping: Number(o.shipping),
      discount: Number(o.discount),
      tax: Number(o.tax),
      total: Number(o.total),
    });
    if (!url) throw new Error("Could not prepare the invoice right now.");
    return { url };
  });
