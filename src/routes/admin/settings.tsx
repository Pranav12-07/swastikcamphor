import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, ErrorState, TableSkeleton } from "@/components/admin/ui";
import { adminGetSettings, adminSaveSetting } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/settings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Store Settings — Swastik Camphor Admin" },
      { name: "description", content: "Store name, contact details, UPI payee and social links for Swastik Camphor." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Store Settings — Swastik Camphor Admin" },
      { property: "og:description", content: "Configure the Swastik Camphor storefront." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

const FIELDS = [
  { key: "store_name", label: "Store name" },
  { key: "support_email", label: "Support email" },
  { key: "support_phone", label: "Support phone" },
  { key: "whatsapp_number", label: "WhatsApp number" },
  { key: "address", label: "Business address" },
  { key: "upi_vpa", label: "UPI ID (VPA)" },
  { key: "upi_payee", label: "UPI payee name" },
  { key: "instagram_url", label: "Instagram URL" },
  { key: "facebook_url", label: "Facebook URL" },
  { key: "youtube_url", label: "YouTube URL" },
];

function SettingsPage() {
  const qc = useQueryClient();
  const get = useServerFn(adminGetSettings);
  const save = useServerFn(adminSaveSetting);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-settings"], queryFn: () => get(undefined as never) });
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    const next: Record<string, string> = {};
    for (const f of FIELDS) {
      const row = (data as Record<string, Record<string, unknown>>)[f.key];
      next[f.key] = String(row?.["value"] ?? "");
    }
    setValues(next);
  }, [data]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      for (const f of FIELDS) await save({ data: { key: f.key, value: { value: values[f.key] ?? "" } } });
      await qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Settings saved");
    } catch {
      toast.error("Settings could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title="Store settings" description="Business details used across the storefront" area="settings">
      {error && <ErrorState message="Failed to load settings." />}
      {isLoading && <TableSkeleton rows={5} />}
      {data && (
        <Card className="max-w-2xl">
          <form onSubmit={submit} className="grid gap-3 text-sm sm:grid-cols-2">
            {FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="text-xs uppercase text-muted-foreground">{f.label}</span>
                <input
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2"
                />
              </label>
            ))}
            <div className="sm:col-span-2">
              <button disabled={busy} className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-60">{busy ? "Saving…" : "Save settings"}</button>
            </div>
          </form>
        </Card>
      )}
    </AdminShell>
  );
}
