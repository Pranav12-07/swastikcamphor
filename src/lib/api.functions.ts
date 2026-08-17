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

export const submitContact = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => contactSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("contact_submissions").insert({
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      subject: data.subject,
      message: data.message,
    });
    if (error) throw new Error("We could not send your message. Please try again.");
    return { ok: true as const };
  });

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => orderSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getRequestHeader } = await import("@tanstack/react-start/server");

    // Derive ownership from the verified bearer token only — never from input.
    let userId: string | null = null;
    const authHeader = getRequestHeader("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (token && token.split(".").length === 3) {
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      userId = userData?.user?.id ?? null;
    }

    const orderNumber = `SC${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabaseAdmin.from("orders").insert({
      order_number: orderNumber,
      user_id: userId,
      customer_name: data.customer_name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      items: data.items,
      subtotal: data.subtotal,
      shipping: data.shipping,
      discount: data.discount,
      total: data.total,
      coupon_code: data.coupon_code ?? null,
    });
    if (error) throw new Error("We could not place your order. Please try again.");
    return { orderNumber };
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