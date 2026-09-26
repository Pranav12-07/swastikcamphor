import { useEffect, useState } from "react";
import { formatINR } from "@/data/products";
import { useI18n } from "@/lib/i18n";

type Props = {
  /** id of the page's main Add to cart button; the bar appears once it scrolls off screen */
  targetId: string;
  productName: string;
  price: number;
  mrp: number;
  onAdd: () => void;
};

/**
 * Phones only: keeps "Add to cart" within thumb reach on long product pages.
 * While visible it sets body[data-sticky-buy] so the floating buttons move up (see styles.css).
 */
export function StickyBuyBar({ targetId, productName, price, mrp, onAdd }: Props) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const target = document.getElementById(targetId);
      setVisible(target ? target.getBoundingClientRect().bottom < 0 : false);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [targetId]);

  useEffect(() => {
    document.body.toggleAttribute("data-sticky-buy", visible);
    return () => document.body.removeAttribute("data-sticky-buy");
  }, [visible]);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-gold/30 bg-background/95 px-4 pt-2 shadow-[0_-8px_24px_-12px_oklch(0.3_0.09_28/0.35)] backdrop-blur transition-[translate,visibility] duration-200 motion-reduce:transition-none md:hidden ${
        visible ? "visible translate-y-0" : "invisible translate-y-full"
      }`}
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{productName}</p>
          <p className="text-base font-semibold">
            {formatINR(price)}
            {mrp > price && (
              <span className="ml-2 text-xs font-normal text-muted-foreground line-through">{formatINR(mrp)}</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="h-11 shrink-0 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground"
        >
          {t("Add to cart")}
        </button>
      </div>
    </div>
  );
}
