import { site } from "@/config/site";

/** Canonical origin used for canonical tags, og:url, sitemap and JSON-LD. */
export const SITE_URL = "https://swastikcamphor.lovable.app";

export const canonical = (path = "/") => `${SITE_URL}${path === "/" ? "" : path}`;

/** Head helpers shared by every public route. */
export function seoMeta(opts: {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article" | "product";
}) {
  const url = canonical(opts.path);
  const meta: Array<Record<string, string>> = [
    { title: opts.title },
    { name: "description", content: opts.description },
    { property: "og:title", content: opts.title },
    { property: "og:description", content: opts.description },
    { property: "og:type", content: opts.type ?? "website" },
    { property: "og:url", content: url },
    { property: "og:site_name", content: site.name },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: opts.title },
    { name: "twitter:description", content: opts.description },
  ];
  if (opts.image) {
    meta.push({ property: "og:image", content: opts.image });
    meta.push({ name: "twitter:image", content: opts.image });
  }
  return meta;
}

export const canonicalLink = (path: string) => [{ rel: "canonical", href: canonical(path) }];

/** Meta for private pages that must never appear in search results. */
export const noindexMeta = [{ name: "robots", content: "noindex, nofollow" }];

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.name,
  legalName: site.name,
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.png`,
  email: site.email,
  telephone: site.phone,
  description:
    "Swastik Camphor is a manufacturer and supplier of 100% pure camphor tablets, Bhimseni camphor, cones and pooja products in India.",
  address: {
    "@type": "PostalAddress",
    streetAddress: site.address.line1,
    addressLocality: "Hyderabad",
    postalCode: "500008",
    addressRegion: "Telangana",
    addressCountry: "IN",
  },
  sameAs: [
    "https://www.instagram.com/swastik_camphor/",
    "https://www.facebook.com/61556172086307/",
  ],
};

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: site.name,
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/shop?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: canonical(item.path),
    })),
  };
}
