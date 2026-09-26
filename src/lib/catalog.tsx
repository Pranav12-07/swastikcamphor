import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { products as fallbackProducts, parseSizeOptions } from "@/data/products";
import {
  CatalogContext,
  useCatalog,
  type CatalogCategory,
  type CatalogCoupon,
  type CatalogProduct,
  type CatalogValue,
} from "@/lib/catalog-context";

export { useCatalog };
export type { CatalogCategory, CatalogCoupon, CatalogProduct, CatalogValue };

const staticImage = (slug: string) => fallbackProducts.find((p) => p.slug === slug)?.image;

function isUsableImage(url: string | null): url is string {
  if (!url) return false;
  return url.startsWith("http") || url.startsWith("/");
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const productsQuery = useQuery({
    queryKey: ["public-products"],
    staleTime: 60_000,
    queryFn: async (): Promise<CatalogProduct[]> => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "slug,name,short_description,description,price,compare_at_price,sizes,features,image_url,category,is_featured,is_bestseller,stock_quantity,admin_rating,admin_rating_count,size_options",
        )
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("price", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        slug: row.slug,
        name: row.name,
        short: row.short_description ?? "",
        description: row.description ?? row.short_description ?? "",
        image: isUsableImage(row.image_url) ? row.image_url : (staticImage(row.slug) ?? fallbackProducts[0]!.image),
        price: Number(row.price),
        mrp: Number(row.compare_at_price ?? row.price),
        sizes: row.sizes?.length ? row.sizes : ["Standard"],
        benefits: row.features ?? [],
        bestFor: row.features?.length ? row.features : row.category ? [row.category] : [],
        category: row.category ?? null,
        stock: Number(row.stock_quantity ?? 0),
        rating: row.admin_rating != null ? Number(row.admin_rating) : null,
        ratingCount: Number(row.admin_rating_count ?? 0),
        sizeOptions: parseSizeOptions(row.size_options),
      }));
    },
  });

  const categoriesQuery = useQuery({
    queryKey: ["public-categories"],
    staleTime: 60_000,
    queryFn: async (): Promise<CatalogCategory[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("slug,name,image_url,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((c) => ({ slug: c.slug, name: c.name, image_url: c.image_url }));
    },
  });

  const couponsQuery = useQuery({
    queryKey: ["public-coupons"],
    staleTime: 60_000,
    queryFn: async (): Promise<CatalogCoupon[]> => {
      const { data, error } = await supabase
        .from("coupons")
        .select("code,discount_type,discount_value,min_order_amount,max_discount,expires_at,starts_at")
        .eq("is_active", true);
      if (error) throw error;
      const now = Date.now();
      return (data ?? [])
        .filter((c) => (!c.starts_at || new Date(c.starts_at).getTime() <= now) && (!c.expires_at || new Date(c.expires_at).getTime() >= now))
        .map((c) => ({
          code: c.code.toUpperCase(),
          discount_type: c.discount_type,
          discount_value: Number(c.discount_value),
          min_order_amount: Number(c.min_order_amount),
          max_discount: c.max_discount === null ? null : Number(c.max_discount),
        }));
    },
  });

  const value = useMemo<CatalogValue>(() => {
    const list = productsQuery.data ?? [];
    const coupons = couponsQuery.data ?? [];
    return {
      products: list,
      categories: categoriesQuery.data ?? [],
      coupons,
      getProduct: (slug: string) => list.find((p) => p.slug === slug),
      loading: productsQuery.isLoading,
    };
  }, [productsQuery.data, productsQuery.isLoading, categoriesQuery.data, couponsQuery.data]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}
