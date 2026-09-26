import { useCallback, useEffect, useRef, useState } from "react";
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

const CROSSFADE_S = 0.6;

export function TraditionVideo() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const layerRefs = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)] as const;
  const [visible, setVisible] = useState(false);
  /** Which scene index each of the two stacked <video> layers holds. */
  const [slots, setSlots] = useState<[number, number]>([0, 1 % scenes.length]);
  const [active, setActive] = useState(0);
  const [endCard, setEndCard] = useState(false);
  const switching = useRef(false);
  const refFor = (i: number) => (i === 0 ? layerRefs[0] : layerRefs[1]);

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

  const index = slots[active]!;
  const current = scenes[index] ?? scenes[0]!;
  const isLast = index === scenes.length - 1;

  // Keep the active layer playing; keep the idle layer buffered at frame 0.
  useEffect(() => {
    if (!visible) return;
    const a = refFor(active).current;
    const b = refFor(active === 0 ? 1 : 0).current;
    a?.play().catch(() => {});
    if (b) {
      b.pause();
      try {
        b.currentTime = 0;
      } catch {
        /* not seekable yet */
      }
      b.load();
    }
    switching.current = false;
  }, [visible, active, slots]);

  /** Crossfade into the already-buffered idle layer. */
  const advance = useCallback(
    (target?: number) => {
      if (switching.current) return;
      switching.current = true;
      const idle = active === 0 ? 1 : 0;
      const next = target ?? (slots[idle] ?? (index + 1) % scenes.length);
      setSlots((prev) => {
        const copy = [...prev] as [number, number];
        copy[idle] = next;
        return copy;
      });
      const nextEl = refFor(idle).current;
      if (nextEl) {
        try {
          nextEl.currentTime = 0;
        } catch {
          /* ignore */
        }
        nextEl.play().catch(() => {});
      }
      setActive(idle);
      // Queue the following scene onto the layer we just left.
      window.setTimeout(() => {
        setSlots((prev) => {
          const copy = [...prev] as [number, number];
          copy[active] = (next + 1) % scenes.length;
          return copy;
        });
      }, CROSSFADE_S * 1000 + 200);
    },
    [active, index, slots],
  );

  const onTimeUpdate = (layer: number) => () => {
    if (layer !== active) return;
    const v = refFor(layer).current;
    if (!v || !v.duration || Number.isNaN(v.duration)) return;
    const remaining = v.duration - v.currentTime;
    setEndCard(isLast && remaining < 1.4);
    // Start the crossfade before the final (often black) frame is reached.
    if (remaining <= CROSSFADE_S) advance();
  };

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
        <div className="relative aspect-video w-full">
          {/* Poster stays underneath so no black frame is ever exposed. */}
          <img
            src={poster}
            alt="Camphor flame glowing in a brass holder at a traditional Indian home temple"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            width={1600}
            height={900}
          />
          {visible &&
            ([0, 1] as const).map((layer) => (
              <video
                key={layer}
                ref={refFor(layer)}
                src={scenes[slots[layer]!]?.url}
                className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
                style={{ opacity: layer === active ? 1 : 0 }}
                autoPlay={layer === active}
                muted
                playsInline
                preload="auto"
                onTimeUpdate={onTimeUpdate(layer)}
                onEnded={() => layer === active && advance()}
                onError={() => layer === active && advance()}
                aria-hidden={layer !== active}
                aria-label={layer === active ? current.alt : undefined}
              />
            ))}
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
                onClick={() => advance(i)}
                aria-label={`Play scene: ${s.label}`}
                aria-current={i === index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index ? "w-8 bg-gold" : "w-3 bg-gold/35 hover:bg-gold/60"
                }`}
              />
            ))}
          </div>

          <Link
            to="/products"
            className="rounded-full bg-accent px-7 py-3 text-sm font-semibold text-accent-foreground transition-transform duration-300 hover:-translate-y-1"
          >
            Shop Now
          </Link>
        </div>
      </div>
    </section>
  );
}
