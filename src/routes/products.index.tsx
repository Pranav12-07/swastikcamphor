import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCatalog } from "@/lib/catalog";
import { withServerProducts } from "@/lib/catalog-ssr";
import { listPublicProducts, type PublicProduct } from "@/lib/products.functions";
import { PackCard, type PackRef } from "@/components/PackCard";
import { useReveal } from "@/hooks/use-reveal";
import { canonical, canonicalLink, seoMeta } from "@/lib/seo";
import { isTwinPack, pctOff, twinSavings, type SizeOption } from "@/data/products";
import { useI18n } from "@/lib/i18n";

type FilterId = "twin" | "tablets" | "bhimseni" | "pouch";
type SortId = "recommended" | "low" | "high" | "saving";

const FILTERS: FilterId[] = ["twin", "tablets", "bhimseni", "pouch"];
const SORTS: SortId[] = ["recommended", "low", "high", "saving"];

export const Route = createFileRoute("/products/")({
  validateSearch: (search: Record<string, unknown>): { filter?: FilterId | undefined; sort?: SortId | undefined } => ({
    filter: FILTERS.includes(search["filter"] as FilterId) ? (search["filter"] as FilterId) : undefined,
    sort: SORTS.includes(search["sort"] as SortId) ? (search["sort"] as SortId) : undefined,
  }),
  head: () => ({
    meta: seoMeta({
      title: "Our Products | Pure Camphor Online | Swastik Camphor",
      description:
        "Shop Swastik 100% pure camphor tablets, Bhimseni camphor and refill pouches. Jars, Twin Packs and value packs with free shipping above ₹499.",
      path: "/products",
    }),
    links: canonicalLink("/products"),
    scripts: [{ type: "application/ld+json", children: JSON.stringify(itemListJsonLd) }],
  }),
  loader: () => listPublicProducts().catch(() => [] as PublicProduct[]),
  component: ProductsPage,
});

// The three active products, for search engines.
const itemListJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Camphor Tablets", url: canonical("/products/camphor-tablets") },
    { "@type": "ListItem", position: 2, name: "Bhimseni Camphor", url: canonical("/products/bhimseni-camphor") },
    {
      "@type": "ListItem",
      position: 3,
      name: "Camphor Tablets Refill Pouch",
      url: canonical("/products/camphor-tablets-refill-pouch"),
    },
  ],
};

const FILTER_META: Record<FilterId, { label: string; match: (pk: PackRef) => boolean }> = {
  twin: { label: "Twin Pack Offers", match: (pk) => isTwinPack(pk.option) },
  tablets: {
    label: "Camphor Tablets",
    match: (pk) => pk.product.slug === "camphor-tablets" && !isTwinPack(pk.option),
  },
  bhimseni: {
    label: "Bhimseni Camphor",
    match: (pk) => pk.product.slug === "bhimseni-camphor" && !isTwinPack(pk.option),
  },
  pouch: { label: "Refill Pouch", match: (pk) => pk.product.slug === "camphor-tablets-refill-pouch" },
};

const packSaving = (pk: PackRef) =>
  isTwinPack(pk.option) ? (twinSavings(pk.product, pk.option) ?? 0) : pctOff(pk.option.mrp, pk.option.price);

function sortPacks(list: PackRef[], sort: SortId): PackRef[] {
  if (sort === "low") return [...list].sort((a, b) => a.option.price - b.option.price);
  if (sort === "high") return [...list].sort((a, b) => b.option.price - a.option.price);
  if (sort === "saving") return [...list].sort((a, b) => packSaving(b) - packSaving(a));
  return list;
}

function ProductsPage() {
  const serverProducts = Route.useLoaderData();
  const { filter, sort } = Route.useSearch();
  const navigate = useNavigate({ from: "/products/" });
  const { products: liveProducts, loading } = useCatalog();
  const products = withServerProducts(liveProducts, serverProducts);
  const { t } = useI18n();
  useReveal();

  const activeFilter: FilterId | "all" = filter ?? "all";
  const activeSort: SortId = sort ?? "recommended";

  const setSearch = (next: { filter?: FilterId | undefined; sort?: SortId | undefined }) => {
    void navigate({
      search: ((prev: Record<string, unknown>) => ({ ...prev, ...next })) as never,
      replace: true,
    });
  };

  // /products#twin-packs opens with the Twin Pack filter selected.
  useEffect(() => {
    if (window.location.hash === "#twin-packs" && !filter) setSearch({ filter: "twin" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Every pack as its own card. "All" order: 7 Twin Packs (Tablets by weight,
  // then Bhimseni by weight), then Refill Pouch, Tablets jars, Bhimseni jars.
  const allPacks: PackRef[] = products.flatMap((p) =>
    (p.sizeOptions ?? []).map((o) => ({ product: p, option: o })),
  );
  const rank = (pk: PackRef): [number, number] => {
    const slug = pk.product.slug;
    const grams = pk.option.grams ?? 0;
    if (isTwinPack(pk.option)) return [slug === "camphor-tablets" ? 0 : 1, grams];
    if (slug === "camphor-tablets-refill-pouch") return [2, grams];
    if (slug === "camphor-tablets") return [3, grams];
    if (slug === "bhimseni-camphor") return [4, grams];
    return [5, grams];
  };
  const recommended = [...allPacks].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    return ra[0] - rb[0] || ra[1] - rb[1];
  });

  const filtered =
    activeFilter === "all" ? recommended : recommended.filter((pk) => FILTER_META[activeFilter].match(pk));
  const shown = sortPacks(filtered, activeSort);

  const countFor = (id: FilterId | "all") =>
    id === "all" ? recommended.length : recommended.filter((pk) => FILTER_META[id].match(pk)).length;

  const chips: { id: FilterId | "all"; label: string }[] = [
    { id: "all", label: "All" },
    ...FILTERS.map((id) => ({ id, label: FILTER_META[id].label })),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-16">
      <header className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Swastik Camphor</p>
        <h1 className="mt-2 text-3xl md:text-4xl">Our Products</h1>
        <div className="gold-rule mt-4 w-20" />
        <p className="mt-4 text-muted-foreground">
          100% pure camphor, made in Hyderabad since 1976. Choose your pack — every size has its own price, photo and
          savings.
        </p>
      </header>

      <div className="sticky top-[60px] z-20 -mx-4 mt-6 bg-background/95 px-4 py-3 backdrop-blur lg:top-[76px]">
        <div className="flex items-center justify-between gap-3">
          <ul
            aria-label={t("Filter products")}
            className="scrollbar-hide -mr-4 flex flex-1 gap-2 overflow-x-auto pr-8 [mask-image:linear-gradient(to_right,black_85%,transparent)]"
          >
            {chips.map((chip) => {
              const active = activeFilter === chip.id;
              return (
                <li key={chip.id} className="shrink-0">
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSearch({ filter: chip.id === "all" ? undefined : chip.id })}
                    className={`min-h-9 whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-colors ${
                      active
                        ? "bg-primary font-semibold text-primary-foreground"
                        : chip.id === "twin"
                          ? "bg-gold-soft font-semibold text-maroon-deep hover:bg-gold/60"
                          : "border border-gold/40 hover:border-primary/60 hover:bg-accent/15"
                    }`}
                  >
                    {t(chip.label)}
                    <span className={`ml-1.5 text-xs ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {countFor(chip.id)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <label className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
            <span className="hidden sm:inline">{t("Sort")}</span>
            <select
              value={activeSort}
              onChange={(e) => setSearch({ sort: e.target.value === "recommended" ? undefined : (e.target.value as SortId) })}
              className="min-h-9 rounded-full border border-gold/40 bg-card px-3 py-1.5 text-sm text-foreground"
            >
              <option value="recommended">{t("Recommended")}</option>
              <option value="low">{t("Price: low to high")}</option>
              <option value="high">{t("Price: high to low")}</option>
              <option value="saving">{t("Biggest saving")}</option>
            </select>
          </label>
        </div>
      </div>

      {activeFilter !== "all" && (
        <p className="mt-6 text-sm text-muted-foreground">
          {shown.length} {t("products")}
        </p>
      )}

      {loading && products.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading products…</p>
      ) : shown.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-gold/25 p-8 text-center">
          <p className="text-muted-foreground">{t("No products here right now.")}</p>
          <button
            type="button"
            onClick={() => setSearch({ filter: undefined, sort: undefined })}
            className="mt-4 min-h-11 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground"
          >
            {t("All products")}
          </button>
        </div>
      ) : (
        <div
          id={activeFilter === "twin" ? "twin-packs" : undefined}
          className="mt-6 grid scroll-mt-32 grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4"
        >
          {shown.map((pk) => (
            <PackCard key={`${pk.product.slug}__${pk.option.label}`} pack={pk} />
          ))}
        </div>
      )}
    </div>
  );
}
