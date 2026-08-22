import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, ErrorState, StatCard, TableSkeleton, inr } from "@/components/admin/ui";
import { adminListOrders } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/analytics")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Analytics — Swastik Camphor Admin" },
      { name: "description", content: "Revenue trends, best sellers and order performance for the Swastik Camphor store." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Analytics — Swastik Camphor Admin" },
      { property: "og:description", content: "Revenue trends and best sellers for Swastik Camphor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalyticsPage,
});

const RANGES = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
  { key: "365", label: "1 year" },
];

function AnalyticsPage() {
  const list = useServerFn(adminListOrders);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-orders"], queryFn: () => list(undefined as never) });
  const [range, setRange] = useState("30");

  const stats = useMemo(() => {
    const days = Number(range);
    const since = Date.now() - days * 864e5;
    const orders = ((data ?? []) as Array<Record<string, unknown>>).filter((o) => new Date(o["created_at"] as string).getTime() >= since);
    const paid = orders.filter((o) => o["payment_status"] === "paid");
    const revenue = paid.reduce((s, o) => s + Number(o["total"] ?? 0), 0);

    const byDay = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) byDay.set(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10), 0);
    for (const o of paid) {
      const k = String(o["created_at"]).slice(0, 10);
      if (byDay.has(k)) byDay.set(k, (byDay.get(k) ?? 0) + Number(o["total"] ?? 0));
    }

    const products = new Map<string, { qty: number; revenue: number }>();
    for (const o of orders) {
      for (const it of (o["items"] ?? []) as Array<Record<string, unknown>>) {
        const name = (it["name"] as string) ?? "Item";
        const prev = products.get(name) ?? { qty: 0, revenue: 0 };
        const qty = Number(it["quantity"] ?? 1);
        products.set(name, { qty: prev.qty + qty, revenue: prev.revenue + qty * Number(it["price"] ?? 0) });
      }
    }

    return {
      orders,
      revenue,
      aov: paid.length ? revenue / paid.length : 0,
      series: [...byDay.entries()].map(([date, value]) => ({ date, value })),
      top: [...products.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 8),
      cancelled: orders.filter((o) => o["status"] === "cancelled").length,
    };
  }, [data, range]);

  const max = Math.max(1, ...stats.series.map((s) => s.value));

  return (
    <AdminShell title="Analytics" description="How the store is performing" area="dashboard">
      {error && <ErrorState message="Failed to load analytics." />}
      {isLoading && <TableSkeleton rows={4} />}
      {data && (
        <div className="space-y-4">
          <Card className="flex flex-wrap gap-2">
            {RANGES.map((r) => (
              <button key={r.key} onClick={() => setRange(r.key)} className={`rounded-full border px-3 py-1 text-xs ${range === r.key ? "border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground"}`}>{r.label}</button>
            ))}
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Revenue (paid)" value={inr(stats.revenue)} tone="good" />
            <StatCard label="Orders" value={stats.orders.length} />
            <StatCard label="Average order value" value={inr(Math.round(stats.aov))} />
            <StatCard label="Cancelled" value={stats.cancelled} tone={stats.cancelled ? "warn" : "default"} />
          </div>

          <Card>
            <h2 className="font-semibold">Revenue trend</h2>
            <div className="mt-4 flex h-40 items-end gap-1">
              {stats.series.map((s) => (
                <div key={s.date} className="flex-1" title={`${s.date}: ${inr(s.value)}`}>
                  <div className="w-full rounded-t bg-primary/70" style={{ height: `${Math.max(2, (s.value / max) * 100)}%` }} />
                </div>
              ))}
            </div>
          </Card>

          <Card className="overflow-x-auto">
            <h2 className="font-semibold">Best selling products</h2>
            <table className="mt-3 w-full min-w-[420px] text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr><th className="py-2">Product</th><th>Units</th><th className="text-right">Revenue</th></tr>
              </thead>
              <tbody>
                {stats.top.map((p) => (
                  <tr key={p.name} className="border-t border-border">
                    <td className="py-2">{p.name}</td>
                    <td className="tabular-nums">{p.qty}</td>
                    <td className="text-right tabular-nums">{inr(p.revenue)}</td>
                  </tr>
                ))}
                {!stats.top.length && <tr><td colSpan={3} className="py-6 text-center text-muted-foreground">No sales in this period.</td></tr>}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </AdminShell>
  );
}
