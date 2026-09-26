import { canonical, canonicalLink } from "@/lib/seo";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Flame, Leaf, ShieldCheck, Truck } from "lucide-react";
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
import { useI18n } from "@/lib/i18n";
import { site } from "@/config/site";
import { useReveal } from "@/hooks/use-reveal";
import { useBanners } from "@/hooks/use-banners";
import { listBlogs } from "@/lib/blog.functions";
import { listPublicProducts, type PublicProduct } from "@/lib/products.functions";
import { withServerProducts } from "@/lib/catalog-ssr";
import { formatINR, isTwinPack, pctOff, per100g, twinSavings, type SizeOption } from "@/data/products";

type PackRef = { product: PublicProduct; option: SizeOption };

/** Card for one pack option (homepage Twin Pack Offers / Popular packs). */
function PackCard({ pack, bestValue }: { pack: PackRef; bestValue?: boolean }) {
  const { product, option } = pack;
  const off = pctOff(option.mrp, option.price);
  const save = twinSavings(product, option);
  return (
    <Link
      to="/products/$slug"
      params={{ slug: product.slug }}
      search={{ size: option.label }}
      className="card-premium group relative block overflow-hidden"
    >
      {bestValue && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground shadow">
          Best value
        </span>
      )}
      {off > 0 && (
        <span className="absolute right-2 top-2 z-10 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground shadow">
          {off}% OFF
        </span>
      )}
      <img
        src={option.image ?? product.image}
        alt={`${product.name} – ${option.label}`}
        loading="lazy"
        className="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="p-4">
        <h3 className="font-body text-sm font-semibold leading-snug">{product.name}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{option.label}</p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className="text-base font-semibold">{formatINR(option.price)}</span>
          {option.mrp != null && option.mrp > option.price && (
            <span className="text-xs text-muted-foreground line-through">{formatINR(option.mrp)}</span>
          )}
        </div>
        {save != null && (
          <p className="mt-1 text-xs font-medium text-emerald-700">Save {formatINR(save)} vs 2 single jars</p>
        )}
      </div>
    </Link>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    links: canonicalLink("/"),
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

function Index() {
  const { posts: allPosts, products: serverProducts } = Route.useLoaderData();
  const posts = allPosts.slice(0, 3);
  const { products: liveProducts } = useCatalog();
  const products = withServerProducts(liveProducts, serverProducts);
  const { t } = useI18n();

  // Pack-level picks: options flagged "Feature on home" in admin.
  const featuredPacks: PackRef[] = products.flatMap((p) =>
    (p.sizeOptions ?? []).filter((o) => o.featured).map((o) => ({ product: p, option: o })),
  );
  const twinPacks = featuredPacks.filter((pk) => isTwinPack(pk.option));
  const singlePacks = featuredPacks.filter((pk) => !isTwinPack(pk.option));
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
  const popularPacks = [...twinPacks, ...singlePacks].slice(0, 4);
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
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 md:py-36">
          <p className="animate-rise-in text-xs uppercase tracking-[0.34em] text-gold-soft underline underline-offset-4">
            ESTD 1968
          </p>
          <h1
            className="animate-rise-in text-shine mt-4 max-w-3xl text-4xl leading-[1.1] md:text-6xl"
            style={{ animationDelay: "80ms" }}
          >
            {banner ? (
              banner.title
            ) : (
              <>
                <strong className="font-bold">SWASTIK 100% PURE</strong>
                <br />
                <strong className="font-bold">CAMPHOR</strong>
              </>
            )}
          </h1>
          <p
            className="animate-rise-in mt-6 max-w-xl text-base leading-relaxed text-gold-soft/85 md:text-lg"
            style={{ animationDelay: "160ms" }}
          >
            {banner?.subtitle ?? "Made in Hyderabad. Trusted since 1968."}
          </p>
          <div className="animate-rise-in mt-9 flex flex-wrap gap-3" style={{ animationDelay: "240ms" }}>
            {banner?.link_url ? (
              <a
                href={banner.link_url}
                className="rounded-full bg-accent px-7 py-3 text-sm font-semibold text-accent-foreground transition-transform duration-300 hover:-translate-y-1"
              >
                {banner.button_text || t("Shop Now")}
              </a>
            ) : (
              <Link
                to="/shop"
                className="rounded-full bg-accent px-7 py-3 text-sm font-semibold text-accent-foreground transition-transform duration-300 hover:-translate-y-1"
              >
                {t("Shop Now")}
              </Link>
            )}
            <Link
              to="/products"
              className="rounded-full border border-gold/60 px-7 py-3 text-sm font-semibold text-gold-soft transition-colors duration-300 hover:bg-gold/15"
            >
              {t("Explore Products")}
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
        <section className="mx-auto max-w-7xl px-4 pb-12 pt-4 md:px-8 md:pb-16 md:pt-8">
          <div className="reveal flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("Twin Pack Offers")}</p>
              <h2 className="mt-2 text-3xl md:text-4xl">{t("Buy 2 and save more")}</h2>
              <div className="gold-rule rule-animate mt-4 w-20" />
            </div>
            <Link to="/products" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              {t("View all products →")}
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
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
        <section className="mx-auto max-w-7xl px-4 pb-12 md:px-8 md:pb-16">
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
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
            {popularPacks.map((pk) => (
              <PackCard key={`${pk.product.slug}__${pk.option.label}`} pack={pk} />
            ))}
          </div>
        </section>
      )}

      {popularPacks.length === 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-12 pt-4 md:px-8 md:pb-16 md:pt-8">
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
            {products.map((p, i) => (
              <ProductCard key={p.slug} product={p} index={i} />
            ))}
          </div>
        </section>
      )}

      <TrustStrip />

      <PromoCarousel />

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
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



      <section className="mx-auto max-w-7xl px-4 py-8 md:px-8">
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
        <section className="mx-auto max-w-7xl px-4 pb-20 md:px-8">
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
