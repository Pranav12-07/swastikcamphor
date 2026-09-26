import { useState } from "react";
import { BadgePercent, X } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/data/products";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";

/**
 * Coupon entry for the cart and checkout. Codes are always checked on the
 * server, so private codes (e.g. review thank-you codes) work only for the
 * account they were issued to.
 */
export function CouponForm() {
  const cart = useCart();
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = async () => {
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await cart.applyCoupon(code);
    setBusy(false);
    if (res.ok) {
      setCode("");
      toast.success(t("Coupon applied"));
    } else {
      setError(res.message ?? t("This code is not valid"));
    }
  };

  if (cart.coupon) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-emerald-600/30 bg-emerald-50/60 px-3.5 py-2.5 text-sm">
        <span className="flex min-w-0 items-center gap-2 font-medium text-emerald-800">
          <BadgePercent className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{cart.coupon}</span>
          {cart.discount > 0 && <span className="shrink-0 text-emerald-700">−{formatINR(cart.discount)}</span>}
        </span>
        <button
          type="button"
          onClick={cart.removeCoupon}
          aria-label={t("Remove coupon")}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-emerald-800 transition-colors hover:bg-emerald-100"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void apply();
            }
          }}
          placeholder={t("Coupon code")}
          aria-label={t("Coupon code")}
          maxLength={30}
          className="h-11 min-w-0 flex-1 rounded-full border border-gold/40 bg-card px-4 text-sm uppercase tracking-wide outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          onClick={() => void apply()}
          disabled={busy || !code.trim()}
          className="h-11 shrink-0 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {busy ? t("Checking…") : t("Apply")}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-destructive">{t(error)}</p>}
    </div>
  );
}
