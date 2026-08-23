import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Live payment updates for a single order.
 *
 * Subscribes to the customer's own order row so the payment screen reacts the
 * instant the backend (webhook, gateway poll or admin verification) changes the
 * payment status — polling stays only as a fallback.
 */
export function useOrderRealtime(orderNumber: string, onChange: () => void) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!orderNumber) return;
    const channel = supabase
      .channel(`order-live-${orderNumber}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `order_number=eq.${orderNumber}` },
        () => onChange(),
      )
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => {
      setConnected(false);
      void supabase.removeChannel(channel);
    };
    // onChange is expected to be stable (useCallback) at call sites
  }, [orderNumber, onChange]);

  return connected;
}
