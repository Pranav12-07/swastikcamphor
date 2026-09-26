import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Copy, Truck } from "lucide-react";
import { formatINR, isTwinPack, pctOff } from "@/data/products";
import { useCatalog } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import { useStoreSettings } from "@/lib/store-settings";
import { useWelcomeOffer } from "@/lib/welcome-offer";

/** Slim offer strip above the header on every customer page. */
export function AnnouncementBar() {
  const { t } = useI18n();
  const { freeShippingAbove } = useStoreSettings();
  const { products } = useCatalog();
  const offer = useWelcomeOffer();

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

  const twinText = `${t("Twin Packs: save up to")} ${twinOff}% →`;
  const shipText = `${t("Free shipping above")} ${formatINR(freeShippingAbove)}`;

  return (
    <div className="bg-maroon-deep text-gold-soft">
      {/* Phones: one tappable line that never wraps at 360px. */}
      <Link
        to="/products"
        hash="twin-packs"
        className="flex h-9 items-center justify-center gap-2 whitespace-nowrap px-3 text-xs md:hidden"
      >
        <span className="font-semibold text-gold">{twinText}</span>
        <span aria-hidden="true" className="h-3 w-px shrink-0 bg-gold-soft/40" />
        <span className="inline-flex items-center gap-1">
          <Truck className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
          {shipText}
        </span>
      </Link>

      {/* Desktop: three offers, with the first-order code copy button. */}
      <div className="mx-auto hidden min-h-9 max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-0.5 px-3 py-1.5 text-center text-sm md:flex md:px-8">
        <Link
          to="/products"
          hash="twin-packs"
          className="inline-flex items-center gap-1.5 rounded-full px-1 font-semibold text-gold underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          {twinText}
        </Link>
        <span aria-hidden="true" className="h-3 w-px bg-gold-soft/40" />
        <span className="inline-flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
          {shipText}
        </span>
        {offer.coupon && (
          <>
            <span aria-hidden="true" className="h-3 w-px bg-gold-soft/40" />
            <button
              type="button"
              onClick={() => void offer.copy()}
              className="inline-flex items-center gap-1 rounded-full px-1 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              <span>
                {offer.amount} {t("off")} · {t("First order")}:
              </span>
              <strong className="font-semibold tracking-wide text-gold">{offer.code}</strong>
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="sr-only">{t("Copy code")}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
