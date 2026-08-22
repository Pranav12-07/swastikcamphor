import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import promo from "@/assets/tradition-promo-v2.mp4.asset.json";
import logo from "@/assets/swastik-logo-trimmed.png.asset.json";
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
  const [ended, setEnded] = useState(false);

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
    const id = window.setInterval(() => setCaption((c) => (c + 1) % captions.length), 2400);
    return () => window.clearInterval(id);
  }, [visible]);

  useEffect(() => {
    if (visible) videoRef.current?.play().catch(() => {});
  }, [visible]);

  // Show the branded end card for the last ~1.6s of every loop.
  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setEnded(v.duration - v.currentTime < 1.6);
  };

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
        className="reveal reveal-zoom relative mt-9 overflow-hidden rounded-3xl border border-gold/25"
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
              onTimeUpdate={onTimeUpdate}
              aria-label="Swastik Camphor film: a camphor flame lit during morning pooja at a traditional Indian home temple"
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
          style={{ background: "linear-gradient(180deg, oklch(0.2 0.06 28 / 0.35) 0%, transparent 35%, oklch(0.2 0.06 28 / 0.88) 100%)" }}
          aria-hidden="true"
        />

        {/* Brand watermark — always visible on the film */}
        <div className="pointer-events-none absolute left-5 top-5 flex items-center gap-2 rounded-full bg-background/85 px-3 py-1.5 backdrop-blur-sm md:left-7 md:top-7">
          <img src={logo.url} alt="Swastik Camphor logo" className="h-6 w-auto md:h-8" />
          <span className="text-[9px] uppercase tracking-[0.28em] text-muted-foreground">Estd 1968</span>
        </div>

        {/* Branded end card */}
        <div
          className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/85 backdrop-blur-sm transition-opacity duration-700 ${
            ended ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        >
          <img src={logo.url} alt="" className="h-14 w-auto md:h-20" />
          <p className="font-display text-2xl md:text-3xl">Swastik Camphor</p>
          <p className="text-[11px] uppercase tracking-[0.34em] text-muted-foreground">
            Purity • Tradition • Trust
          </p>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 p-6 text-center md:p-10">
          <p
            key={caption}
            className="animate-rise-in font-display text-xl text-gold-soft drop-shadow md:text-3xl"
          >
            {captions[caption]}
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
