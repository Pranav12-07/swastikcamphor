import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, StatCard, StatusBadge, TableSkeleton, ErrorState, inr, fmtDate } from "@/components/admin/ui";
import { adminDashboardStats } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard — Swastik Camphor Admin" },
      { name: "description", content: "Live sales, orders, stock and customer overview for the Swastik Camphor store." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Dashboard — Swastik Camphor Admin" },
      { property: "og:description", content: "Live sales, orders, stock and customer overview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

function Sparkline({ data }: { data: Array<{ date: string; revenue: number }> }) {
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const first = data[0]?.date;
  const last = data[data.length - 1]?.date;
  const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "");
  return (
    <div>
      <div className="flex h-32 items-end gap-1">
        {data.map((d) => (
          <div key={d.date} className="flex h-full flex-1 items-end" title={`${fmt(d.date)}: ${inr(d.revenue)}`}>
            <div
              className="w-full rounded-t bg-primary/70 transition-all"
              style={{ height: `${d.revenue > 0 ? Math.max(6, (d.revenue / max) * 100) : 2}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
        <span>{fmt(first)}</span>
        <span>Peak {inr(max)}</span>
        <span>{fmt(last)}</span>
      </div>
    </div>
  );
}


function DashboardPage() {
  const fn = useServerFn(adminDashboardStats);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-stats"], queryFn: () => fn(undefined as never) });

  return (
    <AdminShell title="Dashboard" description="Everything happening in your store right now" area="dashboard">
      {error && <ErrorState message="We could not load your dashboard. Refresh to try again." />}
      {isLoading && <TableSkeleton rows={4} />}
      {data && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Revenue (paid)" value={inr(data.revenuePaid)} hint={`${inr(data.revenueAll)} incl. unpaid`} tone="good" />
            <StatCard label="Total orders" value={data.totalOrders} hint={`${data.ordersToday} today`} />
            <StatCard label="Customers" value={data.totalCustomers} />
            <StatCard label="Needs action" value={data.pendingOrders + data.awaitingPayment} hint={`${data.pendingOrders} pending · ${data.awaitingPayment} to verify`} tone="warn" />
            <StatCard label="Products" value={`${data.activeProducts}/${data.totalProducts}`} hint="active / total" />
            <StatCard label="Processing" value={data.processingOrders} />
            <StatCard label="Delivered" value={data.deliveredOrders} />
            <StatCard label="Stock alerts" value={data.lowStock.length + data.outOfStock.length} hint={`${data.outOfStock.length} out of stock`} tone={data.outOfStock.length ? "warn" : "default"} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">Revenue — last 30 days</h2>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>Today {inr(data.revenueToday)}</span>
                  <span>7d {inr(data.revenueWeek)}</span>
                  <span>30d {inr(data.revenueMonth)}</span>
                  <span>1y {inr(data.revenueYear)}</span>
                </div>
              </div>
              <div className="mt-4">
                <Sparkline data={data.series} />
              </div>
            </Card>
            <Card>
              <h2 className="font-semibold">Stock alerts</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {[...data.outOfStock, ...data.lowStock].slice(0, 8).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{p.name}</span>
                    <StatusBadge status={p.stock === 0 ? "out_of_stock" : "low_stock"} />
                  </li>
                ))}
                {!data.outOfStock.length && !data.lowStock.length && <li className="text-muted-foreground">All products are well stocked.</li>}
              </ul>
              <Link to="/admin/inventory" className="mt-3 inline-block text-xs font-medium text-primary">Manage inventory →</Link>
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Recent orders</h2>
              <Link to="/admin/orders" className="text-xs font-medium text-primary">View all →</Link>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="py-2">Order</th><th>Customer</th><th>Date</th><th>Amount</th><th>Payment</th><th>Status</th><th /></tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((o) => (
                    <tr key={o.id} className="border-t border-border">
                      <td className="py-2 font-medium">{o.order_number}</td>
                      <td>{o.customer_name}</td>
                      <td className="text-muted-foreground">{fmtDate(o.created_at)}</td>
                      <td className="tabular-nums">{inr(o.total)}</td>
                      <td><StatusBadge status={o.payment_status} /></td>
                      <td><StatusBadge status={o.status} /></td>
                      <td className="text-right">
                        <Link to="/admin/orders/$id" params={{ id: o.id }} className="text-xs font-medium text-primary">Open</Link>
                      </td>
                    </tr>
                  ))}
                  {!data.recentOrders.length && <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No orders yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="font-semibold">Recent customers</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {data.recentCustomers.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{c.full_name ?? "Guest"} <span className="text-muted-foreground">{c.email}</span></span>
                    <span className="text-xs text-muted-foreground">{fmtDate(c.created_at)}</span>
                  </li>
                ))}
                {!data.recentCustomers.length && <li className="text-muted-foreground">No registered customers yet.</li>}
              </ul>
            </Card>
            <Card>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Recent reviews</h2>
                <Link to="/admin/reviews" className="text-xs font-medium text-primary">Moderate →</Link>
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {data.recentReviews.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{"★".repeat(r.rating)} {r.name} — {r.product_slug}</span>
                    <StatusBadge status={r.approved ? "active" : "pending"} />
                  </li>
                ))}
                {!data.recentReviews.length && <li className="text-muted-foreground">No reviews yet.</li>}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
