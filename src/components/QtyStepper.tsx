import { Minus, Plus } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";

type Props = {
  slug: string;
  size: string;
  /** Max units allowed (pack stock). Null = unlimited. */
  max?: number | null;
  disabled?: boolean;
  className?: string;
};

/**
 * "Add to cart" that turns into a − qty + stepper (44 px, maroon) once the
 * pack is in the cart. Quantities always match the cart; "+" stops at stock.
 */
export function QtyStepper({ slug, size, max = null, disabled = false, className = "" }: Props) {
  const { lines, add, setQty } = useCart();
  const { t } = useI18n();
  const line = lines.find((l) => l.slug === slug && l.size === size);
  const qty = line?.qty ?? 0;
  const atMax = max != null && qty >= max;

  if (qty === 0) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => add(slug, size)}
        className={`h-11 w-full whitespace-nowrap rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5 disabled:opacity-50 ${className}`}
      >
        {disabled ? t("Out of stock") : t("Add to cart")}
      </button>
    );
  }

  return (
    <div className={className}>
      <div className="flex h-11 w-full items-center justify-between rounded-full bg-primary text-primary-foreground">
        <button
          type="button"
          aria-label={t("Decrease quantity")}
          onClick={() => setQty(slug, size, qty - 1)}
          className="grid h-full w-11 shrink-0 place-items-center rounded-l-full transition-colors hover:bg-maroon-deep/40"
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="tnum text-sm font-semibold" aria-live="polite">
          {qty}
        </span>
        <button
          type="button"
          aria-label={t("Increase quantity")}
          disabled={atMax}
          onClick={() => setQty(slug, size, qty + 1)}
          className="grid h-full w-11 shrink-0 place-items-center rounded-r-full transition-colors hover:bg-maroon-deep/40 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {atMax && (
        <p className="mt-1 text-center text-[11px] text-muted-foreground">
          {t("Only")} {max} {t("left")}
        </p>
      )}
    </div>
  );
}
