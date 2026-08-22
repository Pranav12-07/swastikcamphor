import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, ErrorState, TableSkeleton } from "@/components/admin/ui";
import { adminGetSettings, adminSaveSetting } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/emails")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Email Management — Swastik Camphor Admin" },
      { name: "description", content: "Choose which order and enquiry emails are sent and where notifications arrive." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Email Management — Swastik Camphor Admin" },
      { property: "og:description", content: "Manage Swastik Camphor order notification emails." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EmailsPage,
});

const TEXT_FIELDS = [
  { key: "email_order_recipient", label: "Send new-order alerts to" },
  { key: "email_from_name", label: "Sender name" },
  { key: "email_reply_to", label: "Reply-to address" },
];

const TOGGLES = [
  { key: "email_notify_new_order", label: "New order notification to the team" },
  { key: "email_notify_customer_confirmation", label: "Order confirmation to the customer" },
  { key: "email_notify_shipping", label: "Shipping update to the customer" },
];

function EmailsPage() {
  const qc = useQueryClient();
  const get = useServerFn(adminGetSettings);
  const save = useServerFn(adminSaveSetting);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-settings"], queryFn: () => get(undefined as never) });
  const [values, setValues] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    const rows = data as Record<string, Record<string, unknown>>;
    const v: Record<string, string> = {};
    for (const f of TEXT_FIELDS) v[f.key] = String(rows[f.key]?.["value"] ?? "");
    const fl: Record<string, boolean> = {};
    for (const t of TOGGLES) fl[t.key] = Boolean(rows[t.key]?.["value"] ?? true);
    setValues(v);
    setFlags(fl);
  }, [data]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      for (const f of TEXT_FIELDS) await save({ data: { key: f.key, value: { value: values[f.key] ?? "" } } });
      for (const t of TOGGLES) await save({ data: { key: t.key, value: { value: flags[t.key] ?? false } } });
      await qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Email settings saved");
    } catch {
      toast.error("Email settings could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title="Email management" description="Order and enquiry notifications" area="settings">
      {error && <ErrorState message="Failed to load email settings." />}
      {isLoading && <TableSkeleton rows={4} />}
      {data && (
        <Card className="max-w-xl">
          <form onSubmit={submit} className="space-y-4 text-sm">
            {TEXT_FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="text-xs uppercase text-muted-foreground">{f.label}</span>
                <input value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2" />
              </label>
            ))}
            <div className="space-y-2">
              {TOGGLES.map((t) => (
                <label key={t.key} className="flex items-center gap-2">
                  <input type="checkbox" checked={flags[t.key] ?? false} onChange={(e) => setFlags({ ...flags, [t.key]: e.target.checked })} className="h-4 w-4" />
                  <span>{t.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Emails are sent from your verified sending domain. Delivery reports are available in your Cloud dashboard.</p>
            <button disabled={busy} className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-60">{busy ? "Saving…" : "Save email settings"}</button>
          </form>
        </Card>
      )}
    </AdminShell>
  );
}
