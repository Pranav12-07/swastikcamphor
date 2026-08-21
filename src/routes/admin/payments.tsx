import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, EmptyState, ErrorState, StatCard, StatusBadge, TableSkeleton, fmtDate, inr } from "@/components/admin/ui";
import { adminListOrders, adminUpdateOrder } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/payments")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Payments — Swastik Camphor Admin" },
      { name: "description", content: "Verify UPI transaction references, mark orders paid and track refunds in one place." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Payments — Swastik Camphor Admin" },
      { property: "og:description", content: "Verify UPI payments for Swastik Camphor orders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const qc = useQueryClient();
  const list = useServerFn(adminListOrders);
  const update = useServerFn(adminUpdateOrder);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-orders"], queryFn: () => list(undefined as never) });
  const [filter, setFilter] = useState("awaiting_verification");

  const orders = (data ?? []) as Array<Record<string, unknown>>;
  const rows = useMemo(() => (filter === "all" ? orders : orders.filter((o) => o["payment_status"] === filter)), [orders, filter]);
  const paid = orders.filter((o) => o["payment_status"] === "paid");
  const pending = orders.filter((o) => o["payment_status"] === "awaiting_verification");
  const cod = orders.filter((o) => o["payment_status"] === "cod_pending");

  async function mark(id: string, payment_status: string) {
    try {
      await update({ data: { id, payment_status } as never });
      await qc.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Payment updated");
    } catch {
      toast.error("Payment status could not be updated.");
    }
  }

  return (
    <AdminShell title="Payments" description="UPI verification and payment history" area="orders">
      {error && <ErrorState message="Failed to load payments." />}
      {isLoading && <TableSkeleton />}
      {data && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Collected" value={inr(paid.reduce((s, o) => s + Number(o["total"] ?? 0), 0))} hint={`${paid.length} paid orders`} tone="good" />
            <StatCard label="Awaiting verification" value={pending.length} hint="UPI references to check" tone={pending.length ? "warn" : "default"} />
            <StatCard label="Cash on delivery" value={cod.length} hint="collect on delivery" />
          </div>

          <Card className="flex flex-wrap gap-2">
            {["awaiting_verification", "pending", "paid", "cod_pending", "refunded", "failed", "all"].map((s) => (
              <button key={s} onClick={() => setFilter(s)} className={`rounded-full border px-3 py-1 text-xs ${filter === s ? "border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground"}`}>
                {s === "all" ? "All" : s.replaceAll("_", " ")}
              </button>
            ))}
          </Card>

          {!rows.length ? (
            <EmptyState title="Nothing to verify here" hint="Payments appear as soon as customers submit a UPI reference." />
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="py-2">Order</th><th>Customer</th><th>Date</th><th>Amount</th><th>Method</th><th>UPI reference</th><th>Status</th><th className="text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {rows.map((o) => (
                    <tr key={o["id"] as string} className="border-t border-border">
                      <td className="py-2 font-medium">
                        <Link to="/admin/orders/$id" params={{ id: o["id"] as string }} className="text-primary">{o["order_number"] as string}</Link>
                      </td>
                      <td>{o["customer_name"] as string}</td>
                      <td className="text-muted-foreground">{fmtDate(o["created_at"] as string)}</td>
                      <td className="tabular-nums">{inr(Number(o["total"] ?? 0))}</td>
                      <td className="uppercase text-muted-foreground">{(o["payment_method"] as string) ?? "upi"}</td>
                      <td className="font-mono text-xs">{(o["payment_reference"] as string) || "—"}</td>
                      <td><StatusBadge status={(o["payment_status"] as string) ?? "pending"} /></td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button onClick={() => mark(o["id"] as string, "paid")} className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">Mark paid</button>
                          <button onClick={() => mark(o["id"] as string, "failed")} className="rounded border border-input px-2 py-1 text-xs">Failed</button>
                          <button onClick={() => mark(o["id"] as string, "refunded")} className="rounded border border-input px-2 py-1 text-xs">Refunded</button>
                        </div>
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
