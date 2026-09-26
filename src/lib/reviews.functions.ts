import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Review = {
  id: string;
  product_slug: string;
  name: string;
  rating: number;
  title: string | null;
  comment: string;
  city: string | null;
  size_label: string | null;
  photos: string[];
  helpful_count: number;
  store_reply: string | null;
  created_at: string;
  verified: boolean;
  helpful_by_me: boolean;
  thank_you: boolean;
};

const submitSchema = z.object({
  product_slug: z.string().trim().min(2).max(200),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(2).max(120),
  comment: z.string().trim().min(5).max(1000),
  city: z.string().trim().max(60).optional(),
  size_label: z.string().trim().max(120).optional(),
  photos: z.array(z.string().max(500)).max(3).optional(),
});

/** Reads the bearer token and returns the signed-in user id, or null. */
async function requestUserId(): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  const authHeader = getRequestHeader("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token || token.split(".").length !== 3) return null;
  const { data: userData } = await supabaseAdmin.auth.getUser(token);
  return userData?.user?.id ?? null;
}

/** Public: approved reviews for one product, with verified-purchase flags. */
export const listReviews = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().max(200) }).parse(input))
  .handler(async ({ data }) => {
    const { publicSupabase } = await import("@/lib/products.server");
    const supabasePublic = await publicSupabase();
    const { data: rows, error } = await supabasePublic
      .from("product_reviews")
      .select("id, product_slug, user_id, name, rating, title, comment, city, size_label, photos, helpful_count, store_reply, thank_you_coupon, created_at")
      .eq("product_slug", data.slug)
      .eq("approved", true)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error("Could not load reviews.");

    const list = (rows ?? []) as Array<Record<string, unknown>>;

    // Verified purchase: the reviewer's account has a delivered order containing this product.
    const userIds = Array.from(new Set(list.map((r) => r["user_id"]).filter(Boolean))) as string[];
    const verifiedIds = new Set<string>();
    if (userIds.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: orders } = await supabaseAdmin
        .from("orders")
        .select("user_id, items")
        .in("user_id", userIds)
        .eq("status", "delivered")
        .limit(500);
      for (const o of orders ?? []) {
        const items = Array.isArray(o.items) ? (o.items as Array<Record<string, unknown>>) : [];
        if (items.some((it) => it["slug"] === data.slug) && o.user_id) verifiedIds.add(String(o.user_id));
      }
    }

    // "Helpful" state for the current visitor.
    const me = await requestUserId();
    const myVotes = new Set<string>();
    if (me) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: votes } = await supabaseAdmin
        .from("review_votes")
        .select("review_id")
        .eq("user_id", me)
        .in("review_id", list.map((r) => String(r["id"])));
      for (const v of votes ?? []) myVotes.add(String(v.review_id));
    }

    return list.map((r) => ({
      id: String(r["id"]),
      product_slug: String(r["product_slug"]),
      name: String(r["name"]),
      rating: Number(r["rating"]),
      title: (r["title"] as string | null) ?? null,
      comment: String(r["comment"]),
      city: (r["city"] as string | null) ?? null,
      size_label: (r["size_label"] as string | null) ?? null,
      photos: Array.isArray(r["photos"]) ? (r["photos"] as string[]).filter((u) => typeof u === "string") : [],
      helpful_count: Number(r["helpful_count"] ?? 0),
      store_reply: (r["store_reply"] as string | null) ?? null,
      created_at: String(r["created_at"]),
      verified: r["user_id"] != null && verifiedIds.has(String(r["user_id"])),
      helpful_by_me: myVotes.has(String(r["id"])),
      thank_you: Boolean(r["thank_you_coupon"]),
    })) as Review[];
  });

/** Signed-in customers: submit a review. Stays hidden until an admin approves it. */
export const submitReview = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => submitSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = await requestUserId();
    if (!userId) throw new Error("Please sign in to write a review.");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    const name = (profile?.full_name ?? "").trim() || "Customer";

    const { error } = await supabaseAdmin.from("product_reviews").insert({
      product_slug: data.product_slug,
      user_id: userId,
      name,
      rating: data.rating,
      title: data.title,
      comment: data.comment,
      city: data.city || null,
      size_label: data.size_label || null,
      photos: data.photos ?? [],
      approved: false,
    });
    if (error) throw new Error("We could not save your review. Please try again.");
    return { ok: true as const };
  });

/** Signed-in customers: toggle a "Helpful" vote (one per user per review). */
export const toggleHelpful = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ review_id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = await requestUserId();
    if (!userId) throw new Error("Please sign in to vote.");

    const { data: existing } = await supabaseAdmin
      .from("review_votes")
      .select("id")
      .eq("review_id", data.review_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin.from("review_votes").delete().eq("id", existing.id);
      await supabaseAdmin
        .from("product_reviews")
        .update({ helpful_count: Math.max(0, (await currentHelpful(data.review_id)) - 1) })
        .eq("id", data.review_id);
      return { voted: false as const };
    }

    const { error } = await supabaseAdmin
      .from("review_votes")
      .insert({ review_id: data.review_id, user_id: userId });
    if (error) throw new Error("Could not save your vote.");
    await supabaseAdmin
      .from("product_reviews")
      .update({ helpful_count: (await currentHelpful(data.review_id)) + 1 })
      .eq("id", data.review_id);
    return { voted: true as const };
  });

async function currentHelpful(reviewId: string): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("product_reviews")
    .select("helpful_count")
    .eq("id", reviewId)
    .maybeSingle();
  return Number(data?.helpful_count ?? 0);
}
