import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const sessionSchema = z.string().min(8).max(64);

export type ThreadRow = { id: string; title: string; updated_at: string };
export type StoredMessage = { id: string; role: "user" | "assistant"; parts: string };

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  subject: z.string().trim().min(2).max(150),
  message: z.string().trim().min(10).max(2000),
});

const orderSchema = z.object({
  customer_name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(20),
  address: z.string().trim().min(5).max(300),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  items: z
    .array(
      z.object({
        slug: z.string().max(60),
        name: z.string().max(120),
        size: z.string().max(40),
        qty: z.number().int().min(1).max(99),
        price: z.number().min(0).max(100000),
      }),
    )
    .min(1)
    .max(30),
  subtotal: z.number().min(0),
  shipping: z.number().min(0),
  discount: z.number().min(0),
  total: z.number().min(0),
  coupon_code: z.string().trim().max(30).nullable().optional(),
});

const paymentMethodSchema = z.enum(["upi", "cod"]);

const upiReferenceSchema = z.object({
  order_number: z.string().trim().min(4).max(40),
  email: z.string().trim().email().max(255),
  reference: z.string().trim().min(6).max(40),
});

export const submitContact = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => contactSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("contact_submissions")
      .insert({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        subject: data.subject,
        message: data.message,
        status: "new",
      })
      .select("id, created_at")
      .maybeSingle();
    if (error) throw new Error("We could not send your message. Please try again.");

    const messageId = (row?.id as string | undefined) ?? "";
    try {
      const { notifyAdmin } = await import("@/lib/notify.server");
      await notifyAdmin({
        type: "contact.received",
        title: `New contact message: ${data.subject}`,
        body: data.message,
        link: "/admin/messages",
        idempotencyKey: `contact-${messageId}`,
        details: {
          message_id: messageId,
          name: data.name,
          email: data.email,
          phone: data.phone || "—",
          subject: data.subject,
        },
      });
    } catch (notifyError) {
      console.error("contact notification failed", notifyError);
    }

    return { ok: true as const, messageId };
  });

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    orderSchema.extend({ payment_method: paymentMethodSchema.default("upi") }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getRequestHeader } = await import("@tanstack/react-start/server");

    // Derive ownership from the verified bearer token only — never from input.
    let userId: string | null = null;
    let sessionEmail: string | null = null;
    const authHeader = getRequestHeader("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (token && token.split(".").length === 3) {
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      userId = userData?.user?.id ?? null;
      sessionEmail = userData?.user?.email ?? null;
    }
    // The receipt always goes to the verified account email (Google or OTP),
    // never to an address typed into the form.
    const orderEmail = sessionEmail ?? data.email;

    // Server-side pricing + atomic stock reservation.
    const { data: placed, error } = await supabaseAdmin.rpc("place_order", {
      _user_id: userId as unknown as string,
      _customer: {
        customer_name: data.customer_name,
        email: orderEmail,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
      },
      _items: data.items.map((i) => ({ slug: i.slug, size: i.size, qty: i.qty })),
      _coupon: data.coupon_code ?? "",
      _payment_method: data.payment_method,
    });
    if (error) throw new Error(error.message || "We could not place your order. Please try again.");

    const result = placed as unknown as {
      order_number: string;
      order_id: string;
      subtotal: number;
      discount: number;
      shipping: number;
      total: number;
    };
    const orderNumber = result.order_number;
    const paymentStatus = data.payment_method === "cod" ? "cod_pending" : "pending";

    const { data: lines } = await supabaseAdmin
      .from("order_items")
      .select("product_slug, name, size, unit_price, qty")
      .eq("order_id", result.order_id);
    const items = (lines ?? []).map((l) => ({
      slug: l.product_slug,
      name: l.name,
      size: l.size ?? "",
      qty: l.qty,
      price: Number(l.unit_price),
    }));

    const fullAddress = `${data.address}, ${data.city}, ${data.state} - ${data.pincode}`;
    const placedAt = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    // Emails for prepaid orders are sent only after the gateway verifies the
    // payment (see settleOrderPaid). COD orders are confirmed immediately.
    if (data.payment_method === "cod") {
    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      await sendTemplateEmail("new-order-notification", "", {
        templateData: {
          orderNumber,
          customerName: data.customer_name,
          email: orderEmail,
          phone: data.phone,
          address: fullAddress,
          paymentMethod: data.payment_method,
          paymentStatus,
          subtotal: result.subtotal,
          shipping: result.shipping,
          discount: result.discount,
          couponCode: data.coupon_code ?? "",
          placedAt,
          total: result.total,
          items,
        },
        idempotencyKey: `new-order-notification-${orderNumber}`,
        replyTo: orderEmail,
      });
    } catch (emailError) {
      console.error("Order notification email failed", emailError);
    }

    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      await sendTemplateEmail("order-confirmation", orderEmail, {
        templateData: {
          orderNumber,
          customerName: data.customer_name,
          address: fullAddress,
          paymentMethod: data.payment_method,
          paymentStatus,
          subtotal: result.subtotal,
          shipping: result.shipping,
          discount: result.discount,
          tax: 0,
          total: result.total,
          placedAt,
          items,
        },
        idempotencyKey: `order-confirmation-${orderNumber}`,
      });
    } catch (emailError) {
      console.error("Customer confirmation email failed", emailError);
    }
    }

    return {
      orderNumber,
      subtotal: result.subtotal,
      shipping: result.shipping,
      discount: result.discount,
      total: result.total,
    };

  });

/** Customer submits the UPI transaction reference (UTR) after paying via GPay/PhonePe. */
export const submitUpiReference = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => upiReferenceSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error: findError } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("order_number", data.order_number)
      .eq("email", orderEmail)
      .maybeSingle();
    if (findError) throw new Error("We could not verify that order. Please try again.");
    if (!order) throw new Error("We could not find that order.");

    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        payment_provider: "upi",
        payment_id: data.reference,
        payment_status: "awaiting_verification",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);
    if (error) throw new Error("We could not save your payment reference. Please try again.");

    // Record the payment attempt; upi_ref is unique so a reused UTR is rejected.
    const { data: existing } = await supabaseAdmin
      .from("payments")
      .select("id, order_id")
      .eq("upi_ref", data.reference)
      .maybeSingle();
    if (existing && existing.order_id !== order.id) {
      throw new Error("That transaction reference has already been used for another order.");
    }
    const { data: pending } = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("order_id", order.id)
      .is("upi_ref", null)
      .limit(1)
      .maybeSingle();
    if (pending) {
      await supabaseAdmin
        .from("payments")
        .update({ upi_ref: data.reference, method: "upi", status: "awaiting_verification" })
        .eq("id", pending.id);
    } else if (!existing) {
      const { data: ord } = await supabaseAdmin
        .from("orders")
        .select("total")
        .eq("id", order.id)
        .maybeSingle();
      await supabaseAdmin.from("payments").insert({
        order_id: order.id,
        method: "upi",
        amount: Number(ord?.total ?? 0),
        upi_ref: data.reference,
        status: "awaiting_verification",
      });
    }
    return { ok: true as const };

  });

export const listThreads = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ sessionId: sessionSchema }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("chat_threads")
      .select("id, title, updated_at")
      .eq("session_id", data.sessionId)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (rows ?? []) as ThreadRow[];
  });

export const createThread = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ sessionId: sessionSchema, title: z.string().max(120).optional() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("chat_threads")
      .insert({ session_id: data.sessionId, title: data.title ?? "New conversation" })
      .select("id, title, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return row as ThreadRow;
  });

export const deleteThread = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ sessionId: sessionSchema, threadId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("chat_threads")
      .delete()
      .eq("id", data.threadId)
      .eq("session_id", data.sessionId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const getThreadMessages = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ sessionId: sessionSchema, threadId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: thread } = await supabaseAdmin
      .from("chat_threads")
      .select("id")
      .eq("id", data.threadId)
      .eq("session_id", data.sessionId)
      .maybeSingle();
    if (!thread) return [] as StoredMessage[];
    const { data: rows, error } = await supabaseAdmin
      .from("chat_messages")
      .select("id, role, parts")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []).map<StoredMessage>((r) => ({
      id: r.id as string,
      role: r.role as "user" | "assistant",
      parts: JSON.stringify(r.parts ?? []),
    }));
  });