import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  button_text: string | null;
  link_url: string | null;
  placement: string;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
};

/** Live homepage banners managed from the admin portal. Falls back to [] on error. */
export function useBanners(placement: "hero" | "promo") {
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("banners")
        .select("id,title,subtitle,image_url,button_text,link_url,placement,sort_order,starts_at,ends_at")
        .eq("is_active", true)
        .eq("placement", placement)
        .order("sort_order");
      if (cancelled || error || !data) return;
      const now = Date.now();
      setBanners(
        (data as Banner[]).filter(
          (b) =>
            (!b.starts_at || new Date(b.starts_at).getTime() <= now) &&
            (!b.ends_at || new Date(b.ends_at).getTime() >= now),
        ),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [placement]);

  return banners;
}
