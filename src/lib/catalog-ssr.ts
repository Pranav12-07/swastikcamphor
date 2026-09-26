import type { PublicProduct } from "@/lib/products.functions";
import type { CatalogProduct } from "@/lib/catalog-context";

/** Same shape the client catalog builds, so server and client render identical cards. */
export function toCatalogProduct(p: PublicProduct): CatalogProduct {
  return { ...p, bestFor: p.benefits.length ? p.benefits : p.category ? [p.category] : [] };
}

/**
 * Products for listing pages: the live client catalog once it has loaded,
 * otherwise the list the route loader fetched on the server. This puts real
 * product names, prices and links into the first HTML response for Google.
 */
export function withServerProducts(live: CatalogProduct[], server: PublicProduct[] | undefined): CatalogProduct[] {
  return live.length ? live : (server ?? []).map(toCatalogProduct);
}
