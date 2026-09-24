import { createFileRoute } from "@tanstack/react-router";

// Serves promo poster videos from the private bucket via a short-lived signed URL (supports streaming/range requests).
export const Route = createFileRoute("/api/public/promo-media/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const raw = (params as { _splat?: string })._splat ?? "";
        const path = decodeURIComponent(raw);
        if (!path || path.includes("..") || !/^videos\/[A-Za-z0-9._-]+$/.test(path)) {
          return new Response("Not found", { status: 404 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("promo-media").createSignedUrl(path, 3600);
        if (error || !data?.signedUrl) return new Response("Not found", { status: 404 });
        return new Response(null, {
          status: 302,
          headers: { location: data.signedUrl, "cache-control": "public, max-age=1800" },
        });
      },
    },
  },
});
