import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StoreSettings = Record<string, string>;

const num = (settings: StoreSettings, key: string, fallback: number) => {
  const raw = settings[key];
  const n = raw == null || raw === "" ? NaN : Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

/** Live store settings managed from /admin (shipping, store profile, etc.). */
export function useStoreSettings() {
  const query = useQuery({
    queryKey: ["public-store-settings"],
    staleTime: 60_000,
    queryFn: async (): Promise<StoreSettings> => {
      const { data, error } = await supabase.from("store_settings").select("key,value");
      if (error) throw error;
      const out: StoreSettings = {};
      for (const row of data ?? []) {
        const v = row.value as unknown;
        const value =
          v && typeof v === "object" && "value" in (v as Record<string, unknown>)
            ? (v as Record<string, unknown>)["value"]
            : v;
        out[row.key] = value == null ? "" : String(value);
      }
      return out;
    },
  });

  const settings = query.data ?? {};
  return {
    settings,
    loading: query.isLoading,
    shippingFlat: num(settings, "shipping_flat_rate", 49),
    freeShippingAbove: num(settings, "shipping_free_above", 499),
    codFee: num(settings, "shipping_cod_fee", 0),
    codEnabled: settings["cod_enabled"] !== "false",
    shippingEta: settings["shipping_eta"] ?? "",
    stealDealEnabled: settings["steal_deal_enabled"] !== "false",
    stealDealAmount: num(settings, "steal_deal_amount", 50),
    stealDealMin: num(settings, "steal_deal_min", 499),
    reviewCouponEnabled: settings["review_coupon_enabled"] !== "false",
    reviewCouponAmount: num(settings, "review_coupon_amount", 25),
  };
}
