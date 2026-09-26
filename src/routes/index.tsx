import { canonical, canonicalLink } from "@/lib/seo";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Flame, Leaf, Pause, Play, ShieldCheck, Tag, Truck } from "lucide-react";
import hero from "@/assets/hero.jpg";
import heroDiyaLoop from "@/assets/hero-diya-loop.mp4.asset.json";
import heroDiyaLoopWebm from "@/assets/hero-diya-loop.webm.asset.json";
import about from "@/assets/about.jpg";
import { ProductCard } from "@/components/ProductCard";
import { TraditionVideo } from "@/components/TraditionVideo";
import { PromoCarousel } from "@/components/PromoCarousel";
import { CategoryTiles } from "@/components/CategoryTiles";
import { TrustStrip } from "@/components/TrustStrip";

import { useCatalog } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { site } from "@/config/site";
import { useReveal } from "@/hooks/use-reveal";
import { useBanners } from "@/hooks/use-banners";
import { listBlogs } from "@/lib/blog.functions";
import { listPublicProducts, type PublicProduct } from "@/lib/products.functions";
import { withServerProducts } from "@/lib/catalog-ssr";
import { formatINR, isTwinPack, pctOff, per100g, twinSavings, type SizeOption } from "@/data/products";

type PackRef = {
  product: { slug: string; name: string; image: string; sizeOptions?: SizeOption[] };
  option: SizeOption;
};

/** Card for one pack option (homepage Twin Pack Offers / Popular packs). */
function PackCard({ pack, bestValue }: { pack: PackRef; bestValue?: boolean }) {
  const { product, option } = pack;
  const { t } = useI18n();
  const { add } = useCart();
  const navigate = useNavigate();
  const off = pctOff(option.mrp, option.price);
  const save = twinSavings(product, option);
  const rate = per100g(option);
  const outOfStock = option.stock != null && option.stock <= 0;

  const buyNow = () => {
    add(product.slug, option.label, 1, { skipUpsell: true });
    void navigate({ to: "/checkout" });
  };

  return (
    <div className="card-premium group relative flex flex-col overflow-hidden">
      {bestValue && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground shadow">
          {t("Best value")}
        </span>
      )}
      {off > 0 && (
        <span className="absolute right-2 top-2 z-10 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground shadow">
          {off}% {t("OFF")}
        </span>
      )}
      <Link
        to="/products/$slug"
        params={{ slug: product.slug }}
        search={{ size: option.label }}
        aria-label={`${product.name} – ${option.label}`}
        className="block"
      >
        <img
          src={option.image ?? product.image}
          alt={`${product.name} – ${option.label}`}
          loading="lazy"
          className="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </Link>
      <div className="flex flex-1 flex-col p-3 md:p-4">
        <h3 className="truncate font-body text-[13px] font-semibold leading-snug md:text-sm">{product.name}</h3>
        <p className="mt-0.5 line-clamp-2 min-h-8 text-xs text-muted-foreground">{option.label}</p>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          <span className="text-base font-bold">{formatINR(option.price)}</span>
          {option.mrp != null && option.mrp > option.price && (
            <span className="text-xs text-muted-foreground line-through">{formatINR(option.mrp)}</span>
          )}
        </div>
        {save != null ? (
          <p className="mt-1 text-xs font-medium text-emerald-700">
            {t("Save")} {formatINR(save)} {t("vs 2 single jars")}
          </p>
        ) : rate != null ? (
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {formatINR(rate)} {t("per 100 g")}
          </p>
        ) : null}
        <div className="mt-3 flex flex-col gap-2 lg:flex-row">
          <button
            type="button"
            disabled={outOfStock}
            onClick={() => add(product.slug, option.label)}
            className="h-11 w-full whitespace-nowrap rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5 disabled:opacity-50 lg:flex-1"
          >
            {outOfStock ? t("Out of stock") : t("Add to cart")}
          </button>
          <button
            type="button"
            disabled={outOfStock}
            onClick={buyNow}
            className="h-11 w-full whitespace-nowrap rounded-full border border-gold/50 px-4 text-xs font-semibold transition-colors hover:bg-accent/15 disabled:opacity-50 lg:flex-1"
          >
            {t("Buy now")}
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    links: [
      ...canonicalLink("/"),
      // The hero poster is the largest image on screen — load it with priority.
      { rel: "preload", as: "image", href: hero },
    ],
    meta: [
      { property: "og:url", content: canonical("/") },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Swastik Camphor – 100% Pure Camphor for Pooja, Aarti and Fresh Air" },
      {
        name: "description",
        content:
          "Buy 100% pure camphor tablets and Bhimseni camphor online from Swastik Camphor, Hyderabad. Trusted since 1968. Free shipping above ₹499.",
      },
      { property: "og:title", content: "Swastik Camphor – 100% Pure Camphor for Pooja, Aarti and Fresh Air" },
      {
        property: "og:description",
        content:
          "Buy 100% pure camphor tablets and Bhimseni camphor online from Swastik Camphor, Hyderabad. Trusted since 1968. Free shipping above ₹499.",
      },
    ],
  }),
  // Products are loaded on the server too, so they are in the page HTML for Google.
  loader: async () => {
    const [posts, products] = await Promise.all([
      listBlogs(),
      listPublicProducts().catch(() => [] as PublicProduct[]),
    ]);
    return { posts, products };
  },
  errorComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-display text-2xl">Something went wrong loading the page</h1>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-display text-2xl">Page not found</h1>
    </div>
  ),
  component: Index,
});

const values = [
  { icon: ShieldCheck, title: "100% Purity", text: "No chemicals, no fillers — only pure camphor." },
  { icon: Flame, title: "Clean Burn", text: "Bright, steady flame that leaves no black residue." },
  { icon: Leaf, title: "Long Lasting", text: "Consistent burning performance." },
  { icon: Truck, title: "Pan-India Delivery", text: "Dispatched in 1-2 days, delivered across India." },
];

/** All 9 single packs in the homepage carousel — Refill Pouch first, then Tablets small→large, then Bhimseni small→large. */
const SINGLE_PACKS: { slug: string; packHint: string }[] = [
  { slug: "camphor-tablets-refill-pouch", packHint: "100 g" },
  { slug: "camphor-tablets", packHint: "50 g" },
  { slug: "camphor-tablets", packHint: "100 g" },
  { slug: "camphor-tablets", packHint: "250 g" },
  { slug: "camphor-tablets", packHint: "500 g" },
  { slug: "bhimseni-camphor", packHint: "50 g" },
  { slug: "bhimseni-camphor", packHint: "100 g" },
  { slug: "bhimseni-camphor", packHint: "250 g" },
  { slug: "bhimseni-camphor", packHint: "450 g" },
];

const CAROUSEL_INTERVAL = 5000;
const CAROUSEL_RESUME_AFTER = 10000;

/** Auto-scrolling single-pack carousel: 2 visible on phones, 4 on desktop, all cards in the HTML. */
function SinglePackCarousel({ packs }: { packs: PackRef[] }) {
  const { t } = useI18n();
  const [page, setPage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [pageSize, setPageSize] = useState(2);
  const touchX = useRef<number | null>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setPageSize(mq.matches ? 4 : 2);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const pages = Math.max(1, Math.ceil(packs.length / pageSize));
  const multi = pages > 1;
  const go = useCallback((p: number) => setPage(((p % pages) + pages) % pages), [pages]);

  useEffect(() => {
    if (page >= pages) setPage(0);
  }, [pages, page]);

  // Pause autoplay for a while after any manual interaction.
  const interact = useCallback(() => {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), CAROUSEL_RESUME_AFTER);
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!multi || paused || reduced || document.hidden) return;
    const timer = setInterval(() => setPage((p) => (p + 1) % pages), CAROUSEL_INTERVAL);
    return () => clearInterval(timer);
  }, [multi, paused, pages]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={t("Popular packs")}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={interact}
    >
      <div
        className="group relative overflow-hidden"
        onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          if (touchX.current == null || !multi) return;
          const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
          if (Math.abs(dx) > 40) {
            go(dx < 0 ? page + 1 : page - 1);
            interact();
          }
          touchX.current = null;
        }}
      >
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${page * 100}%)` }}
        >
          {packs.map((pk, i) => (
            <div
              key={`${pk.product.slug}__${pk.option.label}`}
              className="w-1/2 shrink-0 px-1.5 sm:px-3 lg:w-1/4"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${packs.length}`}
            >
              <PackCard pack={pk} />
            </div>
          ))}
        </div>

        {multi && (
          <>
            <button
              type="button"
              aria-label={t("Previous packs")}
              onClick={() => { go(page - 1); interact(); }}
              className="absolute left-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-background/85 text-foreground shadow transition hover:opacity-100 sm:grid sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label={t("Next packs")}
              onClick={() => { go(page + 1); interact(); }}
              className="absolute right-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-background/85 text-foreground shadow transition hover:opacity-100 sm:grid sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {multi && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: pages }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${t("Go to page")} ${i + 1}`}
              aria-current={i === page}
              onClick={() => { go(i); interact(); }}
              className={`h-2 rounded-full transition-all ${i === page ? "w-6 bg-primary" : "w-2 bg-muted-foreground/40 hover:bg-muted-foreground/70"}`}
            />
          ))}
          <button
            type="button"
            aria-label={paused ? t("Play carousel") : t("Pause carousel")}
            onClick={() => {
              if (resumeTimer.current) clearTimeout(resumeTimer.current);
              setPaused((p) => !p);
            }}
            className="ml-2 grid h-8 w-8 place-items-center rounded-full border border-gold/40 text-muted-foreground transition-colors hover:bg-accent/15"
          >
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}

function Index() {
  const { posts: allPosts, products: serverProducts } = Route.useLoaderData();
  const posts = allPosts.slice(0, 3);
  const { products: liveProducts } = useCatalog();
  const products = withServerProducts(liveProducts, serverProducts);
  const { t } = useI18n();

  // Twin Pack Offers: featured Twin Packs, Tablets first, up to 4.
  const twinPacks: PackRef[] = products
    .flatMap((p) => (p.sizeOptions ?? []).filter((o) => o.featured && isTwinPack(o)).map((o) => ({ product: p, option: o })))
    .sort((a, b) => (a.product.slug === "camphor-tablets" ? -1 : b.product.slug === "camphor-tablets" ? 1 : 0))
    .slice(0, 4);

  // Single-pack carousel: all 9 single packs in a fixed order.
  const popularPacks: PackRef[] = SINGLE_PACKS.flatMap((pick) => {
    const product = products.find((p) => p.slug === pick.slug);
    if (!product) return [];
    const option = (product.sizeOptions ?? []).find(
      (o) => !isTwinPack(o) && o.label.startsWith(pick.packHint),
    );
    return option ? [{ product, option }] : [];
  });

  // "Best value" = the Twin Pack with the lowest per-100 g price.
  let bestValueKey: string | null = null;
  let bestRate = Infinity;
  for (const pk of twinPacks) {
    const rate = per100g(pk.option);
    if (rate != null && rate < bestRate) {
      bestRate = rate;
      bestValueKey = `${pk.product.slug}__${pk.option.label}`;
    }
  }
  const heroBanners = useBanners("hero");
  const banner = heroBanners[0];
  useReveal();

  return (
    <>
      <section className="relative isolate overflow-hidden">
        {banner?.image_url ? (
          <img
            src={banner.image_url}
            alt="A camphor flame glowing above pure camphor tablets during aarti"
            className="animate-ken-burns absolute inset-0 -z-10 h-full w-full object-cover"
          />
        ) : (
          <video
            className="absolute inset-0 -z-10 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={hero}
            aria-label="A gently flickering camphor flame in a brass diya"
          >
            <source src={heroDiyaLoopWebm.url} type="video/webm" />
            <source src={heroDiyaLoop.url} type="video/mp4" />
          </video>
        )}

        <div
          className="absolute inset-0 -z-10"
          style={{ background: "linear-gradient(100deg, oklch(0.2 0.06 28 / 0.92), oklch(0.2 0.06 28 / 0.45))" }}
          aria-hidden="true"
        />
        <div className="mx-auto flex max-h-[70svh] min-h-[52svh] max-w-7xl flex-col justify-center px-4 py-8 md:max-h-none md:min-h-0 md:px-8 md:py-36">
          <p className="animate-rise-in text-xs uppercase tracking-[0.34em] text-gold-soft underline underline-offset-4">
            ESTD 1968
          </p>
          <h1
            className="animate-rise-in text-shine mt-3 text-[clamp(2.125rem,9.5vw,4.5rem)] uppercase leading-[1.05] md:mt-4"
            style={{ animationDelay: "80ms" }}
          >
            {banner ? (
              banner.title
            ) : (
              <>
                <strong className="block whitespace-nowrap font-bold">{t("PURE CAMPHOR")}</strong>
                <strong className="block whitespace-nowrap font-bold">{t("PURE TRADITION")}</strong>
              </>
            )}
          </h1>
          <p
            className="animate-rise-in mt-4 max-w-xl text-base leading-relaxed text-gold-soft/85 md:mt-6 md:text-lg"
            style={{ animationDelay: "160ms" }}
          >
            {banner?.subtitle ?? t("Swastik 100% pure camphor. Made in Hyderabad, trusted since 1968.")}
          </p>
          <div
            className="animate-rise-in mt-6 flex flex-col gap-3 sm:flex-row md:mt-9"
            style={{ animationDelay: "240ms" }}
          >
            {banner?.link_url ? (
              <a
                href={banner.link_url}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-accent px-7 text-sm font-semibold text-accent-foreground transition-transform duration-300 hover:-translate-y-1 sm:w-auto"
              >
                {banner.button_text || t("Shop Now")}
              </a>
            ) : (
              <Link
                to="/products"
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-accent px-7 text-sm font-semibold text-accent-foreground transition-transform duration-300 hover:-translate-y-1 sm:w-auto"
              >
                {t("Shop Now")}
              </Link>
            )}
            <Link
              to="/products"
              search={{ filter: "twin" }}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-gold/60 px-7 text-sm font-semibold text-gold-soft transition-colors duration-300 hover:bg-gold/15 sm:w-auto"
            >
              <Tag className="h-4 w-4" aria-hidden="true" />
              {t("Twin Pack Offers")}
            </Link>
          </div>
        </div>
        <div
          className="pointer-events-none absolute -bottom-16 right-8 h-56 w-56 rounded-full opacity-40 blur-3xl animate-float-slow"
          style={{ background: "var(--gradient-gold)" }}
          aria-hidden="true"
        />
      </section>

      <CategoryTiles />

      {twinPacks.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-20">
          <div className="reveal flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("Twin Pack Offers")}</p>
              <h2 className="mt-2 text-3xl md:text-4xl">{t("Buy 2 and save more")}</h2>
              <div className="gold-rule rule-animate mt-4 w-20" />
            </div>
            <Link
              to="/products"
              hash="twin-packs"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("View all offers")}
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-6 md:mt-8 lg:grid-cols-4">
            {twinPacks.map((pk) => (
              <PackCard
                key={`${pk.product.slug}__${pk.option.label}`}
                pack={pk}
                bestValue={bestValueKey === `${pk.product.slug}__${pk.option.label}`}
              />
            ))}
          </div>
        </section>
      )}

      {popularPacks.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-12 md:px-8 md:pb-20">
          <div className="reveal flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("Popular packs")}</p>
              <h2 className="mt-2 text-3xl md:text-4xl">{t("Camphor for every ritual")}</h2>
              <div className="gold-rule rule-animate mt-4 w-20" />
            </div>
            <Link to="/products" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              {t("View all products →")}
            </Link>
          </div>
          <div className="mt-6 md:mt-8">
            <SinglePackCarousel packs={popularPacks} />
          </div>
        </section>
      )}

      {popularPacks.length === 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-12 pt-4 md:px-8 md:pb-20 md:pt-8">
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
            {products.map((p, i) => (
              <ProductCard key={p.slug} product={p} index={i} />
            ))}
          </div>
        </section>
      )}

      <TrustStrip />

      <PromoCarousel />

      <section className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v, i) => (
            <div key={v.title} className="card-premium reveal reveal-zoom p-6" style={{ transitionDelay: `${i * 110}ms` }}>
              <v.icon className="h-6 w-6 text-accent transition-transform duration-500 group-hover:scale-110" aria-hidden="true" />
              <h2 className="mt-4 font-display text-lg">{t(v.title)}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t(v.text)}</p>
            </div>

          ))}
        </div>
      </section>

      <TraditionVideo />



      <section className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="reveal reveal-left overflow-hidden rounded-3xl">
            <img
              src={about}
              alt="Traditional temple aarti performed with a camphor flame"
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out hover:scale-105"
            />
          </div>
          <div className="reveal reveal-right">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("About us")}</p>
            <h2 className="mt-2 text-3xl md:text-4xl">{t("Rooted in tradition, refined by quality")}</h2>
            <div className="gold-rule rule-animate mt-4 w-20" />

            <p className="mt-5 leading-relaxed text-muted-foreground">
              At {site.name}, we craft camphor that is 100% pure, natural and free from harmful chemicals.
              Every batch is quality checked so your prayers, meditation and home rituals are accompanied by a
              clean, fragrant and safe flame.
            </p>
            <Link
              to="/about"
              className="mt-6 inline-flex rounded-full border border-gold/50 px-6 py-2.5 text-sm font-medium transition-colors hover:bg-accent/15"
            >
              {t("Read our story")}
            </Link>
          </div>
        </div>
      </section>

      {posts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-20">
          <h2 className="reveal font-display text-3xl">{t("Latest camphor guides")}</h2>
          <div className="gold-rule mt-3 w-16" />
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {posts.map((post, i) => (
              <article key={post.slug} className="card-premium reveal group overflow-hidden" style={{ transitionDelay: `${i * 80}ms` }}>
                <Link to="/blogs/$slug" params={{ slug: post.slug }} className="block">
                  {post.cover_image && (
                    <div className="aspect-16/9 overflow-hidden">
                      <img
                        src={post.cover_image}
                        alt={post.cover_alt ?? post.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      {[post.category, post.read_time].filter(Boolean).join(" • ")}
                    </p>
                    <h3 className="mt-3 font-display text-lg">{post.title}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
                  </div>
                </Link>
              </article>
            ))}
          </div>
          <Link to="/blogs" className="mt-8 inline-flex rounded-full border border-gold/50 px-6 py-2.5 text-sm font-medium transition-colors hover:bg-accent/15">
            {t("Read all guides")}
          </Link>
        </section>
      )}
    </>
  );
}
