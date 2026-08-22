import { useEffect, useMemo, useRef, useState } from "react";

/** Flip to false to disable the cinematic opening everywhere. */
export const INTRO_ENABLED = true;
/** Returning visitors get a short fade instead of the full sequence. */
const STORAGE_KEY = "swastik-intro-seen";

type Scene = { title: string; subtitle: string; glyph: string };

const scenes: Scene[] = [
  { glyph: "🪔", title: "Puja & Aarti", subtitle: "A timeless part of daily worship" },
  { glyph: "🛕", title: "Temple Use", subtitle: "A traditional part of sacred spaces" },
  { glyph: "🧘", title: "Meditation & Prayer", subtitle: "Create a calm and peaceful atmosphere" },
  { glyph: "🏠", title: "Home Fragrance", subtitle: "Bring a traditional fragrance into your home" },
  { glyph: "👕", title: "Wardrobe & Storage", subtitle: "A traditional household practice" },
  { glyph: "🎉", title: "Festivals & Ceremonies", subtitle: "A part of meaningful celebrations" },
  { glyph: "🌿", title: "Traditional Household Uses", subtitle: "Tradition passed from generation to generation" },
  { glyph: "🕯️", title: "Daily Spiritual Practices", subtitle: "A small flame. A timeless tradition." },
];

const BRAND_MS = 380;
const SCENE_MS = 190;
const OUTRO_MS = 380;
/** Only a short highlight reel plays — keeps the opening under ~1.5s. */
const REEL = 4;

export function CamphorIntro() {
  const [phase, setPhase] = useState<"brand" | "scenes" | "outro" | "done">("brand");
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const mode = useMemo(() => {
    if (!hydrated || typeof window === "undefined") return "skip" as const;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "short" as const;
    return window.localStorage.getItem(STORAGE_KEY) ? ("short" as const) : ("full" as const);
  }, [hydrated]);

  useEffect(() => {
    if (mode === "skip") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* storage unavailable — intro still works */
    }

    const push = (fn: () => void, ms: number) => {
      timers.current.push(setTimeout(fn, ms));
    };

    if (mode === "short") {
      push(() => setLeaving(true), 120);
      push(() => setPhase("done"), 420);
    } else {
      const reel = Math.min(REEL, scenes.length);
      push(() => setPhase("scenes"), BRAND_MS);
      for (let i = 1; i < reel; i++) {
        push(() => setIndex(i), BRAND_MS + i * SCENE_MS);
      }
      const end = BRAND_MS + reel * SCENE_MS;
      push(() => setPhase("outro"), end);
      push(() => setLeaving(true), end + 60);
      push(() => setPhase("done"), end + OUTRO_MS);
    }

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [mode]);

  useEffect(() => {
    if (mode === "skip" || phase === "done") return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mode, phase]);

  const skip = () => {
    timers.current.forEach(clearTimeout);
    setLeaving(true);
    setTimeout(() => setPhase("done"), 400);
  };

  if (mode === "skip" || phase === "done") return null;

  const scene = scenes[index]!;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[100] grid place-items-center overflow-hidden transition-opacity duration-300"
      style={{
        background: "radial-gradient(circle at 50% 62%, oklch(0.28 0.06 42) 0%, oklch(0.16 0.04 32) 55%, oklch(0.11 0.02 30) 100%)",
        opacity: leaving ? 0 : 1,
      }}
    >
      {/* flame — the constant visual thread */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl transition-all duration-500 will-change-transform"
        style={{
          width: phase === "outro" ? "120vmax" : "18rem",
          height: phase === "outro" ? "120vmax" : "18rem",
          background: "var(--gradient-gold, radial-gradient(circle, oklch(0.86 0.14 85 / 0.55), transparent 70%))",
          opacity: phase === "outro" ? 0.85 : 0.45,
        }}
        aria-hidden="true"
      />

      <div className="relative px-6 text-center">
        {phase === "brand" ? (
          <div className="animate-rise-in">
            <span className="mx-auto block h-12 w-6 rounded-full bg-[radial-gradient(circle_at_50%_70%,oklch(0.95_0.11_92),oklch(0.72_0.18_55))] blur-[1px] animate-flicker" />
            <h1 className="mt-6 font-display text-2xl tracking-[0.22em] text-gold-soft md:text-3xl">
              SWASTIK CAMPHOR
            </h1>
            <p className="mt-3 text-sm font-semibold uppercase tracking-[0.4em] text-gold-soft">
              PURE TRADITION
            </p>
          </div>
        ) : phase === "scenes" ? (
          <div key={index} className="animate-rise-in [animation-duration:0.28s]">
            <span className="text-4xl md:text-5xl" aria-hidden="true">
              {scene.glyph}
            </span>
            <h2 className="mt-4 font-display text-xl text-gold-soft md:text-2xl">{scene.title}</h2>
            <p className="mt-2 text-xs text-gold-soft/70 md:text-sm">{scene.subtitle}</p>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={skip}
        className="absolute bottom-6 right-6 rounded-full border border-gold/40 px-4 py-2 text-xs text-gold-soft/80 transition-colors hover:bg-gold/15"
      >
        Skip Intro →
      </button>
    </div>
  );
}