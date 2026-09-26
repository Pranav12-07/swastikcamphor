import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Truck } from "lucide-react";
import { defaultSizeOption, formatINR, sizeAvailable } from "@/data/products";
import { useCart } from "@/lib/cart";
import { useStoreSettings } from "@/lib/store-settings";
import { useReveal } from "@/hooks/use-reveal";
import { ProductGallery } from "@/components/products/ProductGallery";
import { ProductReviews } from "@/components/reviews/ProductReviews";
import { StarRating } from "@/components/StarRating";
import { ProductOffers } from "@/components/products/ProductOffers";
import { StickyBuyBar } from "@/components/products/StickyBuyBar";
import { getPublicProduct } from "@/lib/products.functions";
import { SITE_URL, breadcrumbJsonLd, canonicalLink, seoMeta } from "@/lib/seo";
import { site } from "@/config/site";

export const Route = createFileRoute("/products/$slug")({
  loader: async ({ params }) => {
    const data = await getPublicProduct({ data: { slug: params.slug } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) return {};
    const { product, reviewStats } = loaderData;
    const path = `/products/${params.slug}`;
    const title = product.seo_title || `${product.name} | Buy Online | Swastik Camphor`;
    const description =
      product.seo_description ||
      `Shop ${product.name} from Swastik Camphor. ${product.short || product.description}`.slice(0, 158);
    const abs = (u: string) => (u.startsWith("http") ? u : `${SITE_URL}${u}`);
    const gallery = (product.gallery?.length ? product.gallery : [product.image]).map(abs);
    const image = gallery[0]!;

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
                }
              : {}),
            offers: {
              "@type": "Offer",
              url: `${SITE_URL}${path}`,
              priceCurrency: "INR",
              price: product.price.toFixed(2),
              availability:
                product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              itemCondition: "https://schema.org/NewCondition",
              seller: { "@type": "Organization", name: site.name },
            },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Products", path: "/products" },
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
  const { add } = useCart();
  const { freeShippingAbove } = useStoreSettings();
  useReveal();

  const sizeOptions = product.sizeOptions ?? [];
  const [pickedSize, setPickedSize] = useState<string | null>(null);
  const selected = sizeOptions.length
    ? (sizeOptions.find((o) => o.label === pickedSize) ?? defaultSizeOption(product))
    : null;

  const price = selected?.price ?? product.price;
  const mrp = selected?.mrp ?? product.mrp;
  const inStock = selected ? sizeAvailable(product, selected) : product.stock > 0;
  const addToCart = () => {
    add(product.slug, selected?.label);
    toast.success(`${product.name} added to cart`);
  };
  const discount = mrp > price
    ? Math.round(((mrp - price) / mrp) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-16">
      <nav aria-label="Breadcrumb" className="mb-8 text-sm text-muted-foreground">
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

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery images={product.gallery?.length ? product.gallery : [product.image]} name={product.name} />

        <div>
          <h1 className="font-body text-3xl font-semibold md:text-4xl">{product.name}</h1>
          <div className="gold-rule mt-3 w-16" />
          <p className="mt-4 leading-relaxed text-muted-foreground">{product.description || product.short}</p>

          <div className="mt-6 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-semibold">{formatINR(product.price)}</span>
            {product.mrp > product.price && (
              <span className="text-muted-foreground line-through">{formatINR(product.mrp)}</span>
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

          {typeof product.rating === "number" && product.rating > 0 ? (
            <div className="mt-3 flex items-center gap-2">
              <StarRating rating={product.rating} />
              <span className="text-sm text-muted-foreground">{product.rating.toFixed(1)} / 5</span>
              <span className="text-sm text-muted-foreground">({product.ratingCount.toLocaleString("en-IN")} ratings)</span>
            </div>
          ) : (
            reviewStats && (
              <p className="mt-2 text-sm text-muted-foreground">
                Rated {reviewStats.average} / 5 from {reviewStats.count} verified reviews
              </p>
            )
          )}

          {product.benefits.length > 0 && (
            <ul className="mt-6 space-y-2 text-sm">
              {product.benefits.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                  {b}
                </li>
              ))}
            </ul>
          )}

          <dl className="mt-6 grid gap-2 text-sm text-muted-foreground">
            <div className="flex gap-2">
              <dt className="text-foreground">Available in:</dt>
              <dd>{product.sizes.join(" • ")}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-foreground">SKU:</dt>
              <dd>{product.sku}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-foreground">Brand:</dt>
              <dd>{site.name}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-foreground">Shipping:</dt>
              <dd>Dispatched in 1–2 days, delivered across India.</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-foreground">Returns:</dt>
              <dd>
                <Link to="/return-refund-policy" className="underline">
                  See our return &amp; refund policy
                </Link>
              </dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              id="pdp-add-to-cart"
              type="button"
              disabled={!inStock}
              onClick={addToCart}
              className="rounded-full bg-primary px-7 py-3 text-sm font-medium text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5 disabled:opacity-50"
            >
              Add to cart
            </button>
            <Link
              to="/checkout"
              onClick={() => add(product.slug)}
              className="rounded-full border border-gold/50 px-7 py-3 text-sm font-medium transition-colors hover:bg-accent/15"
            >
              Buy now
            </Link>
          </div>

          <ProductOffers productName={product.name} />

          <ProductReviews slug={product.slug} productName={product.name} />
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

      <section className="mt-16 rounded-3xl bg-secondary/40 p-6 md:p-8">
        <h2 className="font-display text-xl">Helpful camphor guides</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Learn how to use camphor for aarti, store it correctly and choose the right grade.
        </p>
        <Link to="/blogs" className="mt-4 inline-block text-sm underline">
          Read the Swastik Camphor journal
        </Link>
      </section>

      {inStock && (
        <StickyBuyBar
          targetId="pdp-add-to-cart"
          productName={product.name}
          price={product.price}
          mrp={product.mrp}
          onAdd={addToCart}
        />
      )}
    </div>
  );
}
