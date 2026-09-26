import { toast } from "sonner";
import { useCatalog } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";

/** First-order code promoted across the site. Shown only while it is an active coupon in /admin/coupons. */
export const WELCOME_CODE = "SWASTIK10";

export function useWelcomeOffer() {
  const { coupons } = useCatalog();
  const { t } = useI18n();
  const coupon = coupons.find((c) => c.code === WELCOME_CODE) ?? null;

  const amount = coupon
    ? coupon.discount_type === "fixed"
      ? `₹${coupon.discount_value.toLocaleString("en-IN")}`
      : `${coupon.discount_value}%`
    : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(WELCOME_CODE);
      toast.success(t("Code copied"));
    } catch {
      toast.info(`${t("Use code")} ${WELCOME_CODE}`);
    }
  };

  return { coupon, code: WELCOME_CODE, amount, copy };
}
