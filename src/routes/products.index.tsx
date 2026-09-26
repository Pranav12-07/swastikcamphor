import { canonical, canonicalLink } from "@/lib/seo";
import { Link, createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { ProductCard } from "@/components/ProductCard";
import { useCatalog } from "@/lib/catalog";
import { listPublicProducts, type PublicProduct } from "@/lib/products.functions";
import { withServerProducts } from "@/lib/catalog-ssr";
import { useReveal } from "@/hooks/use-reveal";

export const Route = createFileRoute("/products/")({
  head: () => ({
    links: canonicalLink("/products"),
    meta: [
      { property: "og:url", content: canonical("/products") },
      { name: "twitter:card", content: "summary_large_image" },
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
  loader: () => listPublicProducts().catch(() => [] as PublicProduct[]),
  component: Products,
});

/** "BHIMSENI CAMPHOR" -> "Bhimseni Camphor"; leaves mixed-case names untouched. */
function toTitleCase(name: string): string {
  if (name !== name.toUpperCase()) return name;
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function Products() {
  const serverProducts = Route.useLoaderData();
  const { products: liveProducts, categories } = useCatalog();
  const products = withServerProducts(liveProducts, serverProducts);
  useReveal();

  // Group by category in the /admin/categories order; uncategorised products go last.
  const sections = categories
    .map((c) => ({
      key: c.slug,
      title: toTitleCase(c.name),
      items: products.filter((p) => p.category === c.slug),
    }))
    .filter((s) => s.items.length > 0);
  const uncategorised = products.filter((p) => !p.category || !categories.some((c) => c.slug === p.category));
  if (uncategorised.length > 0) {
    sections.push({ key: "more", title: "More products", items: uncategorised });
  }

  return (
    <>
      <PageHeader
        eyebrow="Our products"
        title="Pure camphor, crafted for every purpose"
        subtitle="From daily aarti to aromatherapy and festive gifting — every product carries the same promise of purity."
      />

      <div className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        {products.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            Our products are being restocked. Meanwhile, you can{" "}
            <Link to="/shop" className="font-medium text-primary underline underline-offset-4">
              visit the shop
            </Link>
            .
          </p>
        ) : (
          <>
            {sections.length > 1 && (
              <nav aria-label="Product categories" className="mb-12">
                <ul className="flex flex-nowrap gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible sm:pb-0">
                  {sections.map((s) => (
                    <li key={s.key} className="shrink-0">
                      <a
                        href={`#cat-${s.key}`}
                        className="block rounded-full border border-gold/40 px-4 py-1.5 text-sm transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                      >
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            <div className="space-y-16">
              {sections.map((s) => (
                <section key={s.key} id={`cat-${s.key}`} className="scroll-mt-28">
                  <div className="mb-6 flex items-baseline gap-3">
                    <h2 className="text-2xl sm:text-3xl">{s.title}</h2>
                    <span className="text-sm text-muted-foreground">
                      {s.items.length} {s.items.length === 1 ? "product" : "products"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
                    {s.items.map((product, i) => (
                      <ProductCard key={product.slug} product={product} index={i} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
