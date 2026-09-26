import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { publicSupabase, PRODUCT_SELECT, mapProductRow, type PublicProduct } from "./products.server";

export type { PublicProduct };

/* ---- Genuine social-proof aggregates (server-computed, cached 1 hour) ---- */

const CACHE_MS = 60 * 60 * 1000;
let boughtCache: { at: number; data: Record<string, Record<string, number>> } | null = null;
let reviewCache: { at: number; data: Record<string, { average: number; count: number }> } | null = null;

/** Genuine "bought in the past month" counts per product + pack size (paid/delivered orders only). */
export const getBoughtCounts = createServerFn({ method: "GET" }).handler(async () => {
  if (boughtCache && Date.now() - boughtCache.at < CACHE_MS) return boughtCache.data;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: orders } = await supabaseAdmin
    .from("orders")
    .select("id,email")
    .gte("created_at", since)
    .or("payment_status.eq.paid,status.eq.delivered")
    .limit(2000);
  const ids = (orders ?? [])
    .filter((o) => !String(o.email ?? "").toLowerCase().endsWith("@example.com"))
    .map((o) => o.id as string);
  const counts: Record<string, Record<string, number>> = {};
  if (ids.length) {
    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("product_slug,size,qty")
      .in("order_id", ids)
      .limit(10000);
    for (const it of items ?? []) {
      const slug = String(it.product_slug ?? "");
      const size = String(it.size ?? "");
      if (!slug) continue;
      counts[slug] ??= {};
      counts[slug][size] = (counts[slug][size] ?? 0) + Number(it.qty ?? 0);
    }
  }
  boughtCache = { at: Date.now(), data: counts };
  return counts;
});

/** Real star ratings per product — approved customer reviews only, never manual values. */
export const getReviewStats = createServerFn({ method: "GET" }).handler(async () => {
  if (reviewCache && Date.now() - reviewCache.at < CACHE_MS) return reviewCache.data;
  const supabase = await publicSupabase();
  const { data } = await supabase
    .from("product_reviews")
    .select("product_slug,rating")
    .eq("approved", true)
    .limit(5000);
  const stats: Record<string, { average: number; count: number }> = {};
  const sums: Record<string, { sum: number; count: number }> = {};
  for (const r of data ?? []) {
    const slug = String(r.product_slug ?? "");
    if (!slug) continue;
    sums[slug] ??= { sum: 0, count: 0 };
    sums[slug].sum += Number(r.rating ?? 0);
    sums[slug].count += 1;
  }
  for (const [slug, s] of Object.entries(sums)) {
    stats[slug] = { average: Math.round((s.sum / s.count) * 10) / 10, count: s.count };
  }
  reviewCache = { at: Date.now(), data: stats };
  return stats;
});

/** Public: every active product (used by the product pages and the sitemap). */
export const listPublicProducts = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = await publicSupabase();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("price", { ascending: true });
  if (error) return [] as PublicProduct[];
  return (data ?? []).map(mapProductRow);
});

/** Public: one product plus related products and approved review stats. */
export const getPublicProduct = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().trim().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const supabase = await publicSupabase();
    const { data: row } = await supabase
      .from("products")
      .select(`${PRODUCT_SELECT},product_images(image_url,display_order,is_primary)`)
      .eq("is_active", true)
      .eq("slug", data.slug)
      .maybeSingle();
    if (!row) return null;
    const product = mapProductRow(row);

    const [{ data: relatedRows }, { data: reviewRows }, { data: settingsRows }] = await Promise.all([
      supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("is_active", true)
        .neq("slug", data.slug)
        .limit(6),
      supabase
        .from("product_reviews")
        .select("rating,name,title,comment,created_at")
        .eq("product_slug", data.slug)
        .eq("approved", true)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("store_settings").select("key,value").in("key", ["shipping_flat_rate", "shipping_free_above"]),
    ]);

    const ratings = (reviewRows ?? []).map((r: { rating: number }) => Number(r.rating));
    const reviewStats =
      ratings.length > 0
        ? {
            count: ratings.length,
            average: Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10,
          }
        : null;
    const topReviews = (reviewRows ?? []).slice(0, 5) as Array<{
      rating: number;
      name: string;
      title: string | null;
      comment: string;
      created_at: string;
    }>;

    const settingNum = (key: string, fallback: number) => {
      const row = (settingsRows ?? []).find((r: { key: string }) => r.key === key);
      const v = row?.value as unknown;
      const raw = v && typeof v === "object" && "value" in (v as Record<string, unknown>) ? (v as Record<string, unknown>)["value"] : v;
      const n = Number(raw);
      return Number.isFinite(n) ? n : fallback;
    };

    const related = (relatedRows ?? [])
      .map(mapProductRow)
      .filter((p) => !product.category || p.category === product.category)
      .slice(0, 3);

    return {
      product,
      related: related.length ? related : (relatedRows ?? []).map(mapProductRow).slice(0, 3),
      reviewStats,
      topReviews,
      shipping: {
        flat: settingNum("shipping_flat_rate", 49),
        freeAbove: settingNum("shipping_free_above", 499),
      },
    };
  });
