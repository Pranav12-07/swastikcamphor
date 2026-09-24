import { canonical, canonicalLink } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ProductCard } from "@/components/ProductCard";
import { useCatalog } from "@/lib/catalog";
import { useReveal } from "@/hooks/use-reveal";

export const Route = createFileRoute("/shop")({
  head: () => ({
    links: canonicalLink("/shop"),
    meta: [
      { property: "og:url", content: canonical("/shop") },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Shop Pure Camphor Online — Swastik Camphor" },
      {
        name: "description",
        content:
          "Shop 100% pure camphor tablets, Bhimseni camphor, cones and pooja gift packs online. Free shipping above ₹499 across India.",
      },
      { property: "og:title", content: "Shop — Swastik Camphor" },
      { property: "og:description", content: "Buy pure camphor online with free shipping above ₹499." },
    ],
  }),
  component: Shop,
});

function Shop() {
  useReveal();
  const { products, categories } = useCatalog();
  const [active, setActive] = useState("All");
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("category");
    if (c) setActive(c);
  }, []);
  const [sort, setSort] = useState<"popular" | "low" | "high">("popular");

  const filters = useMemo(
    () => [{ slug: "All", name: "All" }, ...categories.map((c) => ({ slug: c.slug, name: c.name }))],
    [categories],
  );

  const visible = useMemo(() => {
    const list = products.filter((p) => active === "All" || p.category === active);
    if (sort === "low") return [...list].sort((a, b) => a.price - b.price);
    if (sort === "high") return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [products, active, sort]);

  return (
    <>
      <PageHeader
        eyebrow="Shop"
        title="Bring home the purest camphor"
        subtitle="Free shipping on orders above ₹499. Use code SWASTIK10 for 10% off your first order."
      />

      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <ul className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <li key={f.slug}>
                <button
                  type="button"
                  onClick={() => setActive(f.slug)}
                  aria-pressed={active === f.slug}
                  className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                    active === f.slug
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-gold/40 hover:bg-accent/15"
                  }`}
                >
                  {f.name}
                </button>
              </li>
            ))}
          </ul>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="rounded-full border border-gold/40 bg-card px-3 py-1.5 text-sm text-foreground"
            >
              <option value="popular">Most popular</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
            </select>
          </label>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((p, i) => (
            <ProductCard key={p.slug} product={p} index={i} />
          ))}
        </div>
        {visible.length === 0 && (
          <p className="py-16 text-center text-muted-foreground">No products in this category yet.</p>
        )}
      </div>
    </>
  );
}