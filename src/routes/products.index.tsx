import { createFileRoute } from "@tanstack/react-router";
import { useCatalog } from "@/lib/catalog";
import { withServerProducts } from "@/lib/catalog-ssr";
import { listPublicProducts, type PublicProduct } from "@/lib/products.functions";
import { ProductCard } from "@/components/ProductCard";
import { useReveal } from "@/hooks/use-reveal";
import { canonicalLink, seoMeta } from "@/lib/seo";

export const Route = createFileRoute("/products/")({
  head: () => ({
    meta: seoMeta({
      title: "Our Products | Pure Camphor Online | Swastik Camphor",
      description:
        "Shop Swastik 100% pure camphor tablets, Bhimseni camphor and refill pouches. Jars, Twin Packs and value packs with free shipping above ₹499.",
      path: "/products",
    }),
    links: canonicalLink("/products"),
  }),
  loader: () => listPublicProducts().catch(() => [] as PublicProduct[]),
  component: ProductsPage,
});

type Section = { id: string; title: string; blurb: string; slugs: string[] };

const SECTIONS: Section[] = [
  {
    id: "camphor-tablets",
    title: "Swastik Camphor Tablets",
    blurb: "100% pure camphor tablets for daily pooja and aarti — jars from 50 g to 500 g and money-saving Twin Packs.",
    slugs: ["camphor-tablets"],
  },
  {
    id: "bhimseni-camphor",
    title: "Swastik Bhimseni Camphor",
    blurb: "Natural Bhimseni camphor crystals for pooja and enhancing air quality — jars from 50 g to 450 g and Twin Packs up to 900 g.",
    slugs: ["bhimseni-camphor"],
  },
  {
    id: "refill-pouches",
    title: "Refill Pouches",
    blurb: "Convenient pouches to refill your Swastik jar and keep tablets fresh.",
    slugs: ["camphor-tablets-refill-pouch"],
  },
];

function ProductsPage() {
  const serverProducts = Route.useLoaderData();
  const { products: liveProducts, loading } = useCatalog();
  const products = withServerProducts(liveProducts, serverProducts);
  useReveal();

  const known = new Set(SECTIONS.flatMap((s) => s.slugs));
  const extra = products.filter((p) => !known.has(p.slug));
  const sections = [
    ...SECTIONS.map((s) => ({
      ...s,
      items: products.filter((p) => s.slugs.includes(p.slug)),
    })),
    ...(extra.length
      ? [{ id: "more", title: "More from Swastik", blurb: "", slugs: extra.map((p) => p.slug), items: extra }]
      : []),
  ].filter((s) => s.items.length > 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-16">
      <header className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Swastik Camphor</p>
        <h1 className="mt-2 text-3xl md:text-4xl">Our Products</h1>
        <div className="gold-rule mt-4 w-20" />
        <p className="mt-4 text-muted-foreground">
          100% pure camphor, made in Hyderabad since 1968. Choose your pack — every size has its own price, photo and
          savings.
        </p>
      </header>

      {sections.length > 1 && (
        <nav
          aria-label="Product sections"
          className="sticky top-16 z-20 -mx-4 mt-6 flex gap-2 overflow-x-auto bg-background/95 px-4 py-3 backdrop-blur md:top-20"
        >
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="shrink-0 rounded-full border border-gold/40 px-4 py-1.5 text-sm transition-colors hover:border-primary/60 hover:bg-accent/15"
            >
              {s.title}
            </a>
          ))}
        </nav>
      )}

      {loading && products.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading products…</p>
      ) : sections.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-gold/25 p-8 text-center">
          <p className="text-muted-foreground">No products available right now. Please check back soon.</p>
        </div>
      ) : (
        sections.map((s, idx) => (
          <section key={s.id} id={s.id} className={`scroll-mt-32 ${idx === 0 ? "mt-8" : "mt-14"}`}>
            <h2 className="font-display text-2xl md:text-3xl">{s.title}</h2>
            {s.blurb && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{s.blurb}</p>}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
              {s.items.map((p, i) => (
                <ProductCard key={p.slug} product={p} index={i} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
