import { products as fallbackProducts, parseSizeOptions, type SizeOption } from "@/data/products";

export type PublicProduct = {
  slug: string;
  name: string;
  short: string;
  description: string;
  image: string;
  price: number;
  mrp: number;
  sizes: string[];
  benefits: string[];
  category: string | null;
  stock: number;
  sku: string;
  seo_title: string | null;
  seo_description: string | null;
  image_alt: string | null;
  gallery: string[];
  rating: number | null;
  ratingCount: number;
  sizeOptions: SizeOption[];
  /** "Tablets" or "Crystals". */
  form: string | null;
  howToUse: string | null;
  safety: string | null;
  marketplace: {
    name: string;
    rating: number;
    count: number;
    url: string;
    checkedOn: string | null;
  } | null;
};

export const PRODUCT_SELECT =
  "slug,name,short_description,description,price,compare_at_price,sizes,features,image_url,category,stock_quantity,sku,seo_title,seo_description,is_featured,size_options,specifications,marketplace_name,marketplace_rating,marketplace_rating_count,marketplace_url,marketplace_checked_on";

type Row = Record<string, unknown>;

const staticImage = (slug: string) => fallbackProducts.find((p) => p.slug === slug)?.image;

function usableImage(url: unknown): url is string {
  return typeof url === "string" && (url.startsWith("http") || url.startsWith("/"));
}

function galleryFrom(row: Row, fallback: string): string[] {
  const rows = (row["product_images"] as Array<Record<string, unknown>> | null) ?? [];
  const ordered = [...rows]
    .sort((a, b) => {
      const pa = a["is_primary"] ? 0 : 1;
      const pb = b["is_primary"] ? 0 : 1;
      return pa - pb || Number(a["display_order"] ?? 0) - Number(b["display_order"] ?? 0);
    })
    .map((r) => String(r["image_url"]))
    .filter((u) => usableImage(u));
  const unique = Array.from(new Set(ordered));
  return unique.length ? unique : [fallback];
}

export function mapProductRow(row: Row): PublicProduct {
  const slug = String(row["slug"]);
  const price = Number(row["price"] ?? 0);
  const specs = (row["specifications"] as Record<string, unknown> | null) ?? null;
  const specStr = (k: string) => {
    const v = specs?.[k];
    return typeof v === "string" && v.trim() ? v : null;
  };
  const marketplace =
    row["marketplace_name"] && row["marketplace_rating"] != null && row["marketplace_url"]
      ? {
          name: String(row["marketplace_name"]),
          rating: Number(row["marketplace_rating"]),
          count: Number(row["marketplace_rating_count"] ?? 0),
          url: String(row["marketplace_url"]),
          checkedOn: (row["marketplace_checked_on"] as string | null) ?? null,
        }
      : null;
  return {
    slug,
    name: String(row["name"] ?? ""),
    short: (row["short_description"] as string | null) ?? "",
    description: (row["description"] as string | null) ?? (row["short_description"] as string | null) ?? "",
    image: usableImage(row["image_url"])
      ? (row["image_url"] as string)
      : (staticImage(slug) ?? fallbackProducts[0]!.image),
    price,
    mrp: Number(row["compare_at_price"] ?? price),
    sizes: (row["sizes"] as string[] | null)?.length ? (row["sizes"] as string[]) : ["Standard"],
    benefits: (row["features"] as string[] | null) ?? [],
    category: (row["category"] as string | null) ?? null,
    stock: Number(row["stock_quantity"] ?? 0),
    sku: (row["sku"] as string | null) ?? slug.toUpperCase(),
    seo_title: (row["seo_title"] as string | null) ?? null,
    seo_description: (row["seo_description"] as string | null) ?? null,
    image_alt: null,
    // Star ratings come from approved customer reviews only — never manual values.
    rating: null,
    ratingCount: 0,
    sizeOptions: parseSizeOptions(row["size_options"]),
    gallery: galleryFrom(row, usableImage(row["image_url"]) ? (row["image_url"] as string) : (staticImage(slug) ?? fallbackProducts[0]!.image)),
    form: specStr("form"),
    howToUse: specStr("how_to_use"),
    safety: specStr("safety"),
    marketplace,
  };
}

export async function publicSupabase() {
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
