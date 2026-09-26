import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const lineSchema = z.object({
  slug: z.string().trim().min(1).max(60),
  size: z.string().trim().max(40).default(""),
  qty: z.number().int().min(1).max(99),
});

const linesSchema = z.object({ lines: z.array(lineSchema).max(50) });

export type ServerCartLine = { slug: string; size: string; qty: number };

/** Read the signed-in customer's saved cart. */
export const getMyCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("cart_items")
      .select("product_slug, size, qty")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map<ServerCartLine>((r) => ({
      slug: r.product_slug,
      size: r.size ?? "",
      qty: r.qty,
    }));
  });

export type CouponRule = {
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number;
  max_discount: number | null;
  first_order_only: boolean;
};

/**
 * Validate a coupon for the current visitor. Public codes work for everyone;
 * private (assigned) codes only for the account they were issued to. Never
 * reveals whether a private code exists — it just says the code is not valid.
 */
export const validateCoupon = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ code: z.string().trim().min(3).max(30) }).parse(input))
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string; coupon?: CouponRule }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getRequestHeader } = await import("@tanstack/react-start/server");

    // Identify the caller when signed in (same bearer pattern as placeOrder).
    let userId: string | null = null;
    const authHeader = getRequestHeader("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (token && token.split(".").length === 3) {
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      userId = userData?.user?.id ?? null;
    }

    const { data: cpn } = await supabaseAdmin
      .from("coupons")
      .select(
        "code,discount_type,discount_value,min_order_amount,max_discount,is_active,starts_at,expires_at,usage_limit,used_count,is_public,assigned_user_id,first_order_only,per_customer_limit",
      )
      .ilike("code", data.code)
      .maybeSingle();

    const now = Date.now();
    const invalid = { ok: false as const, message: "This code is not valid" };
    if (!cpn || !cpn.is_active) return invalid;
    if (cpn.starts_at && new Date(cpn.starts_at).getTime() > now) return invalid;
    if (cpn.expires_at && new Date(cpn.expires_at).getTime() < now)
      return { ok: false, message: "This code has expired" };
    if (cpn.usage_limit !== null && cpn.used_count >= cpn.usage_limit)
      return { ok: false, message: "This code has been fully used" };

    // Private codes: only the assigned account may even see them.
    if (cpn.assigned_user_id) {
      if (!userId || cpn.assigned_user_id !== userId)
        return { ok: false, message: "This code belongs to another account" };
    } else if (!cpn.is_public) {
      return invalid;
    }

    if (userId) {
      if (cpn.first_order_only) {
        const { count } = await supabaseAdmin
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .neq("status", "cancelled");
        if ((count ?? 0) > 0) return { ok: false, message: "Valid on your first order only" };
      }
      if (cpn.per_customer_limit !== null) {
        const { count } = await supabaseAdmin
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("coupon_code", cpn.code)
          .neq("status", "cancelled");
        if ((count ?? 0) >= cpn.per_customer_limit)
          return { ok: false, message: "You have already used this code the maximum number of times" };
      }
    }

    return {
      ok: true,
      coupon: {
        code: cpn.code.toUpperCase(),
        discount_type: cpn.discount_type === "fixed" ? "fixed" : "percentage",
        discount_value: Number(cpn.discount_value),
        min_order_amount: Number(cpn.min_order_amount),
        max_discount: cpn.max_discount === null ? null : Number(cpn.max_discount),
        first_order_only: cpn.first_order_only,
      },
    };
  });

/** Replace the saved cart with the given lines (client is the source of truth after merge). */
export const syncMyCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => linesSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error: delError } = await context.supabase
      .from("cart_items")
      .delete()
      .eq("user_id", context.userId);
    if (delError) throw new Error(delError.message);
    if (data.lines.length) {
      const { error } = await context.supabase.from("cart_items").insert(
        data.lines.map((l) => ({
          user_id: context.userId,
          product_slug: l.slug,
          size: l.size,
          qty: l.qty,
        })),
      );
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });
