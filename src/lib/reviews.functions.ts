import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Review = {
  id: string;
  product_slug: string;
  name: string;
  rating: number;
  comment: string;
  created_at: string;
};

const submitSchema = z.object({
  product_slug: z.string().trim().min(2).max(200),
  name: z.string().trim().min(2).max(60),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(5).max(1000),
});

/** Public: approved reviews for one product. */
export const listReviews = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().max(200) }).parse(input))
  .handler(async ({ data }) => {
    const { publicSupabase } = await import("@/lib/products.server");
    const supabasePublic = await publicSupabase();
    const { data: rows, error } = await supabasePublic
      .from("product_reviews")
      .select("id, product_slug, name, rating, comment, created_at")
      .eq("product_slug", data.slug)
      .eq("approved", true)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error("Could not load reviews.");
    return (rows ?? []) as Review[];
  });

/** Public: submit a review. Stays hidden until an admin approves it. */
export const submitReview = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => submitSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getRequestHeader } = await import("@tanstack/react-start/server");

    let userId: string | null = null;
    const authHeader = getRequestHeader("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (token && token.split(".").length === 3) {
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      userId = userData?.user?.id ?? null;
    }

    const { error } = await supabaseAdmin.from("product_reviews").insert({
      product_slug: data.product_slug,
      user_id: userId,
      name: data.name,
      rating: data.rating,
      comment: data.comment,
      approved: false,
    });
    if (error) throw new Error("We could not save your review. Please try again.");
    return { ok: true as const };
  });
