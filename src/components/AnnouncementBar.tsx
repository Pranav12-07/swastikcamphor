import { Copy, Truck } from "lucide-react";
import { formatINR } from "@/data/products";
import { useI18n } from "@/lib/i18n";
import { useStoreSettings } from "@/lib/store-settings";
import { useWelcomeOffer } from "@/lib/welcome-offer";

/** Slim offer strip above the header on every customer page. */
export function AnnouncementBar() {
  const { t } = useI18n();
  const { freeShippingAbove } = useStoreSettings();
  const offer = useWelcomeOffer();

  return (
    <div className="bg-maroon-deep text-gold-soft">
      <div className="mx-auto flex min-h-9 max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-0.5 px-3 py-1.5 text-center text-xs md:px-8 md:text-sm">
        <span className="inline-flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
          <span>{t("Free shipping on orders above")}</span>
          <span>{formatINR(freeShippingAbove)}</span>
        </span>
        {offer.coupon && (
          <>
            <span aria-hidden="true" className="h-3 w-px bg-gold-soft/40" />
            <button
              type="button"
              onClick={() => void offer.copy()}
              className="inline-flex items-center gap-1 rounded-full px-1 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              <span className="hidden sm:inline">
                {offer.amount} {t("off")} · {t("First order")}:
              </span>
              <span className="sm:hidden">{t("Code")}</span>
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
