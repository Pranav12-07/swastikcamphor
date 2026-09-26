import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const INTERVAL = 5000;
const RESUME_AFTER = 10000;

type Props = {
  items: ReactNode[];
  keys: string[];
  ariaLabel: string;
};

/**
 * Infinite card slider: advances one card every 5 s and loops seamlessly (no
 * rewind jump). 2 cards on phones, 3 from 1024 px, 4 from 1280 px. Swipe on
 * touch, arrows outside the cards on desktop, dots + pause/play below. Pauses
 * on hover, touch, focus and hidden tabs; no autoplay with reduced motion.
 * Every card (three copies) is rendered in the HTML, so crawlers see them all.
 */
export function InfiniteSlider({ items, keys, ariaLabel }: Props) {
  const { t } = useI18n();
  const n = items.length;
  const [visible, setVisible] = useState(2);
  const [index, setIndex] = useState(n);
  const [animated, setAnimated] = useState(true);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [fading, setFading] = useState(false);
  const touchX = useRef<number | null>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reduced motion: keep the autoplay rhythm but swap the slide for a soft fade.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!reduced) return;
    setFading(true);
    const id = setTimeout(() => setFading(false), 350);
    return () => clearTimeout(id);
  }, [index, reduced]);

  useEffect(() => {
    const mq3 = window.matchMedia("(min-width: 1024px)");
    const mq4 = window.matchMedia("(min-width: 1280px)");
    const update = () => setVisible(mq4.matches ? 4 : mq3.matches ? 3 : 2);
    update();
    mq3.addEventListener("change", update);
    mq4.addEventListener("change", update);
    return () => {
      mq3.removeEventListener("change", update);
      mq4.removeEventListener("change", update);
    };
  }, []);

  const multi = n > visible;

  // Keep the pointer inside the middle copy.
  useEffect(() => {
    setIndex(n);
  }, [n]);

  const interact = useCallback(() => {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), RESUME_AFTER);
  }, []);

  const go = useCallback(
    (target: number) => {
      if (!multi) return;
      setAnimated(true);
      setIndex(Math.max(0, Math.min(3 * n - 1, target)));
    },
    [multi, n],
  );

  // After a move lands outside the middle copy, snap back without animation.
  const onTransitionEnd = useCallback(() => {
    if (index >= 2 * n) {
      setAnimated(false);
      setIndex(index - n);
    } else if (index < n) {
      setAnimated(false);
      setIndex(index + n);
    }
  }, [index, n]);

  useEffect(() => {
    if (animated) return;
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setAnimated(true)));
    return () => cancelAnimationFrame(frame);
  }, [animated]);

  useEffect(() => {
    if (!multi || paused || document.hidden) return;
    const timer = setInterval(() => go(index + 1), INTERVAL);
    return () => clearInterval(timer);
  }, [multi, paused, index, go]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(
    () => () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    },
    [],
  );

  if (n === 0) return null;

  const copies = multi ? 3 : 1;
  const trackWidth = (n * copies * 100) / visible;
  const slideWidth = 100 / (n * copies);
  const activeDot = ((index % n) + n) % n;

  const track = (
    <div
      className="overflow-hidden"
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        if (touchX.current != null && multi) {
          const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? index + 1 : index - 1);
        }
        touchX.current = null;
        interact();
      }}
    >
      <div
        className={
          reduced
            ? `flex transition-opacity duration-700 ${fading ? "opacity-0" : "opacity-100"}`
            : `flex ${animated ? "transition-transform duration-700 ease-out" : ""} motion-reduce:transition-none`
        }
        style={{ width: `${trackWidth}%`, transform: `translateX(-${index * slideWidth}%)` }}
        onTransitionEnd={onTransitionEnd}
      >
        {Array.from({ length: copies }).map((_, copy) =>
          items.map((item, i) => (
            <div
              key={`${copy}-${keys[i] ?? i}`}
              className="shrink-0 px-1.5 sm:px-3"
              style={{ width: `${slideWidth}%` }}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${n}`}
              aria-hidden={copy !== 1 && multi ? true : undefined}
            >
              {item}
            </div>
          )),
        )}
      </div>
    </div>
  );

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={interact}
    >
      <div className="flex items-center gap-2">
        {multi && (
          <button
            type="button"
            aria-label={t("Previous packs")}
            onClick={() => {
              go(index - 1);
              interact();
            }}
            className="hidden h-11 w-11 shrink-0 place-items-center rounded-full border border-gold/40 bg-background text-foreground shadow transition-colors hover:bg-accent/15 sm:grid"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
        <div className="min-w-0 flex-1">{track}</div>
        {multi && (
          <button
            type="button"
            aria-label={t("Next packs")}
            onClick={() => {
              go(index + 1);
              interact();
            }}
            className="hidden h-11 w-11 shrink-0 place-items-center rounded-full border border-gold/40 bg-background text-foreground shadow transition-colors hover:bg-accent/15 sm:grid"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      {multi && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: n }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${t("Go to page")} ${i + 1}`}
              aria-current={i === activeDot}
              onClick={() => {
                go(n + i);
                interact();
              }}
              className={`h-2 rounded-full transition-all ${
                i === activeDot ? "w-6 bg-primary" : "w-2 bg-muted-foreground/40 hover:bg-muted-foreground/70"
              }`}
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
            {paused ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
        </div>
      )}
    </div>
  );
}
