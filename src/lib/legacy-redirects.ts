/**
 * 301 redirects for URLs from the old WordPress/WooCommerce site that are
 * still in Google's index. Add more exact paths to EXACT as Search Console
 * reports them under Pages > Not found (404).
 */

const EXACT: Record<string, string> = {
  "/red-color-pouches-tablets-from-swastik-near-me-camphor": "/products",
  "/the-swastik-symbol-a-sacred-emblem": "/blogs",
  "/my-account": "/account",
};

const PREFIXES: Array<[prefix: string, target: string]> = [
  ["/product-category/", "/products"],
  ["/product/", "/products"],
  ["/shop/page/", "/products"],
  ["/category/", "/blogs"],
  ["/tag/", "/blogs"],
  ["/author/", "/blogs"],
  ["/my-account/", "/account"],
];

/** Returns the new path for an old URL, or null when the path is not a legacy URL. */
export function legacyRedirectTarget(pathname: string): string | null {
  const path = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  const exact = EXACT[path];
  if (exact) return exact;
  const withSlash = `${path}/`;
  for (const [prefix, target] of PREFIXES) {
    if (withSlash.startsWith(prefix)) return target;
  }
  return null;
}

/** A 301 Response for GET/HEAD requests to legacy URLs, otherwise null. */
export function legacyRedirectResponse(request: Request): Response | null {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const url = new URL(request.url);
  const target = legacyRedirectTarget(url.pathname);
  if (!target || target === url.pathname) return null;
  return new Response(null, {
    status: 301,
    headers: { Location: target, "Cache-Control": "public, max-age=86400" },
  });
}
