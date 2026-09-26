import { useEffect, useState } from "react";
import { formatINR } from "@/data/products";
import { QtyStepper } from "@/components/QtyStepper";

type Props = {
  /** Id of the on-page add-to-cart control; the bar appears once it scrolls out of view. */
  targetId: string;
  slug: string;
  productName: string;
  /** SizeOption.label (cart key). */
  size: string;
  /** Short label shown in the bar. */
  sizeLabel: string;
  price: number;
  mrp: number;
  max?: number | null;
};

/** Sticky bottom bar with the live cart stepper for the selected pack. */
export function StickyBuyBar({ targetId, slug, productName, size, sizeLabel, price, mrp, max = null }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!(entry?.isIntersecting ?? true)), {
      rootMargin: "-64px 0px 0px 0px",
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-gold/25 bg-background/95 backdrop-blur transition-transform duration-300 md:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {productName} {sizeLabel ? `· ${sizeLabel}` : ""}
          </p>
          <p className="tnum text-sm">
            <span className="font-semibold">{formatINR(price)}</span>{" "}
            {mrp > price && <span className="text-xs text-muted-foreground line-through">{formatINR(mrp)}</span>}
          </p>
        </div>
        <div className="w-40 shrink-0">
          <QtyStepper slug={slug} size={size} max={max} />
        </div>
      </div>
    </div>
  );
}
