import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import scenePooja from "@/assets/tradition-pooja-v6.mp4.asset.json";
import sceneFamily from "@/assets/tradition-family-v6.mp4.asset.json";
import sceneFlame from "@/assets/tradition-flame-v6.mp4.asset.json";
import sceneFestival from "@/assets/tradition-festival-v6.mp4.asset.json";
import sceneProduct from "@/assets/tradition-product-v5.mp4.asset.json";
import logo from "@/assets/swastik-logo-trimmed.png.asset.json";
import poster from "@/assets/tradition-poster.jpg";

type Scene = { url: string; label: string; caption: string; alt: string };

const scenes: Scene[] = [
  {
    url: scenePooja.url,
    label: "Morning Pooja",
    caption: "Start your day with tradition.",
    alt: "Camphor tablet lit during a morning pooja at a home temple",
  },
  {
    url: sceneFamily.url,
    label: "Family Aarti",
    caption: "A tradition shared with family.",
    alt: "An Indian family performing aarti with a camphor tablet burning in the foreground",
  },
  {
    url: sceneFlame.url,
    label: "The Aarti Flame",
    caption: "A clean, steady flame — smokeless and pure.",
    alt: "Macro view of a camphor tablet burning with a tall flame in a brass aarti thali",
  },
  {
    url: sceneFestival.url,
    label: "Festivals",
    caption: "At the heart of every celebration.",
    alt: "Family celebrating Diwali pooja with Swastik camphor jars and a lit diya",
  },
  {
    url: sceneProduct.url,
    label: "The Product",
    caption: "Pure camphor. Purity you can trust.",
    alt: "Close-up of pure Swastik Camphor tablets in a brass camphor holder",
  },
];

export function TraditionVideo() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const [endCard, setEndCard] = useState(false);

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

  // Play the current scene whenever the source changes.
  useEffect(() => {
    if (!visible) return;
    const v = videoRef.current;
    if (!v) return;
    setEndCard(false);
    v.load();
    v.play().catch(() => {});
  }, [visible, index]);

  const isLast = index === scenes.length - 1;

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    // Branded end card only on the final scene.
    setEndCard(isLast && v.duration - v.currentTime < 1.4);
  };

  const onEnded = () => setIndex((i) => (i + 1) % scenes.length);

  const current = scenes[index] ?? scenes[0]!;

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
      <div className="reveal text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Swastik Camphor</p>
        <h2 className="mt-3 font-display text-3xl md:text-4xl">Tradition in Every Moment</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
          Morning pooja, family aarti and the pure tablet itself — one film,
          every moment camphor belongs to.
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
              key={current.url}
              className="h-full w-full object-cover"
              src={current.url}
              
              autoPlay
              muted
              playsInline
              preload="auto"
              onTimeUpdate={onTimeUpdate}
              onEnded={onEnded}
              aria-label={current.alt}
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
          style={{
            background:
              "linear-gradient(180deg, oklch(0.2 0.06 28 / 0.35) 0%, transparent 35%, oklch(0.2 0.06 28 / 0.88) 100%)",
          }}
          aria-hidden="true"
        />

        {/* Brand watermark — always visible on the film */}
        <div className="pointer-events-none absolute left-5 top-5 flex items-center gap-2 rounded-full bg-background/85 px-3 py-1.5 backdrop-blur-sm md:left-7 md:top-7">
          <img src={logo.url} alt="Swastik Camphor logo" className="h-6 w-auto md:h-8" />
          <span className="text-[9px] uppercase tracking-[0.28em] text-muted-foreground">Estd 1968</span>
        </div>

        {/* Scene label */}
        <div className="pointer-events-none absolute right-5 top-5 rounded-full bg-background/75 px-3 py-1.5 backdrop-blur-sm md:right-7 md:top-7">
          <span className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            {index + 1}/{scenes.length} · {current.label}
          </span>
        </div>

        {/* Branded end card */}
        <div
          className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/85 backdrop-blur-sm transition-opacity duration-700 ${
            endCard ? "opacity-100" : "opacity-0"
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
            key={current.caption}
            className="animate-rise-in font-display text-xl text-gold-soft drop-shadow md:text-3xl"
          >
            {current.caption}
          </p>

          <div className="flex items-center gap-2">
            {scenes.map((s, i) => (
              <button
                key={s.url}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Play scene: ${s.label}`}
                aria-current={i === index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index ? "w-8 bg-gold" : "w-3 bg-gold/35 hover:bg-gold/60"
                }`}
              />
            ))}
          </div>

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
