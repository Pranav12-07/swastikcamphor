import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { publicSupabase, PRODUCT_SELECT, mapProductRow, type PublicProduct } from "./products.server";

export type { PublicProduct };

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
      .select(PRODUCT_SELECT)
      .eq("is_active", true)
      .eq("slug", data.slug)
      .maybeSingle();
    if (!row) return null;
    const product = mapProductRow(row);

    const [{ data: relatedRows }, { data: reviewRows }] = await Promise.all([
      supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("is_active", true)
        .neq("slug", data.slug)
        .limit(6),
      supabase.from("product_reviews").select("rating").eq("product_slug", data.slug).eq("approved", true),
    ]);

    const ratings = (reviewRows ?? []).map((r: { rating: number }) => Number(r.rating));
    const reviewStats =
      ratings.length > 0
        ? {
            count: ratings.length,
            average: Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10,
          }
        : null;

    const related = (relatedRows ?? [])
      .map(mapProductRow)
      .filter((p) => !product.category || p.category === product.category)
      .slice(0, 3);

    return {
      product,
      related: related.length ? related : (relatedRows ?? []).map(mapProductRow).slice(0, 3),
      reviewStats,
    };
  });
