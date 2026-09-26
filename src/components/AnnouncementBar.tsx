import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Copy, Tag, Truck } from "lucide-react";
import { formatINR, isTwinPack, pctOff } from "@/data/products";
import { useCatalog } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import { useStoreSettings } from "@/lib/store-settings";
import { useWelcomeOffer } from "@/lib/welcome-offer";

const TICKER_SPEED = 40; // px per second

/** Scrolling offer strip above the header on every customer page. */
export function AnnouncementBar() {
  const { t } = useI18n();
  const { freeShippingAbove } = useStoreSettings();
  const { products } = useCatalog();
  const offer = useWelcomeOffer();
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [fadeIndex, setFadeIndex] = useState(0);
  const firstCopyRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(30);

  // Highest % off (rounded down) among in-stock Twin Packs.
  const twinOff = useMemo(() => {
    let best = 0;
    for (const p of products) {
      for (const o of p.sizeOptions ?? []) {
        if (!isTwinPack(o) || (o.stock != null && o.stock <= 0)) continue;
        const off = pctOff(o.mrp, o.price);
        if (off > best) best = off;
      }
    }
    return best;
  }, [products]);

  const messages: { key: string; node: ReactNode }[] = [
    {
      key: "twin",
      node: (
        <Link
          to="/products"
          search={{ filter: "twin" }}
          className="inline-flex items-center gap-1.5 font-semibold text-gold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <Tag className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t("Twin Packs: save up to")} {twinOff}% →
        </Link>
      ),
    },
    {
      key: "ship",
      node: (
        <Link
          to="/products"
          className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          <Truck className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
          {t("Free shipping above")} {formatINR(freeShippingAbove)}
        </Link>
      ),
    },
    ...(offer.coupon
      ? [
          {
            key: "coupon",
            node: (
              <button
                type="button"
                onClick={() => void offer.copy()}
                className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                <span>
                  {offer.amount} {t("off")} · {t("First order")}:
                </span>
                <strong className="font-semibold tracking-wide text-gold">{offer.code}</strong>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only">{t("Copy code")}</span>
              </button>
            ),
          },
        ]
      : []),
  ];

  // Detect reduced motion; then fade one message at a time instead of scrolling.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!reduced) return;
    const timer = setInterval(() => setFadeIndex((i) => (i + 1) % messages.length), 4000);
    return () => clearInterval(timer);
  }, [reduced, messages.length]);

  // Scroll speed: measure one copy of the message list and time it at 40 px/s.
  useEffect(() => {
    const el = firstCopyRef.current;
    if (!el) return;
    const measure = () => setDuration(Math.max(8, el.offsetWidth / TICKER_SPEED));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [messages.length, twinOff, freeShippingAbove, offer.coupon]);

  const copy = (ariaHidden: boolean) => (
    <div
      ref={ariaHidden ? undefined : firstCopyRef}
      aria-hidden={ariaHidden || undefined}
      className="flex w-max shrink-0 items-center gap-8 pr-8"
    >
      {messages.map((m) => (
        <span key={m.key} className="flex items-center gap-8">
          {m.node}
          <span aria-hidden="true" className="text-gold-soft/50">
            ✦
          </span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="bg-maroon-deep text-gold-soft">
      {reduced ? (
        <div className="flex h-9 items-center justify-center px-3 text-xs md:text-sm">
          <div key={fadeIndex} className="animate-[rise-in_0.6s_ease_both]">
            {messages[fadeIndex]?.node}
          </div>
        </div>
      ) : (
        <div
          className="group h-9 overflow-hidden text-xs md:text-sm"
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
          onTouchCancel={() => setPaused(false)}
        >
          <div
            className="animate-ticker flex h-9 w-max items-center group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]"
            style={{ animationDuration: `${duration}s`, animationPlayState: paused ? "paused" : undefined }}
          >
            {copy(false)}
            {copy(true)}
          </div>
        </div>
      )}
    </div>
  );
}
