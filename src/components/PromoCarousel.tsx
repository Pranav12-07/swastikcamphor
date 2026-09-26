import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type PromoBanner = {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  media_type?: "image" | "video";
  button_text: string | null;
  destination_type: "none" | "product" | "category" | "offer" | "url";
  destination_value: string | null;
};

export function promoHref(b: Pick<PromoBanner, "destination_type" | "destination_value">): string | null {
  const v = b.destination_value?.trim();
  if (!v || b.destination_type === "none") return null;
  if (b.destination_type === "product") return `/products/${encodeURIComponent(v)}`;
  if (b.destination_type === "category") return `/products?filter=${encodeURIComponent(v)}`;
  return v;
}

const INTERVAL = 4500;

/** Presentational carousel — also used by the admin live preview. */
export function PromoCarouselView({ banners }: { banners: PromoBanner[] }) {
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const slides = banners.filter((b) => !broken.has(b.id));
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const count = slides.length;
  const multi = count > 1;

  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (index >= count && count) setIndex(0);
  }, [count, index]);

  useEffect(() => {
    if (!multi || paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL);
    return () => clearInterval(t);
  }, [multi, paused, count]);

  if (!count) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Promotional offers"
      className="mx-auto w-full max-w-7xl px-4 pt-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={(e) => {
        if (!multi) return;
        if (e.key === "ArrowLeft") go(index - 1);
        if (e.key === "ArrowRight") go(index + 1);
      }}
    >
      <div
        className="group relative overflow-hidden rounded-2xl bg-muted shadow-sm"
        onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          if (touchX.current == null || !multi) return;
          const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? index + 1 : index - 1);
          touchX.current = null;
        }}
      >
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((b, i) => {
            const href = promoHref(b);
            const external = href ? /^https?:\/\//i.test(href) : false;
            const inner = (
              <div className="relative aspect-[16/9] w-full sm:aspect-[21/8]">
                {b.media_type === "video" ? (
                  <video
                    src={b.image_url}
                    aria-label={b.title}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload={i === 0 ? "auto" : "metadata"}
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={() => setBroken((s) => new Set(s).add(b.id))}
                  />
                ) : (
                <img
                  src={b.image_url}
                  alt={b.title}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  sizes="(min-width: 1280px) 1248px, 100vw"
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={() => setBroken((s) => new Set(s).add(b.id))}
                />
                )}
                {(b.description || b.button_text) && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/70 to-transparent p-4 sm:p-8">
                    <p className="font-display text-lg text-background sm:text-3xl">{b.title}</p>
                    {b.description && <p className="mt-1 max-w-xl text-xs text-background/90 sm:text-sm">{b.description}</p>}
                    {b.button_text && href && (
                      <span className="mt-3 inline-block rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground sm:text-sm">
                        {b.button_text}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
            return (
              <div
                key={b.id}
                className="w-full shrink-0"
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}: ${b.title}`}
                aria-hidden={i !== index}
              >
                {!href ? (
                  inner
                ) : external ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" tabIndex={i === index ? 0 : -1}>{inner}</a>
                ) : (
                  <Link to={href as "/"} tabIndex={i === index ? 0 : -1}>{inner}</Link>
                )}
              </div>
            );
          })}
        </div>

        {multi && (
          <>
            <button
              type="button"
              aria-label="Previous poster"
              onClick={() => go(index - 1)}
              className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-background/80 text-foreground shadow opacity-80 transition hover:opacity-100 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next poster"
              onClick={() => go(index + 1)}
              className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-background/80 text-foreground shadow opacity-80 transition hover:opacity-100 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {multi && (
        <div className="mt-3 flex justify-center gap-2" role="tablist" aria-label="Choose poster">
          {slides.map((b, i) => (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show poster ${i + 1}`}
              onClick={() => go(i)}
              className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-primary" : "w-2 bg-muted-foreground/40 hover:bg-muted-foreground/70"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/** Homepage carousel: loads live posters (RLS returns only active, in-schedule ones) and refreshes on changes. */
export function PromoCarousel() {
  const [banners, setBanners] = useState<PromoBanner[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("promotional_banners")
        .select("id,title,description,image_url,media_type,button_text,destination_type,destination_value")
        .order("display_order")
        .order("created_at");
      if (!cancelled && !error && data) setBanners(data as PromoBanner[]);
    };
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return <PromoCarouselView banners={banners} />;
}
