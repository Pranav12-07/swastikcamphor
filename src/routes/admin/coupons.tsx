import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, ErrorState, StatusBadge, TableSkeleton, fmtDate, inr } from "@/components/admin/ui";
import { adminListCoupons, adminSaveCoupon, adminDeleteCoupon } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/coupons")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Coupons — Swastik Camphor Admin" },
      { name: "description", content: "Create and manage discount codes, usage limits and expiry dates for the camphor store." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Coupons — Swastik Camphor Admin" },
      { property: "og:description", content: "Manage Swastik Camphor discount codes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CouponsPage,
});

function CouponsPage() {
  const qc = useQueryClient();
  const list = useServerFn(adminListCoupons);
  const save = useServerFn(adminSaveCoupon);
  const del = useServerFn(adminDeleteCoupon);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-coupons"], queryFn: () => list(undefined as never) });
  const [form, setForm] = useState({ code: "", discount_type: "percentage", discount_value: 10, min_order_amount: 0, max_discount: "", expires_at: "", usage_limit: "" });
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await save({
        data: {
          code: form.code,
          discount_type: form.discount_type as "percentage",
          discount_value: Number(form.discount_value),
          min_order_amount: Number(form.min_order_amount) || 0,
          max_discount: form.max_discount ? Number(form.max_discount) : null,
          starts_at: null,
          expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
          usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
          per_customer_limit: null,
          is_active: true,
        },
      });
      setForm({ code: "", discount_type: "percentage", discount_value: 10, min_order_amount: 0, max_discount: "", expires_at: "", usage_limit: "" });
      await qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Coupon saved");
    } catch {
      toast.error("Could not save that coupon.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title="Coupons" description="Discount codes for the storefront" area="marketing">
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {error && <ErrorState message="Failed to load coupons." />}
          {isLoading && <TableSkeleton rows={4} />}
          {data && (
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="py-2">Code</th><th>Discount</th><th>Min order</th><th>Used</th><th>Expires</th><th>Status</th><th className="text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {(data as Array<Record<string, unknown>>).map((c) => (
                    <tr key={c["id"] as string} className="border-t border-border">
                      <td className="py-2 font-mono font-medium">{c["code"] as string}</td>
                      <td>{c["discount_type"] === "percentage" ? `${Number(c["discount_value"])}%` : inr(Number(c["discount_value"]))}</td>
                      <td className="tabular-nums">{inr(Number(c["min_order_amount"] ?? 0))}</td>
                      <td className="tabular-nums">{Number(c["usage_count"] ?? 0)}{c["usage_limit"] ? ` / ${Number(c["usage_limit"])}` : ""}</td>
                      <td className="text-muted-foreground">{c["expires_at"] ? fmtDate(c["expires_at"] as string) : "No expiry"}</td>
                      <td><StatusBadge status={c["is_active"] ? "active" : "disabled"} /></td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={async () => {
                              try { await save({ data: { ...(c as never), id: c["id"] as string, is_active: !c["is_active"] } }); await qc.invalidateQueries({ queryKey: ["admin-coupons"] }); }
                              catch { toast.error("Could not update that coupon."); }
                            }}
                            className="rounded border border-input px-2 py-1 text-xs"
                          >
                            {c["is_active"] ? "Disable" : "Enable"}
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`Delete coupon ${c["code"]}?`)) return;
                              try { await del({ data: { id: c["id"] as string } }); await qc.invalidateQueries({ queryKey: ["admin-coupons"] }); toast.success("Coupon deleted"); }
                              catch { toast.error("Could not delete that coupon."); }
                            }}
                            className="rounded border border-destructive/40 p-1.5 text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!data.length && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No coupons yet.</td></tr>}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        <Card>
          <h2 className="font-semibold">New coupon</h2>
          <form onSubmit={submit} className="mt-3 space-y-3 text-sm">
            <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="CODE" className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono uppercase" />
            <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2">
              <option value="percentage">Percentage off</option>
              <option value="fixed">Fixed amount off</option>
            </select>
            <input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} placeholder="Discount value" className="w-full rounded-md border border-input bg-background px-3 py-2" />
            <input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: Number(e.target.value) })} placeholder="Minimum order value" className="w-full rounded-md border border-input bg-background px-3 py-2" />
            <input type="number" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} placeholder="Maximum discount (optional)" className="w-full rounded-md border border-input bg-background px-3 py-2" />
            <input type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} placeholder="Usage limit (optional)" className="w-full rounded-md border border-input bg-background px-3 py-2" />
            <input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2" />
            <button disabled={busy} className="w-full rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground disabled:opacity-60">{busy ? "Saving…" : "Create coupon"}</button>
          </form>
        </Card>
      </div>
    </AdminShell>
  );
}
