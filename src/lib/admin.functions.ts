import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- schemas (erased at runtime boundaries are fine: plain consts are allowed) ----------
const uuid = z.string().uuid();

type SettingValue = Record<string, string | number | boolean | null>;

export const adminMe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getRoles, areasFor, isSuper } = await import("@/lib/admin-guard.server");
    const roles = await getRoles(context.supabase as never, context.userId);
    const areas = areasFor(roles);
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("full_name, phone, avatar_url, email")
      .eq("id", context.userId)
      .maybeSingle();
    return {
      userId: context.userId,
      roles,
      areas,
      isSuper: isSuper(roles),
      isStaff: areas.length > 0,
      profile: profile ?? null,
    };
  });

// ---------------------------------- dashboard ----------------------------------
export const adminDashboardStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertPerm } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "dashboard");
    const [orders, products, reviews, messages, customers] = await Promise.all([
      context.supabase.from("orders").select("id, order_number, customer_name, total, status, payment_status, created_at").order("created_at", { ascending: false }).limit(1000),
      context.supabase.from("products").select("id, name, slug, stock_quantity, low_stock_threshold, is_active, image_url").limit(500),
      context.supabase.from("product_reviews").select("id, name, product_slug, rating, comment, approved, created_at").order("created_at", { ascending: false }).limit(200),
      context.supabase.from("contact_submissions").select("id, created_at").limit(1000),
      context.supabase.from("profiles").select("id, full_name, email, created_at").order("created_at", { ascending: false }).limit(500),
    ]);
    const rows = (orders.data ?? []) as Array<{ id: string; order_number: string; customer_name: string; total: number; status: string; payment_status: string; created_at: string }>;
    const prods = (products.data ?? []) as Array<{ id: string; name: string; slug: string; stock_quantity: number; low_stock_threshold: number; is_active: boolean; image_url: string | null }>;
    const now = Date.now();
    const since = (days: number) => now - days * 86400000;
    const paidRows = rows.filter((o) => o.payment_status === "paid");
    const sum = (list: typeof rows) => list.reduce((s, o) => s + Number(o.total ?? 0), 0);
    const inRange = (from: number) => rows.filter((o) => new Date(o.created_at).getTime() >= from);

    const byDay = new Map<string, { revenue: number; orders: number }>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 86400000).toISOString().slice(0, 10);
      byDay.set(d, { revenue: 0, orders: 0 });
    }
    for (const o of rows) {
      const d = o.created_at.slice(0, 10);
      const cur = byDay.get(d);
      if (cur) {
        cur.revenue += Number(o.total ?? 0);
        cur.orders += 1;
      }
    }

    const statusCount = (s: string) => rows.filter((o) => o.status === s).length;
    return {
      totalProducts: prods.length,
      activeProducts: prods.filter((p) => p.is_active).length,
      totalOrders: rows.length,
      pendingOrders: statusCount("pending"),
      processingOrders: statusCount("processing") + statusCount("confirmed"),
      deliveredOrders: statusCount("delivered"),
      totalCustomers: (customers.data ?? []).length,
      revenuePaid: sum(paidRows),
      revenueAll: sum(rows),
      revenueToday: sum(inRange(new Date().setHours(0, 0, 0, 0))),
      revenueWeek: sum(inRange(since(7))),
      revenueMonth: sum(inRange(since(30))),
      revenueYear: sum(inRange(since(365))),
      ordersToday: inRange(new Date().setHours(0, 0, 0, 0)).length,
      awaitingPayment: rows.filter((o) => o.payment_status === "awaiting_verification").length,
      lowStock: prods.filter((p) => (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) <= (p.low_stock_threshold ?? 10)).map((p) => ({ id: p.id, name: p.name, stock: p.stock_quantity })),
      outOfStock: prods.filter((p) => (p.stock_quantity ?? 0) <= 0).map((p) => ({ id: p.id, name: p.name, stock: 0 })),
      pendingReviews: ((reviews.data ?? []) as Array<{ approved: boolean }>).filter((r) => !r.approved).length,
      totalMessages: (messages.data ?? []).length,
      recentOrders: rows.slice(0, 8),
      recentCustomers: (customers.data ?? []).slice(0, 5),
      recentReviews: (reviews.data ?? []).slice(0, 5),
      series: [...byDay.entries()].map(([date, v]) => ({ date, ...v })),
    };
  });

// ---------------------------------- products ----------------------------------
const productSchema = z.object({
  slug: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(120),
  sku: z.string().trim().max(60).nullable().default(null),
  category: z.string().trim().max(80).nullable().default(null),
  subcategory: z.string().trim().max(80).nullable().default(null),
  short_description: z.string().trim().max(300).nullable().default(null),
  description: z.string().trim().max(4000).nullable().default(null),
  price: z.number().min(0).max(1000000),
  compare_at_price: z.number().min(0).max(1000000).nullable().default(null),
  cost_price: z.number().min(0).max(1000000).nullable().default(null),
  tax_rate: z.number().min(0).max(100).default(0),
  weight_grams: z.number().min(0).max(1000000).nullable().default(null),
  stock_quantity: z.number().int().min(0).max(1000000),
  low_stock_threshold: z.number().int().min(0).max(10000).default(10),
  status: z.enum(["active", "draft", "disabled"]).default("active"),
  image_url: z.string().trim().max(500).nullable().default(null),
  images: z.array(z.string().trim().max(500)).max(20).default([]),
  gallery: z.array(z.object({ url: z.string().trim().min(1).max(500), is_primary: z.boolean().default(false) })).max(20).default([]),
  sizes: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  features: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  is_bestseller: z.boolean().default(false),
  is_new_arrival: z.boolean().default(false),
  admin_rating: z.number().min(1).max(5).nullable().default(null),
  seo_title: z.string().trim().max(150).nullable().default(null),
  seo_description: z.string().trim().max(300).nullable().default(null),
  seo_keywords: z.string().trim().max(300).nullable().default(null),
  seo_h1: z.string().trim().max(200).nullable().default(null),
  seo_subtitle: z.string().trim().max(300).nullable().default(null),
});

export const adminListProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertPerm } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "products");
    const { data, error } = await context.supabase.from("products").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminGetProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertPerm } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "products");
    const { data: row, error } = await context.supabase.from("products").select("*, product_images(image_url, display_order, is_primary)").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Product not found");
    return row;
  });

export const adminSaveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => productSchema.extend({ id: uuid.optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertPerm, logAudit } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "products");
    const { id, gallery, ...fields } = data;
    const payload = { ...fields, is_active: fields.status === "active" ? fields.is_active : false };
    const query = id
      ? context.supabase.from("products").update(payload).eq("id", id).select("id").maybeSingle()
      : context.supabase.from("products").upsert(payload, { onConflict: "slug" }).select("id").maybeSingle();
    const { data: saved, error } = await query;
    if (error) throw new Error(error.message);
    const productId = (saved?.id as string) ?? id;
    if (productId) {
      await context.supabase.from("product_images").delete().eq("product_id", productId);
      if (gallery.length) {
        const rows = gallery.map((g, index) => ({
          product_id: productId,
          image_url: g.url,
          display_order: index,
          is_primary: gallery.some((x) => x.is_primary) ? g.is_primary : index === 0,
        }));
        const { error: imgError } = await context.supabase.from("product_images").insert(rows);
        if (imgError) throw new Error(imgError.message);
      }
    }
    await logAudit({ actorId: context.userId, action: id ? "product.updated" : "product.created", entity: "product", entityId: (saved?.id as string) ?? id, details: { name: data.name, price: data.price } });
    const { notifyAdmin } = await import("@/lib/notify.server");
    await notifyAdmin({
      type: id ? "product.updated" : "product.created",
      title: `${id ? "Product updated" : "New product added"}: ${data.name}`,
      body: `Price ₹${data.price} • stock ${data.stock_quantity} • ${data.status}`,
      link: "/admin/products",
      details: { slug: data.slug, price: data.price, stock: data.stock_quantity, status: data.status },
    });
    return { ok: true as const, id: (saved?.id as string) ?? id };
  });

export const adminDuplicateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertPerm, logAudit } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "products");
    const { data: row, error } = await context.supabase.from("products").select("*, product_images(image_url, display_order, is_primary)").eq("id", data.id).maybeSingle();
    if (error || !row) throw new Error("Product not found");
    const copy = { ...(row as Record<string, unknown>) };
    delete copy["id"];
    delete copy["created_at"];
    delete copy["updated_at"];
    copy["slug"] = `${String(copy["slug"])}-copy-${Math.random().toString(36).slice(2, 6)}`;
    copy["name"] = `${String(copy["name"])} (Copy)`;
    copy["status"] = "draft";
    copy["is_active"] = false;
    const { error: insErr } = await context.supabase.from("products").insert(copy as never);
    if (insErr) throw new Error(insErr.message);
    await logAudit({ actorId: context.userId, action: "product.duplicated", entity: "product", entityId: data.id });
    return { ok: true as const };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertPerm, isSuper, getRoles, logAudit } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "products");
    const roles = await getRoles(context.supabase as never, context.userId);
    if (!isSuper(roles)) throw new Error("Only a super admin can delete products");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actorId: context.userId, action: "product.deleted", entity: "product", entityId: data.id });
    const { notifyAdmin } = await import("@/lib/notify.server");
    await notifyAdmin({ type: "product.deleted", title: "Product deleted", link: "/admin/products", details: { product_id: data.id } });
    return { ok: true as const };
  });

// ---------------------------------- inventory ----------------------------------
export const adminAdjustStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: uuid, mode: z.enum(["add", "remove", "set"]), amount: z.number().int().min(0).max(1000000), reason: z.string().trim().max(120).default("manual adjustment") }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertPerm, logAudit } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "products");
    const { data: row, error } = await context.supabase.from("products").select("id, stock_quantity").eq("id", data.id).maybeSingle();
    if (error || !row) throw new Error("Product not found");
    const current = Number((row as { stock_quantity: number }).stock_quantity ?? 0);
    const next = data.mode === "set" ? data.amount : data.mode === "add" ? current + data.amount : Math.max(0, current - data.amount);
    const { error: upErr } = await context.supabase.from("products").update({ stock_quantity: next }).eq("id", data.id);
    if (upErr) throw new Error(upErr.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("inventory_transactions").insert({ product_id: data.id, change: next - current, resulting_stock: next, reason: data.reason, actor_id: context.userId });
    await logAudit({ actorId: context.userId, action: "stock.adjusted", entity: "product", entityId: data.id, details: { from: current, to: next, reason: data.reason } });
    const { notifyAdmin } = await import("@/lib/notify.server");
    await notifyAdmin({
      type: "inventory.adjusted",
      title: `Stock updated: ${current} → ${next}`,
      body: data.reason,
      link: "/admin/inventory",
      details: { product_id: data.id, from: current, to: next },
    });
    return { ok: true as const, stock: next };
  });

export const adminStockHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ productId: uuid.optional() }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { assertPerm } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "products");
    let q = context.supabase.from("inventory_transactions").select("*").order("created_at", { ascending: false }).limit(200);
    if (data.productId) q = q.eq("product_id", data.productId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ---------------------------------- categories ----------------------------------
const categorySchema = z.object({
  id: uuid.optional(),
  slug: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).nullable().default(null),
  image_url: z.string().trim().max(500).nullable().default(null),
  sort_order: z.number().int().min(0).max(999).default(0),
  is_active: z.boolean().default(true),
});

export const adminListCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertPerm } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "products");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("categories").select("*").order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSaveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => categorySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { assertPerm, logAudit } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "products");
    const { id, ...fields } = data;
    const q = id ? context.supabase.from("categories").update(fields).eq("id", id) : context.supabase.from("categories").insert(fields);
    const { error } = await q;
    if (error) throw new Error(error.message);
    await logAudit({ actorId: context.userId, action: id ? "category.updated" : "category.created", entity: "category", entityId: id, details: { name: data.name } });
    return { ok: true as const };
  });

export const adminDeleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertPerm, logAudit } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "products");
    const { error } = await context.supabase.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actorId: context.userId, action: "category.deleted", entity: "category", entityId: data.id });
    return { ok: true as const };
  });

// ---------------------------------- orders ----------------------------------
const ORDER_STATUSES = ["pending", "confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered", "cancelled", "returned", "refunded"] as const;

export const adminListOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertPerm } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "orders");
    const { data, error } = await context.supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminGetOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertPerm } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "orders");
    const [order, events] = await Promise.all([
      context.supabase.from("orders").select("*").eq("id", data.id).maybeSingle(),
      context.supabase.from("order_events").select("*").eq("order_id", data.id).order("created_at", { ascending: true }),
    ]);
    if (!order.data) throw new Error("Order not found");
    return { order: order.data, events: events.data ?? [] };
  });

export const adminUpdateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: uuid,
        status: z.enum(ORDER_STATUSES).optional(),
        payment_status: z.enum(["pending", "awaiting_verification", "paid", "failed", "cancelled", "refunded", "cod_pending"]).optional(),
        tracking_number: z.string().trim().max(80).nullable().optional(),
        courier: z.string().trim().max(80).nullable().optional(),
        admin_notes: z.string().trim().max(1000).nullable().optional(),
        expected_delivery: z.string().trim().max(40).nullable().optional(),
        delivery_note: z.string().trim().max(300).nullable().optional(),
        note: z.string().trim().max(300).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertPerm, logAudit } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "orders");
    const { id, note, ...fields } = data;

    // Verifying a manual UPI transfer must run the same settlement as a gateway
    // confirmation: stock, confirmation emails and order events — exactly once.
    if (data.payment_status === "paid") {
      const { data: target } = await context.supabase
        .from("orders")
        .select("order_number, payment_id, payment_provider")
        .eq("id", id)
        .maybeSingle();
      const t = (target ?? {}) as { order_number?: string; payment_id?: string | null; payment_provider?: string | null };
      if (t.order_number) {
        const { settleOrderPaid } = await import("@/lib/payments.server");
        await settleOrderPaid(t.order_number, {
          transactionId: t.payment_id ?? null,
          provider: t.payment_provider ?? "upi_manual",
        });
      }
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const [k, v] of Object.entries(fields)) if (v !== undefined) patch[k] = v;
    const { error } = await context.supabase.from("orders").update(patch as never).eq("id", id);
    if (error) throw new Error(error.message);

    if (data.status || data.payment_status) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("order_events").insert({
        order_id: id,
        status: data.status ?? `payment: ${data.payment_status}`,
        note: note ?? null,
        actor_id: context.userId,
      });
    }
    await logAudit({ actorId: context.userId, action: "order.updated", entity: "order", entityId: id, details: patch });
    const { data: order } = await context.supabase.from("orders").select("order_number, customer_name, email, total, status, payment_status").eq("id", id).maybeSingle();
    const o = (order ?? {}) as { order_number?: string; customer_name?: string; email?: string; total?: number; status?: string; payment_status?: string };
    const { notifyAdmin } = await import("@/lib/notify.server");
    await notifyAdmin({
      type: data.payment_status ? "order.payment_updated" : "order.status_changed",
      title: `Order ${o.order_number ?? id} → ${data.status ?? data.payment_status ?? "updated"}`,
      body: note ?? "",
      link: "/admin/orders",
      details: {
        order_id: o.order_number ?? id,
        customer: o.customer_name ?? "",
        email: o.email ?? "",
        total: o.total ?? "",
        status: o.status ?? "",
        payment_status: o.payment_status ?? "",
        tracking: data.tracking_number ?? "",
      },
    });

    // Keep the customer in the loop whenever the fulfilment status changes.
    if (data.status && o.email) {
      const labels: Record<string, string> = {
        pending: "Received",
        confirmed: "Confirmed",
        processing: "Being packed",
        packed: "Packed",
        shipped: "Shipped",
        out_for_delivery: "Out for delivery",
        delivered: "Delivered",
        cancelled: "Cancelled",
        returned: "Returned",
        refunded: "Refunded",
      };
      try {
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        await sendTemplateEmail("order-status-update", o.email, {
          templateData: {
          orderNumber: o.order_number ?? "",
          customerName: o.customer_name ?? "Customer",
          status: data.status,
          statusLabel: labels[data.status] ?? data.status,
          note: note ?? data.delivery_note ?? "",
          courier: data.courier ?? "",
          trackingNumber: data.tracking_number ?? "",
          expectedDelivery: data.expected_delivery ?? "",
          trackUrl: "https://swastikcamphor.in/track-order",
          },
        });
      } catch (err) {
        console.error("order status email failed", err);
      }
    }
    return { ok: true as const };
  });

// kept for backwards compatibility
export const adminUpdateOrderStatus = adminUpdateOrder;
export const adminUpdatePaymentStatus = adminUpdateOrder;

// ---------------------------------- customers ----------------------------------
export const adminListCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertPerm } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "customers");
    const [profiles, orders] = await Promise.all([
      context.supabase.from("profiles").select("id, full_name, email, phone, is_disabled, created_at").order("created_at", { ascending: false }).limit(500),
      context.supabase.from("orders").select("user_id, email, total, created_at").limit(2000),
    ]);
    const rows = (orders.data ?? []) as Array<{ user_id: string | null; email: string; total: number; created_at: string }>;
    return ((profiles.data ?? []) as Array<{ id: string; email: string | null }>).map((p) => {
      const mine = rows.filter((o) => o.user_id === p.id || (p.email && o.email === p.email));
      return {
        ...p,
        orderCount: mine.length,
        totalSpent: mine.reduce((s, o) => s + Number(o.total ?? 0), 0),
        lastOrder: mine.map((o) => o.created_at).sort().at(-1) ?? null,
      };
    });
  });

export const adminGetCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertPerm } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "customers");
    const { data: profile } = await context.supabase.from("profiles").select("*").eq("id", data.id).maybeSingle();
    if (!profile) throw new Error("Customer not found");
    const { data: orders } = await context.supabase.from("orders").select("*").eq("user_id", data.id).order("created_at", { ascending: false });
    return { profile, orders: orders ?? [] };
  });

export const adminSetCustomerDisabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid, disabled: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertPerm, isSuper, getRoles, logAudit } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "customers");
    const roles = await getRoles(context.supabase as never, context.userId);
    if (!isSuper(roles)) throw new Error("Only a super admin can change account status");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({ is_disabled: data.disabled }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.auth.admin.updateUserById(data.id, { ban_duration: data.disabled ? "876000h" : "none" });
    await logAudit({ actorId: context.userId, action: data.disabled ? "customer.disabled" : "customer.enabled", entity: "customer", entityId: data.id });
    return { ok: true as const };
  });

// ---------------------------------- coupons ----------------------------------
const couponSchema = z.object({
  id: uuid.optional(),
  code: z.string().trim().min(3).max(30).transform((s) => s.toUpperCase()),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.number().min(0).max(100000),
  min_order_amount: z.number().min(0).max(1000000).default(0),
  max_discount: z.number().min(0).max(1000000).nullable().default(null),
  starts_at: z.string().nullable().default(null),
  expires_at: z.string().nullable().default(null),
  usage_limit: z.number().int().min(0).max(1000000).nullable().default(null),
  per_customer_limit: z.number().int().min(0).max(1000).nullable().default(null),
  is_active: z.boolean().default(true),
});

export const adminListCoupons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertPerm } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "marketing");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("coupons").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSaveCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => couponSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { assertPerm, logAudit } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "marketing");
    const { id, ...fields } = data;
    const q = id ? context.supabase.from("coupons").update(fields).eq("id", id) : context.supabase.from("coupons").insert(fields);
    const { error } = await q;
    if (error) throw new Error(error.message);
    await logAudit({ actorId: context.userId, action: id ? "coupon.updated" : "coupon.created", entity: "coupon", entityId: id, details: { code: data.code } });
    return { ok: true as const };
  });

export const adminDeleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertPerm, logAudit } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "marketing");
    const { error } = await context.supabase.from("coupons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actorId: context.userId, action: "coupon.deleted", entity: "coupon", entityId: data.id });
    return { ok: true as const };
  });

// ---------------------------------- banners ----------------------------------
const bannerSchema = z.object({
  id: uuid.optional(),
  title: z.string().trim().min(2).max(120),
  subtitle: z.string().trim().max(200).nullable().default(null),
  image_url: z.string().trim().max(500).nullable().default(null),
  button_text: z.string().trim().max(40).nullable().default(null),
  link_url: z.string().trim().max(300).nullable().default(null),
  placement: z.enum(["hero", "promo"]).default("hero"),
  sort_order: z.number().int().min(0).max(999).default(0),
  starts_at: z.string().nullable().default(null),
  ends_at: z.string().nullable().default(null),
  is_active: z.boolean().default(true),
});

export const adminListBanners = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertPerm } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "marketing");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("banners").select("*").order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSaveBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => bannerSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { assertPerm, logAudit } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "marketing");
    const { id, ...fields } = data;
    const q = id ? context.supabase.from("banners").update(fields).eq("id", id) : context.supabase.from("banners").insert(fields);
    const { error } = await q;
    if (error) throw new Error(error.message);
    await logAudit({ actorId: context.userId, action: id ? "banner.updated" : "banner.created", entity: "banner", entityId: id });
    return { ok: true as const };
  });

export const adminDeleteBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertPerm, logAudit } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "marketing");
    const { error } = await context.supabase.from("banners").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actorId: context.userId, action: "banner.deleted", entity: "banner", entityId: data.id });
    return { ok: true as const };
  });

// ---------------------------------- reviews ----------------------------------
export const adminListReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertPerm } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "reviews");
    const { data, error } = await context.supabase
      .from("product_reviews")
      .select("id, product_slug, name, rating, comment, approved, created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSetReviewApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid, approved: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertPerm, logAudit } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "reviews");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("product_reviews").update({ approved: data.approved }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actorId: context.userId, action: data.approved ? "review.approved" : "review.hidden", entity: "review", entityId: data.id });
    return { ok: true as const };
  });

export const adminDeleteReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertPerm, logAudit } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "reviews");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("product_reviews").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actorId: context.userId, action: "review.deleted", entity: "review", entityId: data.id });
    return { ok: true as const };
  });

// ---------------------------------- messages ----------------------------------
export const adminListContacts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertPerm } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "customers");
    const { data, error } = await context.supabase
      .from("contact_submissions")
      .select("id, name, email, phone, subject, message, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------------------------------- settings ----------------------------------
export const adminGetSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertPerm } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "dashboard");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("store_settings").select("*");
    if (error) throw new Error(error.message);
    const out: Record<string, SettingValue> = {};
    for (const row of (data ?? []) as Array<{ key: string; value: SettingValue }>) out[row.key] = row.value;
    return out;
  });

export const adminSaveSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ key: z.string().trim().min(2).max(40), value: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])) }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertPerm, logAudit } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "settings");
    const { error } = await context.supabase.from("store_settings").upsert({ key: data.key, value: data.value as never, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    await logAudit({ actorId: context.userId, action: "settings.updated", entity: "settings", entityId: data.key, details: data.value as Record<string, unknown> });
    return { ok: true as const };
  });

// ---------------------------------- profile ----------------------------------
export const adminSaveProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ full_name: z.string().trim().min(2).max(100), phone: z.string().trim().max(20).nullable().default(null), avatar_url: z.string().trim().max(500).nullable().default(null) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertPerm } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "dashboard");
    const { error } = await context.supabase.from("profiles").update(data).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---------------------------------- staff / roles ----------------------------------
export const adminListStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertPerm } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "admins");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("id, user_id, role, created_at")
      .in("role", ["admin", "super_admin", "product_manager", "order_manager", "support_staff"]);
    if (error) throw new Error(error.message);
    const ids = [...new Set(((data ?? []) as Array<{ user_id: string }>).map((r) => r.user_id))];
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, full_name, email").in("id", ids)
      : { data: [] as Array<{ id: string; full_name: string | null; email: string | null }> };
    const map = new Map((profiles ?? []).map((p) => [p.id, p]));
    return ((data ?? []) as Array<{ id: string; user_id: string; role: string; created_at: string }>).map((r) => ({
      ...r,
      full_name: map.get(r.user_id)?.full_name ?? null,
      email: map.get(r.user_id)?.email ?? null,
    }));
  });

export const adminGrantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ email: z.string().trim().email().max(255), role: z.enum(["super_admin", "product_manager", "order_manager", "support_staff"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertPerm, logAudit } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "admins");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin.from("profiles").select("id").eq("email", data.email).maybeSingle();
    if (!profile) throw new Error("No account found with that email. Ask them to sign up first.");
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: profile.id, role: data.role });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    await logAudit({ actorId: context.userId, action: "role.granted", entity: "user", entityId: profile.id, details: { email: data.email, role: data.role } });
    return { ok: true as const };
  });

export const adminRevokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertPerm, logAudit } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "admins");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("user_roles").select("user_id, role").eq("id", data.id).maybeSingle();
    if (row && row.user_id === context.userId) throw new Error("You cannot remove your own access");
    const { error } = await supabaseAdmin.from("user_roles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actorId: context.userId, action: "role.revoked", entity: "user", entityId: row?.user_id, details: { role: row?.role } });
    return { ok: true as const };
  });

// ---------------------------------- notifications & audit ----------------------------------
export const adminListNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertPerm } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "dashboard");
    const { data, error } = await context.supabase.from("admin_notifications").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminMarkNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid.optional(), all: z.boolean().default(false) }).parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { assertPerm } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "dashboard");
    let q = context.supabase.from("admin_notifications").update({ is_read: true });
    q = data.all ? q.eq("is_read", false) : q.eq("id", data.id ?? "");
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminListAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertPerm } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "admins");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    const ids = [...new Set(((data ?? []) as Array<{ actor_id: string | null }>).map((r) => r.actor_id).filter(Boolean) as string[])];
    const { data: profiles } = ids.length ? await supabaseAdmin.from("profiles").select("id, email, full_name").in("id", ids) : { data: [] as Array<{ id: string; email: string | null; full_name: string | null }> };
    const map = new Map((profiles ?? []).map((p) => [p.id, p]));
    return ((data ?? []) as Array<{ actor_id: string | null }>).map((r) => ({ ...r, actor_email: (r.actor_id && map.get(r.actor_id)?.email) || "system" }));
  });

// ---------------------------------- product image uploads ----------------------------------
export const adminUploadProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        filename: z.string().trim().min(1).max(160),
        contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
        data: z.string().min(16).max(9_000_000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { getRoles, areasFor } = await import("@/lib/admin-guard.server");
    const roles = await getRoles(context.supabase as never, context.userId);
    if (areasFor(roles).length === 0) throw new Error("Forbidden");
    const bytes = Buffer.from(data.data, "base64");
    if (bytes.byteLength > 6_000_000) throw new Error("Image is too large (max 6 MB)");
    const ext = data.contentType === "image/png" ? "png" : data.contentType === "image/jpeg" ? "jpg" : "webp";
    const safe = data.filename.toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "image";
    const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}.${ext}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage
      .from("product-images")
      .upload(path, bytes, { contentType: data.contentType, cacheControl: "31536000", upsert: false });
    if (error) throw new Error(error.message);
    return { url: `/api/public/product-image/${path}` };
  });

// ---------------------------------- contact messages ----------------------------------
export const adminListMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertPerm } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "customers");
    const { data, error } = await context.supabase
      .from("contact_submissions")
      .select("id, name, email, phone, subject, message, status, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSetMessageStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: uuid, status: z.enum(["new", "read", "replied", "resolved"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertPerm, logAudit } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "customers");
    const { error } = await context.supabase
      .from("contact_submissions")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actorId: context.userId, action: "message.status_changed", entity: "contact", entityId: data.id, details: { status: data.status } });
    return { ok: true as const };
  });

export const adminDeleteMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertPerm, getRoles, isSuper, logAudit } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "customers");
    const roles = await getRoles(context.supabase as never, context.userId);
    if (!isSuper(roles)) throw new Error("Only a super admin can delete messages");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("contact_submissions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actorId: context.userId, action: "message.deleted", entity: "contact", entityId: data.id });
    return { ok: true as const };
  });

// ---------------------------------- blogs ----------------------------------
const blogSchema = z.object({
  slug: z.string().trim().min(2).max(120),
  title: z.string().trim().min(2).max(200),
  excerpt: z.string().trim().max(500).nullable().default(null),
  content: z.string().trim().max(60000).default(""),
  cover_image: z.string().trim().max(500).nullable().default(null),
  cover_alt: z.string().trim().max(200).nullable().default(null),
  category: z.string().trim().max(80).nullable().default(null),
  tags: z.array(z.string().trim().min(1).max(40)).max(15).default([]),
  status: z.enum(["draft", "published"]).default("draft"),
  seo_title: z.string().trim().max(200).nullable().default(null),
  seo_description: z.string().trim().max(400).nullable().default(null),
  seo_keywords: z.string().trim().max(400).nullable().default(null),
  related_links: z.array(z.string().trim().min(1).max(200)).max(12).default([]),
  read_time: z.string().trim().max(30).nullable().default(null),
});

export const adminListBlogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertPerm } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "marketing");
    const { data, error } = await context.supabase
      .from("blogs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminGetBlog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertPerm } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "marketing");
    const { data: row, error } = await context.supabase.from("blogs").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Blog not found");
    return row;
  });

export const adminSaveBlog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => blogSchema.extend({ id: uuid.optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertPerm, logAudit } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "marketing");
    const { id, ...fields } = data;
    const payload = {
      ...fields,
      published_at: fields.status === "published" ? new Date().toISOString() : null,
    };
    const query = id
      ? context.supabase.from("blogs").update(payload).eq("id", id).select("id, slug").maybeSingle()
      : context.supabase.from("blogs").upsert(payload, { onConflict: "slug" }).select("id, slug").maybeSingle();
    const { data: saved, error } = await query;
    if (error) throw new Error(error.message);
    await logAudit({ actorId: context.userId, action: id ? "blog.updated" : "blog.created", entity: "blog", entityId: (saved?.id as string) ?? id, details: { title: data.title, status: data.status } });
    const { notifyAdmin } = await import("@/lib/notify.server");
    await notifyAdmin({
      type: id ? "blog.updated" : "blog.created",
      title: `Blog ${data.status === "published" ? "published" : "saved as draft"}: ${data.title}`,
      body: data.excerpt ?? "",
      link: "/admin/blogs",
      details: { slug: data.slug, status: data.status },
    });
    return { ok: true as const, id: (saved?.id as string) ?? id };
  });

export const adminDeleteBlog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertPerm, logAudit } = await import("@/lib/admin-guard.server");
    await assertPerm(context.supabase as never, context.userId, "marketing");
    const { error } = await context.supabase.from("blogs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actorId: context.userId, action: "blog.deleted", entity: "blog", entityId: data.id });
    const { notifyAdmin } = await import("@/lib/notify.server");
    await notifyAdmin({ type: "blog.deleted", title: "Blog deleted", link: "/admin/blogs", details: { blog_id: data.id } });
    return { ok: true as const };
  });
