import { Link, createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { ProductReviews } from "@/components/reviews/ProductReviews";
import { formatINR } from "@/data/products";
import { useCatalog } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { useReveal } from "@/hooks/use-reveal";

export const Route = createFileRoute("/products/")({
  head: () => ({
    meta: [
      { title: "Our Products — Camphor Tablets, Bhimseni, Cones & Gift Packs" },
      {
        name: "description",
        content:
          "Explore the full Swastik Camphor range: pure camphor tablets, natural Bhimseni camphor, long-burning cones and blocks, and premium pooja gift packs.",
      },
      { property: "og:title", content: "Our Products — Swastik Camphor" },
      {
        property: "og:description",
        content: "Camphor tablets, Bhimseni crystals, cones and blocks, and festive pooja gift packs.",
      },
    ],
  }),
  component: Products,
});

function Products() {
  const { products } = useCatalog();
  useReveal();
  const { add } = useCart();

  return (
    <>
      <PageHeader
        eyebrow="Our products"
        title="Pure camphor, crafted for every purpose"
        subtitle="From daily aarti to aromatherapy and festive gifting — every product carries the same promise of purity."
      />

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-16 md:px-8">
        {products.map((product, i) => (
          <article
            key={product.slug}
            className={`reveal grid items-center gap-10 lg:grid-cols-2 ${i % 2 ? "lg:[&>figure]:order-2" : ""}`}
          >
            <figure className="overflow-hidden rounded-3xl">
              <img
                src={product.image}
                alt={product.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-1000 hover:scale-105"
              />
            </figure>
            <div>
              <h2 className="text-3xl">{product.name}</h2>
              <div className="gold-rule mt-3 w-16" />
              <p className="mt-4 leading-relaxed text-muted-foreground">{product.description}</p>
              <ul className="mt-5 space-y-2 text-sm">
                {product.benefits.map((b) => (
                  <li key={b} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                    {b}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm text-muted-foreground">
                Available in: <span className="text-foreground">{product.sizes.join(" • ")}</span>
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="font-display text-2xl">{formatINR(product.price)}</span>
                <button
                  type="button"
                  onClick={() => {
                    add(product.slug);
                    toast.success(`${product.name} added to cart`);
                  }}
                  className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5"
                >
                  Add to cart
                </button>
                <Link
                  to="/shop"
                  className="rounded-full border border-gold/50 px-6 py-2.5 text-sm font-medium transition-colors hover:bg-accent/15"
                >
                  Go to shop
                </Link>
              </div>
              <ProductReviews slug={product.slug} productName={product.name} />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}