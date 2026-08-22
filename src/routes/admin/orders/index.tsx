import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, EmptyState, ErrorState, StatusBadge, TableSkeleton, fmtDate, inr } from "@/components/admin/ui";
import { adminListOrders } from "@/lib/admin.functions";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";


export const Route = createFileRoute("/admin/orders/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Orders — Swastik Camphor Admin" },
      { name: "description", content: "Process camphor orders: confirm, pack, ship and track every customer purchase." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Orders — Swastik Camphor Admin" },
      { property: "og:description", content: "Process and track Swastik Camphor orders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const list = useServerFn(adminListOrders);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-orders"], queryFn: () => list(undefined as never) });
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [payment, setPayment] = useState("all");

  const rows = useMemo(() => {
    let out = (data ?? []) as Array<Record<string, unknown>>;
    const term = q.trim().toLowerCase();
    if (term) out = out.filter((o) => `${o["order_number"]} ${o["customer_name"]} ${o["email"]} ${o["phone"]}`.toLowerCase().includes(term));
    if (status !== "all") out = out.filter((o) => o["status"] === status);
    if (payment !== "all") out = out.filter((o) => o["payment_status"] === payment);
    return out;
  }, [data, q, status, payment]);

  return (
    <AdminShell title="Orders" description="Every purchase, from placed to delivered" area="orders">
      {error && <ErrorState message="Failed to load orders." />}
      {isLoading && <TableSkeleton />}
      {data && (
        <div className="space-y-4">
          <Card className="flex flex-wrap gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order number, name, email or phone" className="min-w-56 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
              {["all", "pending", "confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered", "cancelled", "returned", "refunded"].map((s) => (
                <option key={s} value={s}>{s === "all" ? "All statuses" : s.replaceAll("_", " ")}</option>
              ))}
            </select>
            <select value={payment} onChange={(e) => setPayment(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
              {["all", "pending", "awaiting_verification", "paid", "failed", "refunded", "cod_pending"].map((s) => (
                <option key={s} value={s}>{s === "all" ? "All payments" : s.replaceAll("_", " ")}</option>
              ))}
            </select>
          </Card>

          {!rows.length ? (
            <EmptyState title="No orders match your filters" hint="Try a different status or clear the search." />
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="py-2">Order</th><th>Customer</th><th>Date</th><th>Amount</th><th>Payment</th><th>Status</th><th className="text-right">Open</th></tr>
                </thead>
                <tbody>
                  {rows.map((o) => (
                    <tr key={o["id"] as string} className="border-t border-border">
                      <td className="py-2 font-medium">{o["order_number"] as string}</td>
                      <td>
                        <p>{o["customer_name"] as string}</p>
                        <p className="text-xs text-muted-foreground">{o["email"] as string}</p>
                      </td>
                      <td className="text-muted-foreground">{fmtDate(o["created_at"] as string)}</td>
                      <td className="tabular-nums">{inr(Number(o["total"]))}</td>
                      <td><StatusBadge status={(o["payment_status"] as string) ?? "pending"} /></td>
                      <td><StatusBadge status={(o["status"] as string) ?? "pending"} /></td>
                      <td className="text-right">
                        <Link to="/admin/orders/$id" params={{ id: o["id"] as string }} className="text-xs font-medium text-primary">View →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}
    </AdminShell>
  );
}
