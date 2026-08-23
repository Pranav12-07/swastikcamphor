import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, EmptyState, ErrorState, StatCard, StatusBadge, TableSkeleton, fmtDate, inr } from "@/components/admin/ui";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { adminListPayments, adminResolvePayment, type AdminPaymentRow } from "@/lib/payments-admin.functions";

export const Route = createFileRoute("/admin/payments")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Payments — Swastik Camphor Admin" },
      { name: "description", content: "Verify UPI transaction references, settle orders, issue refunds and reconcile collections." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Payments — Swastik Camphor Admin" },
      { property: "og:description", content: "Verify UPI payments and refunds for Swastik Camphor orders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentsPage,
});

const FILTERS = ["awaiting_verification", "pending", "paid", "cod_pending", "refunded", "failed", "all"] as const;

function csvEscape(value: string | number | null) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

function PaymentsPage() {
  const qc = useQueryClient();
  // Live ledger: any payment or order change pushes an immediate refresh.
  useRealtimeRefresh("payments", ["admin-payments"]);
  useRealtimeRefresh("orders", ["admin-payments"]);
  const list = useServerFn(adminListPayments);
  const resolve = useServerFn(adminResolvePayment);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: () => list(undefined as never),
    refetchInterval: 30_000,
  });

  const [filter, setFilter] = useState<string>("awaiting_verification");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const rows = useMemo(() => {
    const all = data?.rows ?? [];
    const needle = q.trim().toLowerCase();
    return all.filter((r) => {
      if (filter !== "all") {
        if (filter === "refunded" ? !r.paymentStatus.includes("refund") : r.paymentStatus !== filter) return false;
      }
      if (from && new Date(r.createdAt) < new Date(`${from}T00:00:00`)) return false;
      if (to && new Date(r.createdAt) > new Date(`${to}T23:59:59`)) return false;
      if (!needle) return true;
      return [r.orderNumber, r.customerName, r.email, r.phone, r.reference ?? "", r.gatewayOrderId ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [data, filter, q, from, to]);

  const act = useMutation({
    mutationFn: (input: { orderId: string; action: "approve" | "reject" | "refund" | "mark_cod_collected"; reason?: string; amount?: number; reference?: string }) =>
      resolve({ data: input as never }) as Promise<{ ok: boolean; message?: string; error?: string }>,
    onSuccess: async (res) => {
      if (res.ok) {
        toast.success(res.message ?? "Payment updated");
        await qc.invalidateQueries({ queryKey: ["admin-payments"] });
        await qc.invalidateQueries({ queryKey: ["admin-orders"] });
      } else {
        toast.error(res.error ?? "Could not update this payment.");
      }
    },
    onError: () => toast.error("Could not update this payment."),
    onSettled: () => setBusy(null),
  });

  function run(row: AdminPaymentRow, action: "approve" | "reject" | "refund" | "mark_cod_collected") {
    if (action === "approve" || action === "mark_cod_collected") {
      const reference =
        action === "approve"
          ? (window.prompt(`UPI reference / UTR for ${row.orderNumber}`, row.reference ?? "") ?? "").trim()
          : "";
      if (action === "approve" && !reference) return;
      setBusy(row.orderId);
      act.mutate({ orderId: row.orderId, action, reference });
      return;
    }
    if (action === "reject") {
      const reason = (window.prompt("Why is this payment being rejected?", "We could not find this reference in our bank statement.") ?? "").trim();
      if (!reason) return;
      setBusy(row.orderId);
      act.mutate({ orderId: row.orderId, action, reason });
      return;
    }
    const raw = window.prompt(`Refund amount for ${row.orderNumber} (max ${row.total})`, String(row.total));
    if (raw === null) return;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid refund amount.");
      return;
    }
    const reason = (window.prompt("Refund reason (shown internally, summarised to the customer)", "Customer requested cancellation") ?? "").trim();
    setBusy(row.orderId);
    act.mutate({ orderId: row.orderId, action: "refund", amount, reason });
  }

  function exportCsv() {
    const header = ["Order", "Date", "Customer", "Email", "Phone", "Amount", "Method", "Gateway", "Reference", "Payment status", "Order status", "Paid at"];
    const body = rows.map((r) =>
      [r.orderNumber, r.createdAt, r.customerName, r.email, r.phone, r.total, r.method, r.gateway ?? "", r.reference ?? "", r.paymentStatus, r.orderStatus, r.paidAt ?? ""]
        .map(csvEscape)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `swastik-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const s = data?.summary;

  return (
    <AdminShell title="Payments" description="UPI verification, refunds and collection reconciliation" area="orders">
      {error && <ErrorState message="Failed to load payments." />}
      {isLoading && <TableSkeleton />}
      {data && s && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Collected today" value={inr(s.collectedToday)} hint={`${inr(s.collected7d)} last 7 days`} tone="good" />
            <StatCard label="Awaiting verification" value={s.awaitingCount} hint={`${inr(s.awaitingValue)} to confirm`} tone={s.awaitingCount ? "warn" : "default"} />
            <StatCard label="Cash on delivery" value={s.codCount} hint={`${inr(s.codValue)} to collect`} />
            <StatCard label="Refunded" value={inr(s.refundedValue)} hint={`${s.failedCount} failed attempts`} />
          </div>

          {s.methodSplit.length > 0 && (
            <Card className="flex flex-wrap items-center gap-4 text-sm">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Collected by method</span>
              {s.methodSplit.map((m) => (
                <span key={m.method} className="rounded-full border border-border px-3 py-1">
                  <span className="uppercase">{m.method}</span> · {inr(m.value)} <span className="text-muted-foreground">({m.count})</span>
                </span>
              ))}
              <span className="ml-auto font-medium">Lifetime {inr(s.collectedAll)}</span>
            </Card>
          )}

          <Card className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full border px-3 py-1 text-xs ${filter === f ? "border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground"}`}
                >
                  {f === "all" ? "All" : f.replaceAll("_", " ")}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search order, customer, UTR…"
                className="h-9 min-w-[220px] flex-1 rounded-md border border-input bg-background px-3 text-sm"
              />
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
              <button onClick={exportCsv} className="h-9 rounded-md border border-input px-3 text-sm">Export CSV</button>
            </div>
          </Card>

          {!rows.length ? (
            <EmptyState title="Nothing to verify here" hint="Payments appear as soon as customers submit a UPI reference." />
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2">Order</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.orderId} className="border-t border-border align-top">
                      <td className="py-2 font-medium">
                        <Link to="/admin/orders/$id" params={{ id: r.orderId }} className="text-primary">{r.orderNumber}</Link>
                      </td>
                      <td>
                        <div>{r.customerName}</div>
                        <div className="text-xs text-muted-foreground">{r.phone}</div>
                      </td>
                      <td className="text-muted-foreground">{fmtDate(r.createdAt)}</td>
                      <td className="tabular-nums">{inr(r.total)}</td>
                      <td className="uppercase text-muted-foreground">
                        {r.method}
                        {r.gateway ? <div className="text-[10px] normal-case">{r.gateway}</div> : null}
                      </td>
                      <td className="font-mono text-xs">
                        {r.reference || "—"}
                        {r.duplicateReference && <div className="mt-1 font-sans text-[10px] font-medium text-destructive">Duplicate reference</div>}
                        {r.failureReason && <div className="mt-1 max-w-[200px] font-sans text-[10px] text-muted-foreground">{r.failureReason}</div>}
                      </td>
                      <td>
                        <StatusBadge status={r.paymentStatus} />
                        {r.paidAt && <div className="mt-1 text-[10px] text-muted-foreground">{fmtDate(r.paidAt)}</div>}
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          {r.paymentStatus !== "paid" && !r.paymentStatus.includes("refund") && (
                            <button
                              disabled={busy === r.orderId}
                              onClick={() => run(r, r.paymentStatus === "cod_pending" ? "mark_cod_collected" : "approve")}
                              className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
                            >
                              {r.paymentStatus === "cod_pending" ? "Cash collected" : "Verify & mark paid"}
                            </button>
                          )}
                          {r.paymentStatus === "awaiting_verification" && (
                            <button disabled={busy === r.orderId} onClick={() => run(r, "reject")} className="rounded border border-input px-2 py-1 text-xs disabled:opacity-50">
                              Reject
                            </button>
                          )}
                          {r.paymentStatus === "paid" && (
                            <button disabled={busy === r.orderId} onClick={() => run(r, "refund")} className="rounded border border-input px-2 py-1 text-xs disabled:opacity-50">
                              Refund
                            </button>
                          )}
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
