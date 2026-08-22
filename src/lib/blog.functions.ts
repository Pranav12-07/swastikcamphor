import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type PublicBlog = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  cover_alt: string | null;
  category: string | null;
  tags: string[];
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  related_links: string[];
  read_time: string | null;
};

const SELECT =
  "id, slug, title, excerpt, content, cover_image, cover_alt, category, tags, published_at, seo_title, seo_description, seo_keywords, related_links, read_time";

async function publicClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const url = process.env["SUPABASE_URL"]!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const listBlogs = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = await publicClient();
  const { data, error } = await supabase
    .from("blogs")
    .select(SELECT)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(60);
  if (error) return [] as PublicBlog[];
  return (data ?? []) as unknown as PublicBlog[];
});

export const getBlog = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().trim().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const supabase = await publicClient();
    const [post, related] = await Promise.all([
      supabase.from("blogs").select(SELECT).eq("status", "published").eq("slug", data.slug).maybeSingle(),
      supabase
        .from("blogs")
        .select("slug, title, excerpt, cover_image, category, read_time")
        .eq("status", "published")
        .neq("slug", data.slug)
        .order("published_at", { ascending: false })
        .limit(3),
    ]);
    if (!post.data) return null;
    return {
      post: post.data as unknown as PublicBlog,
      related: (related.data ?? []) as unknown as Array<{
        slug: string;
        title: string;
        excerpt: string | null;
        cover_image: string | null;
        category: string | null;
        read_time: string | null;
      }>,
    };
  });
