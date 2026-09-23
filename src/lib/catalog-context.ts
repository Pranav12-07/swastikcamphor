import { createContext, useContext } from "react";
import type { Product } from "@/data/products";

export type CatalogProduct = Product & { category: string | null; stock: number };
export type CatalogCategory = { slug: string; name: string; image_url: string | null };

export type CatalogCoupon = {
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  max_discount: number | null;
};

export type CatalogValue = {
  products: CatalogProduct[];
  categories: CatalogCategory[];
  coupons: CatalogCoupon[];
  getProduct: (slug: string) => CatalogProduct | undefined;
  loading: boolean;
};

export const CatalogContext = createContext<CatalogValue | null>(null);

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used inside CatalogProvider");
  return ctx;
}
