import { BadgePercent, Copy, MessageCircle, ShieldCheck, Truck } from "lucide-react";
import { site } from "@/config/site";
import { formatINR } from "@/data/products";
import { useI18n } from "@/lib/i18n";
import { useStoreSettings } from "@/lib/store-settings";
import { useWelcomeOffer } from "@/lib/welcome-offer";

/** Offers and reassurance shown directly under the product page's buy buttons. */
export function ProductOffers({ productName }: { productName: string }) {
  const { t } = useI18n();
  const { freeShippingAbove } = useStoreSettings();
  const offer = useWelcomeOffer();
  const icon = "mt-0.5 h-4 w-4 shrink-0 text-accent";
  const question = encodeURIComponent(`Hi Swastik Camphor, I have a question about ${productName}.`);

  return (
    <aside aria-label={t("Offers")} className="mt-6 rounded-2xl border border-gold/30 bg-secondary/40 p-4 text-sm">
      <ul className="space-y-2.5">
        <li className="flex gap-2.5">
          <Truck className={icon} aria-hidden="true" />
          <span>
            <span>{t("Free shipping on orders above")}</span> <span>{formatINR(freeShippingAbove)}</span>
          </span>
        </li>
        {offer.coupon && (
          <li className="flex gap-2.5">
            <BadgePercent className={icon} aria-hidden="true" />
            <span>
              <span>{offer.amount}</span> <span>{t("off")}</span> <span>{t("on your first order with code")}</span>{" "}
              <button
                type="button"
                onClick={() => void offer.copy()}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-primary/60 px-1.5 font-semibold tracking-wide text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {offer.code}
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only">{t("Copy code")}</span>
              </button>
            </span>
          </li>
        )}
        <li className="flex gap-2.5">
          <ShieldCheck className={icon} aria-hidden="true" />
          <span>{t("100% pure camphor with a clean, residue-free burn.")}</span>
        </li>
      </ul>
      <a
        href={`https://wa.me/${site.whatsapp}?text=${question}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-2 font-medium text-primary underline-offset-4 hover:underline"
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        {t("Ask a question on WhatsApp")}
      </a>
    </aside>
  );
}
