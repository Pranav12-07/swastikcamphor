import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import promo from "@/assets/tradition-promo.mp4.asset.json";
import poster from "@/assets/tradition-poster.jpg";

const captions = [
  "Bring purity to every pooja.",
  "A tradition trusted by generations.",
  "Freshness for your home.",
  "Perfect for every special occasion.",
];

export function TraditionVideo() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [caption, setCaption] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const id = window.setInterval(() => setCaption((c) => (c + 1) % captions.length), 2500);
    return () => window.clearInterval(id);
  }, [visible]);

  useEffect(() => {
    if (visible) videoRef.current?.play().catch(() => {});
  }, [visible]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
      <div className="reveal text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Swastik Camphor</p>
        <h2 className="mt-3 font-display text-3xl md:text-4xl">Tradition in Every Moment</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
          From the morning pooja to festive rituals and a fresher home — pure camphor for every occasion.
        </p>
      </div>

      <div
        ref={wrapRef}
        className="reveal reveal-zoom relative mt-9 overflow-hidden rounded-3xl border border-gold/25 shadow-[var(--shadow-premium,0_30px_80px_-40px_rgba(0,0,0,0.5))]"
      >
        <div className="aspect-video w-full bg-black">
          {visible ? (
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              src={promo.url}
              poster={poster}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="Swastik Camphor promotional film showing camphor used in pooja, family prayer and festive rituals"
            />
          ) : (
            <img
              src={poster}
              alt="Camphor flame glowing in a brass holder at a traditional Indian home temple"
              className="h-full w-full object-cover"
              loading="lazy"
              width={1600}
              height={900}
            />
          )}
        </div>

        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(180deg, transparent 40%, oklch(0.2 0.06 28 / 0.85))" }}
          aria-hidden="true"
        />

        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 p-6 text-center md:p-10">
          <p
            key={caption}
            className="animate-rise-in font-display text-xl text-gold-soft drop-shadow md:text-3xl"
          >
            {captions[caption]}
          </p>
          <p className="text-[11px] uppercase tracking-[0.34em] text-gold-soft/80">
            Purity • Tradition • Trust
          </p>
          <Link
            to="/shop"
            className="rounded-full bg-accent px-7 py-3 text-sm font-semibold text-accent-foreground transition-transform duration-300 hover:-translate-y-1"
          >
            Shop Now
          </Link>
        </div>
      </div>
    </section>
  );
}
