import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { SITE_URL } from "@/lib/seo";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const STATIC_ENTRIES: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/shop", changefreq: "daily", priority: "0.9" },
  { path: "/products", changefreq: "weekly", priority: "0.9" },
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/blogs", changefreq: "weekly", priority: "0.7" },
  { path: "/faq", changefreq: "monthly", priority: "0.5" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms-and-conditions", changefreq: "yearly", priority: "0.3" },
  { path: "/return-refund-policy", changefreq: "yearly", priority: "0.3" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [...STATIC_ENTRIES];

        try {
          const { publicSupabase } = await import("@/lib/products.server");
          const supabase = await publicSupabase();
          const [products, blogs] = await Promise.all([
            supabase.from("products").select("slug,updated_at").eq("is_active", true),
            supabase.from("blogs").select("slug,published_at").eq("status", "published"),
          ]);
          for (const row of products.data ?? []) {
            const entry: SitemapEntry = { path: `/products/${row.slug}`, changefreq: "weekly", priority: "0.8" };
            if (row.updated_at) entry.lastmod = new Date(row.updated_at).toISOString().slice(0, 10);
            entries.push(entry);
          }
          for (const row of blogs.data ?? []) {
            const entry: SitemapEntry = { path: `/blogs/${row.slug}`, changefreq: "monthly", priority: "0.6" };
            if (row.published_at) entry.lastmod = new Date(row.published_at).toISOString().slice(0, 10);
            entries.push(entry);
          }
        } catch {
          // fall back to static entries only
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${SITE_URL}${e.path === "/" ? "" : e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
