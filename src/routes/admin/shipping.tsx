import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, ErrorState, TableSkeleton } from "@/components/admin/ui";
import { adminGetSettings, adminSaveSetting } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/shipping")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Shipping — Swastik Camphor Admin" },
      { name: "description", content: "Set delivery charges, free shipping thresholds and estimated delivery times." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Shipping — Swastik Camphor Admin" },
      { property: "og:description", content: "Configure Swastik Camphor delivery charges." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ShippingPage,
});

const FIELDS = [
  { key: "shipping_flat_rate", label: "Flat delivery charge (₹)" },
  { key: "shipping_free_above", label: "Free delivery above (₹)" },
  { key: "shipping_cod_fee", label: "Cash on delivery fee (₹)" },
  { key: "shipping_eta", label: "Estimated delivery time" },
  { key: "shipping_zones", label: "Serviceable states / zones" },
];

function ShippingPage() {
  const qc = useQueryClient();
  const get = useServerFn(adminGetSettings);
  const save = useServerFn(adminSaveSetting);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-settings"], queryFn: () => get(undefined as never) });
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    const next: Record<string, string> = {};
    for (const f of FIELDS) next[f.key] = String((data as Record<string, Record<string, unknown>>)[f.key]?.["value"] ?? "");
    setValues(next);
  }, [data]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      for (const f of FIELDS) await save({ data: { key: f.key, value: { value: values[f.key] ?? "" } } });
      await qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Shipping settings saved");
    } catch {
      toast.error("Shipping settings could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title="Shipping" description="Delivery charges and coverage" area="settings">
      {error && <ErrorState message="Failed to load shipping settings." />}
      {isLoading && <TableSkeleton rows={4} />}
      {data && (
        <Card className="max-w-xl">
          <form onSubmit={submit} className="space-y-3 text-sm">
            {FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="text-xs uppercase text-muted-foreground">{f.label}</span>
                <input value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2" />
              </label>
            ))}
            <button disabled={busy} className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-60">{busy ? "Saving…" : "Save shipping"}</button>
          </form>
        </Card>
      )}
    </AdminShell>
  );
}
