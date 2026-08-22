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
