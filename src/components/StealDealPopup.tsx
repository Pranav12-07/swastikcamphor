import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { formatINR, packContents, per100g, twinSavings, type SizeOption } from "@/data/products";
import { useI18n } from "@/lib/i18n";

type Props = {
  productName: string;
  image: string;
  single: SizeOption;
  twin: SizeOption;
  product: { sizeOptions?: SizeOption[]; stock?: number };
  dealAmount: number;
  dealMin: number;
  dealEnabled: boolean;
  onClose: () => void;
  onUpgrade: () => void;
};

/**
 * Steal Deal upsell — shown once per product per visit after a single pack is
 * added to the cart. Bottom sheet on phones, centered dialog on desktop.
 */
export function StealDealPopup({
  productName,
  image,
  single,
  twin,
  product,
  dealAmount,
  dealMin,
  dealEnabled,
  onClose,
  onUpgrade,
}: Props) {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    primaryRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>("button, [href]");
        if (!focusables.length) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = twinSavings(product, twin);
  const singlePer100 = per100g(single);
  const twinPer100 = per100g(twin);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] flex items-end justify-center bg-foreground/50 backdrop-blur-sm sm:items-center sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={t("Make it a Twin Pack and save more")}
          className="card-premium relative w-full max-w-md rounded-b-none p-6 sm:rounded-3xl"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Close")}
            className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
          >
            <X className="h-5 w-5" />
          </button>

          <h2 className="font-display text-xl leading-snug">{t("Make it a Twin Pack & save more")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{productName}</p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border p-3 text-center">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t("You picked")}</p>
              <p className="mt-1 text-sm font-medium">{single.label}</p>
              <p className="text-[11px] text-muted-foreground">{packContents(single)}</p>
              <p className="mt-1.5 text-base font-semibold">{formatINR(single.price)}</p>
              {singlePer100 != null && <p className="text-[11px] text-muted-foreground">₹{singlePer100} / 100 g</p>}
            </div>
            <div className="relative rounded-2xl border-2 border-gold/70 bg-accent/10 p-3 text-center">
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
                {t("Twin Pack")}
              </span>
              <img src={image} alt="" className="mx-auto h-14 w-14 rounded-xl object-cover" />
              <p className="mt-1 text-sm font-medium">{twin.label}</p>
              <p className="text-[11px] text-muted-foreground">{packContents(twin)}</p>
              <p className="mt-1.5 text-base font-semibold">
                {formatINR(twin.price)}{" "}
                {twin.mrp > twin.price && <span className="text-xs font-normal text-muted-foreground line-through">{formatINR(twin.mrp)}</span>}
              </p>
              {twinPer100 != null && <p className="text-[11px] text-muted-foreground">₹{twinPer100} / 100 g</p>}
            </div>
          </div>

          {save != null && (
            <p className="mt-3 text-center text-sm font-semibold text-emerald-700">
              {t("You save")} {formatINR(save)} {t("with the Twin Pack")}
            </p>
          )}
          {dealEnabled && dealAmount > 0 && (
            <p className="mt-1 text-center text-xs text-muted-foreground">
              + {t("extra")} {formatINR(dealAmount)} {t("off at checkout on orders")} {formatINR(dealMin)}+
            </p>
          )}

          <div className="mt-5 flex flex-col gap-2">
            <button
              ref={primaryRef}
              type="button"
              onClick={onUpgrade}
              className="min-h-11 w-full rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              {t("Switch to Twin Pack")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 w-full rounded-full border border-gold/40 text-sm font-medium transition-colors hover:bg-accent/15"
            >
              {t("No thanks, keep my pack")}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
