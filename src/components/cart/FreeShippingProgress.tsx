import { PartyPopper, Truck } from "lucide-react";
import { formatINR } from "@/data/products";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";

/**
 * Free-shipping (+ Steal Deal) progress bar for the cart, checkout summary and
 * mini cart. All amounts come from the live store settings.
 */
export function FreeShippingProgress() {
  const cart = useCart();
  const { t } = useI18n();

  const effective = cart.subtotal - cart.discount;
  const freeAbove = cart.freeShippingAbove;
  const freeReached = effective >= freeAbove;
  const stealPending =
    cart.stealDealEnabled && cart.stealDealAmount > 0 && cart.stealDeal === 0 && cart.subtotal < cart.stealDealMin;
  // The Steal Deal needs a Twin Pack; only advertise it when one is in the cart
  // or the shopper is close enough that pairing the message makes sense.
  const stealInReach = stealPending && cart.hasTwin;

  if (cart.subtotal === 0) return null;

  const pct = Math.min(100, Math.round((effective / freeAbove) * 100));
  const stealPct = Math.min(100, Math.round((cart.subtotal / cart.stealDealMin) * 100));
  const sameMilestone = !stealInReach || cart.stealDealMin === freeAbove;

  return (
    <div className="rounded-2xl border border-gold/30 bg-secondary/50 p-4">
      {freeReached ? (
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
          <PartyPopper className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t("You've unlocked FREE shipping")}
          {cart.stealDeal > 0 && (
            <span>
              {t("and the")} {formatINR(cart.stealDealAmount)} {t("Steal Deal")}
            </span>
          )}
        </p>
      ) : (
        <p className="flex items-center gap-2 text-sm font-medium">
          <Truck className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          {t("Add")} {formatINR(Math.max(0, freeAbove - effective))} {t("more for FREE shipping")}
          {stealInReach && (
            <span>
              + {formatINR(cart.stealDealAmount)} {t("Steal Deal")}
            </span>
          )}
        </p>
      )}

      {!freeReached && (
        <div
          className="relative mt-2.5 h-2 overflow-visible rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={freeAbove}
          aria-valuenow={Math.min(effective, freeAbove)}
          aria-label={t("Free shipping progress")}
        >
          <div className="h-full overflow-hidden rounded-full">
            <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${pct}%` }} />
          </div>
          {/* Milestone marker(s): one when both thresholds match, two when they differ. */}
          <span
            aria-hidden="true"
            className="absolute -top-0.5 h-3 w-0.5 rounded bg-maroon-deep/50"
            style={{ left: "calc(100% - 1px)" }}
          />
          {!sameMilestone && (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 h-3 w-0.5 rounded bg-maroon-deep/50"
              style={{ left: `calc(${Math.min(100, (cart.stealDealMin / freeAbove) * 100)}% - 1px)` }}
            />
          )}
        </div>
      )}

      {stealInReach && !freeReached && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {t("Steal Deal unlocks at")} {formatINR(cart.stealDealMin)} ({Math.min(stealPct, 100)}%)
        </p>
      )}
    </div>
  );
}
