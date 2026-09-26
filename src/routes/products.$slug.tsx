import { Link, createFileRoute, notFound, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, ChevronRight, Lock, Package, Truck } from "lucide-react";
import {
  defaultSizeOption,
  formatGrams,
  formatINR,
  isTwinPack,
  matchingTwin,
  packContents,
  pctOff,
  per100g,
  sizeAvailable,
  twinSavings,
  type SizeOption,
} from "@/data/products";
import { useCart } from "@/lib/cart";
import { useStoreSettings } from "@/lib/store-settings";
import { useReveal } from "@/hooks/use-reveal";
import { ProductGallery } from "@/components/products/ProductGallery";
import { ProductReviews } from "@/components/reviews/ProductReviews";
import { StarRating } from "@/components/StarRating";
import { ProductOffers } from "@/components/products/ProductOffers";
import { StickyBuyBar } from "@/components/products/StickyBuyBar";
import { QtyStepper } from "@/components/QtyStepper";
import { getPublicProduct } from "@/lib/products.functions";
import { OLD_SLUG_REDIRECTS } from "@/lib/pack-redirects";
import { SITE_URL, breadcrumbJsonLd, canonicalLink, seoMeta } from "@/lib/seo";
import { site } from "@/config/site";

export const Route = createFileRoute("/products/$slug")({
  validateSearch: (search: Record<string, unknown>) => {
    const out: { size?: string; review?: "1" } = {};
    if (typeof search["size"] === "string" && search["size"]) out.size = search["size"];
    if (search["review"] === "1" || search["review"] === 1) out.review = "1";
    return out;
  },
  loader: async ({ params }) => {
    const data = await getPublicProduct({ data: { slug: params.slug } });
    if (!data) {
      const legacy = OLD_SLUG_REDIRECTS[params.slug];
      if (legacy) {
        throw redirect({
          to: "/products/$slug",
          params: { slug: legacy.slug },
          search: { size: legacy.size },
          statusCode: 301,
        });
      }
      throw notFound();
    }
    return data;
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) return {};
    const { product, reviewStats, topReviews, shipping } = loaderData;
    const path = `/products/${params.slug}`;
    const title = product.seo_title || `${product.name} | Buy Online | Swastik Camphor`;
    const description =
      product.seo_description ||
      `Shop ${product.name} from Swastik Camphor. ${product.short || product.description}`.slice(0, 158);
    const abs = (u: string) => (u.startsWith("http") ? u : `${SITE_URL}${u}`);
    const optionImages = product.sizeOptions.map((o) => o.image).filter((u): u is string => !!u);
    const gallery = Array.from(
      new Set([...(product.gallery?.length ? product.gallery : [product.image]), ...optionImages]),
    ).map(abs);
    const image = gallery[0]!;

    const inStock = (o: SizeOption) => o.stock == null || o.stock > 0;
    const prices = product.sizeOptions.length
      ? product.sizeOptions.map((o) => o.price)
      : [product.price];
    const availability = (stock: number | null) =>
      stock == null || stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";

    return {
      meta: seoMeta({ title, description, path, image, type: "product" }),
      links: canonicalLink(path),
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: product.description || product.short,
            image: gallery,
            sku: product.sku,
            brand: { "@type": "Brand", name: site.name },
            ...(reviewStats
              ? {
                  aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue: reviewStats.average,
                    reviewCount: reviewStats.count,
                  },
                  review: (topReviews ?? []).slice(0, 5).map((r) => ({
                    "@type": "Review",
                    reviewRating: { "@type": "Rating", ratingValue: r.rating },
                    author: { "@type": "Person", name: r.name },
                    ...(r.title ? { headline: r.title } : {}),
                    reviewBody: r.comment,
                    datePublished: r.created_at,
                  })),
                }
              : {}),
            offers: {
              "@type": "AggregateOffer",
              url: `${SITE_URL}${path}`,
              priceCurrency: "INR",
              lowPrice: Math.min(...prices).toFixed(2),
              highPrice: Math.max(...prices).toFixed(2),
              offerCount: product.sizeOptions.length || 1,
              availability: product.sizeOptions.some(inStock) || product.stock > 0
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
              itemCondition: "https://schema.org/NewCondition",
              seller: { "@type": "Organization", name: site.name },
              offers: (product.sizeOptions.length
                ? product.sizeOptions
                : [
                    {
                      label: product.name,
                      sku: product.sku,
                      price: product.price,
                      stock: product.stock,
                    },
                  ]
              ).map((o) => ({
                "@type": "Offer",
                name: o.label,
                sku: "sku" in o && o.sku ? o.sku : product.sku,
                price: Number(o.price).toFixed(2),
                priceCurrency: "INR",
                availability: availability("stock" in o ? (o.stock ?? null) : null),
                url: `${SITE_URL}${path}?size=${encodeURIComponent(o.label)}`,
                itemCondition: "https://schema.org/NewCondition",
                shippingDetails: [
                  {
                    "@type": "OfferShippingDetails",
                    shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
                    shippingRate: { "@type": "MonetaryAmount", value: shipping.flat.toFixed(2), currency: "INR" },
                    deliveryTime: {
                      "@type": "ShippingDeliveryTime",
                      handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2, unitCode: "d" },
                    },
                  },
                  {
                    "@type": "OfferShippingDetails",
                    shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
                    shippingRate: { "@type": "MonetaryAmount", value: "0.00", currency: "INR" },
                    doesNotShip: false,
                    transitTimeLabel: `Free shipping on orders above ₹${shipping.freeAbove}`,
                    deliveryTime: {
                      "@type": "ShippingDeliveryTime",
                      handlingTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2, unitCode: "d" },
                    },
                  },
                ],
              })),
            },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Our Products", path: "/products" },
              { name: product.name, path },
            ]),
          ),
        },
      ],
    };
  },
  component: ProductDetail,
});

function ProductDetail() {
  const { product, related, reviewStats } = Route.useLoaderData();
  const search = Route.useSearch();
  const { add, lines } = useCart();
  const navigate = useNavigate();
  const { freeShippingAbove, shippingFlat } = useStoreSettings();
  useReveal();

  const sizeOptions = product.sizeOptions ?? [];
  const [pickedSize, setPickedSize] = useState<string | null>(search.size ?? null);
  const selected = sizeOptions.length
    ? (sizeOptions.find((o) => o.label === pickedSize) ?? defaultSizeOption(product))
    : null;

  // Keep the shareable URL in step with the chosen pack (no reload).
  useEffect(() => {
    if (!selected) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("size") === selected.label) return;
    url.searchParams.set("size", selected.label);
    window.history.replaceState(null, "", url.toString());
  }, [selected]);

  const price = selected?.price ?? product.price;
  const mrp = selected?.mrp ?? product.mrp;
  const inStock = selected ? sizeAvailable(product, selected) : product.stock > 0;
  const addToCart = () => {
    add(product.slug, selected?.label);
    toast.success(`${product.name} added to cart`);
  };
  const discount = pctOff(mrp, price);
  const per100 = selected ? per100g(selected) : null;
  const twinSave = selected ? twinSavings(product, selected) : null;
  const upsellTwin = selected ? matchingTwin(product, selected) : null;
  const upsellSave = upsellTwin ? twinSavings(product, upsellTwin) : null;

  const twins = sizeOptions.filter((o) => isTwinPack(o));
  const singles = sizeOptions.filter((o) => !isTwinPack(o));

  // The gallery leads with the selected pack's own photo.
  const gallery = useMemo(() => {
    const base = product.gallery?.length ? product.gallery : [product.image];
    if (selected?.image) return [selected.image, ...base.filter((u) => u !== selected.image)];
    return base;
  }, [product, selected]);

  const renderPills = (opts: SizeOption[]) => (
    <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Pack size">
      {opts.map((opt) => {
        const available = sizeAvailable(product, opt);
        const active = selected?.label === opt.label;
        const off = pctOff(opt.mrp, opt.price);
        return (
          <button
            key={opt.label}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={!available}
            onClick={() => setPickedSize(opt.label)}
            className={`flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm transition-colors ${
              active
                ? "border-primary bg-primary/10 font-medium"
                : isTwinPack(opt)
                  ? "border-gold/60 hover:border-primary/60"
                  : "border-gold/40 hover:border-primary/60"
            } ${!available ? "cursor-not-allowed opacity-60 line-through" : ""}`}
          >
            <span>{opt.short_label ?? opt.label}</span>
            {off > 0 && <span className="text-xs font-semibold text-primary">{off}% off</span>}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-16">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground md:mb-8">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link to="/" className="hover:text-foreground">
              Home
            </Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <li>
            <Link to="/products" className="hover:text-foreground">
              Products
            </Link>
          </li>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <li aria-current="page" className="text-foreground">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
        <div className="lg:sticky lg:top-24 lg:self-start [&_figure]:max-h-[60vh] lg:[&_figure]:max-h-none">
          <ProductGallery images={gallery} name={product.name} />
        </div>

        <div>
          <h1 className="font-body text-2xl font-semibold md:text-4xl">{product.name}</h1>
          <div className="gold-rule mt-3 w-16" />

          {product.marketplace && (
            <a
              href={product.marketplace.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-gold/40 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
            >
              <span className="text-gold">★</span>
              <span className="font-semibold text-foreground">{product.marketplace.rating.toFixed(1)}</span>
              · {product.marketplace.count.toLocaleString("en-IN")} ratings on {product.marketplace.name}
              {product.marketplace.checkedOn && (
                <span>
                  (as of {new Date(product.marketplace.checkedOn).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })})
                </span>
              )}
            </a>
          )}

          {reviewStats ? (
            <a href="#reviews" className="mt-2 flex items-center gap-2">
              <StarRating rating={reviewStats.average} />
              <span className="text-sm text-muted-foreground">{reviewStats.average.toFixed(1)} / 5</span>
              <span className="text-sm text-muted-foreground underline underline-offset-2">
                ({reviewStats.count.toLocaleString("en-IN")} reviews)
              </span>
            </a>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No reviews yet – be the first</p>
          )}

          <p className="mt-3 leading-relaxed text-muted-foreground">{product.short || product.description}</p>

          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-semibold">{formatINR(price)}</span>
            {mrp > price && (
              <span className="text-lg text-muted-foreground line-through">{formatINR(mrp)}</span>
            )}
            {discount > 0 && (
              <span className="rounded-full bg-accent px-3.5 py-1.5 text-sm font-bold text-accent-foreground">
                {discount}% OFF
              </span>
            )}
            <span className={`text-sm ${inStock ? "text-emerald-600" : "text-destructive"}`}>
              {inStock ? "In stock" : "Out of stock"}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Inclusive of all taxes
            {per100 != null && <span> · ₹{per100.toLocaleString("en-IN")} per 100 g</span>}
          </p>
          {twinSave != null && (
            <p className="mt-1 text-sm font-medium text-emerald-700">
              Save {formatINR(twinSave)} vs 2 single jars
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {selected?.popular && (
              <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                Most chosen
              </span>
            )}
            {price >= freeShippingAbove && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 px-2.5 py-1 text-xs text-muted-foreground">
                <Truck className="h-3.5 w-3.5" aria-hidden="true" /> Free shipping
              </span>
            )}
          </div>

          {sizeOptions.length > 0 && (
            <div className="mt-5 space-y-4">
              {twins.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-primary">Twin Packs – save more</p>
                  {renderPills(twins)}
                </div>
              )}
              {singles.length > 0 && (
                <div>
                  <p className="text-sm font-medium">{twins.length > 0 ? "Single packs" : "Available in:"}</p>
                  {renderPills(singles)}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <div id="pdp-add-to-cart" className="w-full sm:w-auto sm:min-w-44">
              <QtyStepper
                slug={product.slug}
                size={selected?.label ?? ""}
                max={selected ? (selected.stock ?? product.stock ?? null) : null}
                disabled={!inStock || !selected}
                className="[&>button]:h-12 [&>button]:text-sm [&>div]:h-12"
              />
            </div>
            <button
              type="button"
              disabled={!inStock || !selected}
              onClick={() => {
                if (!selected) return;
                const inCart = lines.some((l) => l.slug === product.slug && l.size === selected.label);
                if (!inCart) add(product.slug, selected.label, 1, { skipUpsell: true });
                void navigate({ to: "/checkout" });
              }}
              className="w-full rounded-full border border-gold/50 px-7 py-3 text-center text-sm font-medium transition-colors hover:bg-accent/15 disabled:opacity-50 sm:w-auto"
            >
              Buy now
            </button>
          </div>

          {upsellTwin && upsellSave != null && (
            <div className="mt-4 rounded-2xl border border-gold/50 bg-accent/10 p-4">
              <p className="text-sm font-medium">
                Buy 2 and save {formatINR(upsellSave)}: {upsellTwin.label} for {formatINR(upsellTwin.price)}
              </p>
              <button
                type="button"
                onClick={() => setPickedSize(upsellTwin.label)}
                className="mt-2 rounded-full border border-primary px-4 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
              >
                Switch to Twin Pack
              </button>
            </div>
          )}

          <ul className="mt-6 grid grid-cols-2 gap-2.5 text-xs text-muted-foreground sm:grid-cols-4">
            <li className="flex items-center gap-1.5">
              <BadgeCheck className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" /> 100% pure camphor
            </li>
            <li className="flex items-center gap-1.5">
              <Truck className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" /> Dispatched in 1–2 days
            </li>
            <li className="flex items-center gap-1.5">
              <Lock className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" /> Secure payment
            </li>
            <li className="flex items-center gap-1.5">
              <Package className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" /> Free shipping above{" "}
              {formatINR(freeShippingAbove)}
            </li>
          </ul>

          <ProductOffers productName={product.name} />

          {product.benefits.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-xl">Highlights</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {product.benefits.map((b) => (
                  <li key={b} className="flex gap-2">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8">
            <h2 className="font-display text-xl">Description</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {product.description || product.short}
            </p>
          </div>

          <div className="mt-8">
            <h2 className="font-display text-xl">Product details</h2>
            <dl className="mt-3 divide-y divide-border rounded-2xl border border-gold/25 text-sm">
              {[
                ["Brand", site.name],
                ["Product", product.name],
                ...(product.form ? [["Form", product.form] as const] : []),
                ...(selected?.grams ? [["Net weight", formatGrams(selected.grams)] as const] : []),
                ...(selected ? [["Pack contents", packContents(selected)] as const] : []),
                ["SKU", selected?.sku ?? product.sku],
                ["Country of origin", "India"],
                [
                  "Manufactured by",
                  "Vijayasree Camphor Industries, 8-1-40/189, Samatha Colony, Shaikpet, Hyderabad, Telangana 500008",
                ],
                ["Customer care", `${site.phone}, ${site.email}`],
              ].map(([dt, dd]) => (
                <div key={dt} className="flex gap-3 px-4 py-2.5">
                  <dt className="w-32 shrink-0 text-muted-foreground">{dt}</dt>
                  <dd className="min-w-0">{dd}</dd>
                </div>
              ))}
            </dl>
          </div>

          {product.howToUse && (
            <div className="mt-8">
              <h2 className="font-display text-xl">How to use</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{product.howToUse}</p>
            </div>
          )}
          {product.safety && (
            <div className="mt-8">
              <h2 className="font-display text-xl">Safety</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{product.safety}</p>
            </div>
          )}

          <div id="reviews" className="scroll-mt-28">
            <ProductReviews slug={product.slug} productName={product.name} sizeOptions={sizeOptions} />
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="font-display text-2xl">Related pooja products</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <Link
                key={item.slug}
                to="/products/$slug"
                params={{ slug: item.slug }}
                search={{}}
                className="card-premium group overflow-hidden"
              >
                <img
                  src={item.image}
                  alt={`${item.name} by Swastik Camphor`}
                  loading="lazy"
                  className="aspect-4/3 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="p-5">
                  <h3 className="font-body text-lg font-semibold">{item.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{formatINR(item.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {inStock && selected && (
        <StickyBuyBar
          targetId="pdp-add-to-cart"
          slug={product.slug}
          productName={product.name}
          size={selected.label}
          sizeLabel={selected.short_label ?? selected.label}
          price={price}
          mrp={mrp}
          max={selected.stock ?? product.stock ?? null}
        />
      )}
    </div>
  );
}
