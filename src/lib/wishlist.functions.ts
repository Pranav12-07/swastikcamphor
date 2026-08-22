import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const slug = z.object({ slug: z.string().trim().min(1).max(80) });

export const listWishlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("wishlists")
      .select("product_slug")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => (r as { product_slug: string }).product_slug);
  });

export const toggleWishlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => slug.parse(input))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("wishlists")
      .select("id")
      .eq("user_id", context.userId)
      .eq("product_slug", data.slug)
      .maybeSingle();

    if (existing) {
      const { error } = await context.supabase
        .from("wishlists")
        .delete()
        .eq("id", (existing as { id: string }).id);
      if (error) throw new Error(error.message);
      return { saved: false as const };
    }

    const { error } = await context.supabase
      .from("wishlists")
      .insert({ user_id: context.userId, product_slug: data.slug });
    if (error) throw new Error(error.message);
    return { saved: true as const };
  });
