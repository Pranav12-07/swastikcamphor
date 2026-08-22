import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { products as fallbackProducts, COUPONS as FALLBACK_COUPONS, type Product } from "@/data/products";

export type CatalogCoupon = {
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  max_discount: number | null;
};

type CatalogValue = {
  products: Product[];
  coupons: CatalogCoupon[];
  getProduct: (slug: string) => Product | undefined;
  loading: boolean;
};

const CatalogContext = createContext<CatalogValue | null>(null);

const staticImage = (slug: string) => fallbackProducts.find((p) => p.slug === slug)?.image;

function isUsableImage(url: string | null): url is string {
  if (!url) return false;
  return url.startsWith("http") || url.startsWith("/");
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const productsQuery = useQuery({
    queryKey: ["public-products"],
    staleTime: 60_000,
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "slug,name,short_description,description,price,compare_at_price,sizes,features,image_url,category,is_featured,is_bestseller,stock_quantity",
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
      }));
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
    const list = productsQuery.data?.length ? productsQuery.data : fallbackProducts;
    const coupons =
      couponsQuery.data?.length
        ? couponsQuery.data
        : Object.entries(FALLBACK_COUPONS).map(([code, rate]) => ({
            code,
            discount_type: "percentage",
            discount_value: rate * 100,
            min_order_amount: 0,
            max_discount: null,
          }));
    return {
      products: list,
      coupons,
      getProduct: (slug: string) => list.find((p) => p.slug === slug),
      loading: productsQuery.isLoading,
    };
  }, [productsQuery.data, productsQuery.isLoading, couponsQuery.data]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used inside CatalogProvider");
  return ctx;
}
