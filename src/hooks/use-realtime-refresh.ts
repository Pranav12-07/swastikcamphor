import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Refresh the given react-query keys whenever a row in `table` changes.
 * Falls back silently when realtime is unavailable.
 */
export function useRealtimeRefresh(table: string, queryKeys: string[]) {
  const qc = useQueryClient();
  const keys = queryKeys.join("|");

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}-${keys}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => {
        for (const key of keys.split("|")) {
          void qc.invalidateQueries({ queryKey: [key] });
        }
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, keys, qc]);
}
