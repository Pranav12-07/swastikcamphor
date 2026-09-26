import { createFileRoute } from "@tanstack/react-router";
import { publicSupabase } from "@/lib/products.server";

export const Route = createFileRoute("/api/public/product-image/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const raw = (params as { _splat?: string })._splat ?? "";
        const path = decodeURIComponent(raw);
        if (!path || path.includes("..") || !/^products\/[A-Za-z0-9._/-]+$/.test(path)) {
          return new Response("Not found", { status: 404 });
        }
        const supabase = await publicSupabase();
        const { data, error } = await supabase.storage.from("product-images").download(path);
        if (error || !data) return new Response("Not found", { status: 404 });
        return new Response(await data.arrayBuffer(), {
          headers: {
            "content-type": data.type || "image/jpeg",
            "cache-control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
