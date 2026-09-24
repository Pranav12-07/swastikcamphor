import { canonical, canonicalLink } from "@/lib/seo";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Flame, Leaf, ShieldCheck, Sparkle, Truck } from "lucide-react";
import hero from "@/assets/hero.jpg";
import heroDiyaLoop from "@/assets/hero-diya-loop.mp4.asset.json";
import heroDiyaLoopWebm from "@/assets/hero-diya-loop.webm.asset.json";
import about from "@/assets/about.jpg";
import { ProductCard } from "@/components/ProductCard";
import { TraditionVideo } from "@/components/TraditionVideo";

import { useCatalog } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import { marketplaces, site } from "@/config/site";
import { useReveal } from "@/hooks/use-reveal";
import { useBanners } from "@/hooks/use-banners";
import { listBlogs } from "@/lib/blog.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    links: canonicalLink("/"),
    meta: [
      { property: "og:url", content: canonical("/") },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Swastik Camphor — 100% Pure Camphor for Pooja & Wellness" },
      {
        name: "description",
        content:
          "Buy 100% pure, natural camphor tablets, Bhimseni camphor, cones and pooja gift packs from Swastik Camphor, Hyderabad. Clean burn, no residue, chemical free.",
      },
      { property: "og:title", content: "Swastik Camphor — Purity in Every Tablet" },
      {
        property: "og:description",
        content: "Pure camphor for pooja, aarti, aromatherapy and everyday freshness. Made in Hyderabad.",
      },
    ],
  }),
  loader: () => listBlogs(),
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
  const posts = Route.useLoaderData().slice(0, 3);
  const { products } = useCatalog();
  const { t } = useI18n();
  const homeProducts = [...products].sort(
    (a, b) => Number(b.rating != null) - Number(a.rating != null),
  );
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
        <div className="mx-auto max-w-7xl px-4 py-28 md:px-8 md:py-36">
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
                <strong className="font-bold">PURE CAMPHOR</strong>
                <br />
                <strong className="font-bold">PURE TRADITION</strong>
              </>
            )}
          </h1>
          <p
            className="animate-rise-in mt-6 max-w-xl text-base leading-relaxed text-gold-soft/85 md:text-lg"
            style={{ animationDelay: "160ms" }}
          >
            {banner?.subtitle ??
              `${site.name} brings you 100% pure, natural and chemical-free camphor — crafted for pooja, aarti, aromatherapy and a fresher home.`}
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



      <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8">
        <div className="reveal flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("Our range")}</p>
            <h2 className="mt-2 text-3xl md:text-4xl">{t("Camphor for every ritual")}</h2>
            <div className="gold-rule rule-animate mt-4 w-20" />

          </div>
          <Link to="/shop" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            {t("View all products →")}
          </Link>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {homeProducts.map((p, i) => (
            <ProductCard key={p.slug} product={p} index={i} />
          ))}
        </div>
      </section>

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

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="card-premium reveal grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 p-8 sm:flex sm:justify-between">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-display text-2xl">
              <Sparkle className="h-5 w-5 text-accent" aria-hidden="true" /> {t("Also available online")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("Find Swastik Camphor on your favourite marketplace.")}
            </p>
          </div>
          <ul className="flex shrink-0 flex-wrap gap-2">
            {marketplaces.map((m) => (
              <li key={m.id}>
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-gold/40 px-4 py-2 text-sm transition-colors hover:bg-accent/15"
                >
                  {m.label}
                </a>
              </li>
            ))}
          </ul>
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
