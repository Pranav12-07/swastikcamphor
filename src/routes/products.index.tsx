import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCatalog } from "@/lib/catalog";
import { withServerProducts } from "@/lib/catalog-ssr";
import { listPublicProducts, type PublicProduct } from "@/lib/products.functions";
import { ProductCard } from "@/components/ProductCard";
import { useReveal } from "@/hooks/use-reveal";
import { canonicalLink, seoMeta } from "@/lib/seo";
import { defaultSizeOption, formatINR, isTwinPack, pctOff, twinSavings, type SizeOption } from "@/data/products";
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

const FILTER_META: Record<FilterId, { label: string; slugs: string[] }> = {
  twin: { label: "Twin Pack Offers", slugs: [] },
  tablets: { label: "Camphor Tablets", slugs: ["camphor-tablets"] },
  bhimseni: { label: "Bhimseni Camphor", slugs: ["bhimseni-camphor"] },
  pouch: { label: "Refill Pouch", slugs: ["camphor-tablets-refill-pouch"] },
};

type CardProduct = Parameters<typeof ProductCard>[0]["product"];

const cardPrice = (p: CardProduct) => defaultSizeOption(p)?.price ?? p.price;
const cardSaving = (p: CardProduct) => {
  const opt = defaultSizeOption(p);
  return opt ? pctOff(opt.mrp, opt.price) : 0;
};

function sortProducts(list: CardProduct[], sort: SortId): CardProduct[] {
  if (sort === "low") return [...list].sort((a, b) => cardPrice(a) - cardPrice(b));
  if (sort === "high") return [...list].sort((a, b) => cardPrice(b) - cardPrice(a));
  if (sort === "saving") return [...list].sort((a, b) => cardSaving(b) - cardSaving(a));
  return list;
}

type TwinRef = { product: CardProduct; option: SizeOption };

function sortTwins(list: TwinRef[], sort: SortId): TwinRef[] {
  if (sort === "low") return [...list].sort((a, b) => a.option.price - b.option.price);
  if (sort === "high") return [...list].sort((a, b) => b.option.price - a.option.price);
  if (sort === "saving") return [...list].sort((a, b) => pctOff(b.option.mrp, b.option.price) - pctOff(a.option.mrp, a.option.price));
  return list;
}

function TwinCard({ product, option }: TwinRef) {
  const { t } = useI18n();
  const off = pctOff(option.mrp, option.price);
  const save = twinSavings(product, option);
  const outOfStock = option.stock != null && option.stock <= 0;
  return (
    <Link
      to="/products/$slug"
      params={{ slug: product.slug }}
      search={{ size: option.label }}
      className={`card-premium group relative block overflow-hidden ${outOfStock ? "opacity-60" : ""}`}
    >
      {off > 0 && (
        <span className="absolute right-2 top-2 z-10 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground shadow">
          {off}% {t("OFF")}
        </span>
      )}
      <img
        src={option.image ?? product.image}
        alt={`${product.name} – ${option.label}`}
        loading="lazy"
        className="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="p-3 md:p-4">
        <h3 className="truncate font-body text-[13px] font-semibold md:text-sm">{product.name}</h3>
        <p className="mt-0.5 line-clamp-2 min-h-8 text-xs text-muted-foreground">{option.label}</p>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          <span className="text-base font-bold">{formatINR(option.price)}</span>
          {option.mrp != null && option.mrp > option.price && (
            <span className="text-xs text-muted-foreground line-through">{formatINR(option.mrp)}</span>
          )}
        </div>
        {save != null && (
          <p className="mt-1 text-xs font-medium text-emerald-700">
            {t("Save")} {formatINR(save)} {t("vs 2 single jars")}
          </p>
        )}
        {outOfStock && <p className="mt-1 text-xs font-semibold text-destructive">{t("Out of stock")}</p>}
      </div>
    </Link>
  );
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

  const setSearch = (next: { filter?: FilterId; sort?: SortId }) => {
    void navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, ...next }),
      replace: true,
    });
  };

  // Every in-stock Twin Pack across the catalogue, Tablets first.
  const twinPacks: TwinRef[] = products
    .flatMap((p) =>
      (p.sizeOptions ?? [])
        .filter((o) => isTwinPack(o))
        .map((o) => ({ product: p, option: o })),
    )
    .sort((a, b) => (a.product.slug === "camphor-tablets" ? -1 : b.product.slug === "camphor-tablets" ? 1 : 0));

  const known = new Set(SECTIONS.flatMap((s) => s.slugs));
  const extra = products.filter((p) => !known.has(p.slug));
  const sections = [
    ...SECTIONS.map((s) => ({
      ...s,
      items: sortProducts(products.filter((p) => s.slugs.includes(p.slug)), activeSort),
    })),
    ...(extra.length
      ? [{ id: "more", title: "More from Swastik", blurb: "", slugs: extra.map((p) => p.slug), items: sortProducts(extra, activeSort) }]
      : []),
  ].filter((s) => s.items.length > 0);

  const countFor = (id: FilterId | "all") =>
    id === "all"
      ? products.length + twinPacks.length
      : id === "twin"
        ? twinPacks.length
        : products.filter((p) => FILTER_META[id].slugs.includes(p.slug)).length;

  const chips: { id: FilterId | "all"; label: string }[] = [
    { id: "all", label: "All" },
    ...FILTERS.map((id) => ({ id, label: FILTER_META[id].label })),
  ];

  const filteredSections =
    activeFilter === "all" ? sections : sections.filter((s) => FILTER_META[activeFilter as FilterId]?.slugs.some((slug) => s.slugs.includes(slug)));
  const sortedTwins = sortTwins(twinPacks, activeSort);
  const isEmpty = activeFilter !== "all" && activeFilter !== "twin" && filteredSections.length === 0;

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

      <div className="sticky top-[60px] z-20 -mx-4 mt-6 bg-background/95 px-4 py-3 backdrop-blur xl:top-[76px]">
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

      {(activeFilter === "all" || activeFilter === "twin") && sortedTwins.length > 0 && (
        <section id="twin-packs" className="mt-10 scroll-mt-32">
          <h2 className="font-display text-2xl md:text-3xl">{t("Twin Pack Offers")}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {t("Buy 2 and save more, plus an extra ₹50 off on orders ₹500+.")}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
            {sortedTwins.map(({ product, option }) => (
              <TwinCard key={`${product.slug}__${option.label}`} product={product} option={option} />
            ))}
          </div>
        </section>
      )}

      {loading && products.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading products…</p>
      ) : isEmpty || (activeFilter === "all" && sections.length === 0) ? (
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
        filteredSections.map((s) => (
          <section key={s.id} id={s.id} className="mt-14 scroll-mt-32">
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
