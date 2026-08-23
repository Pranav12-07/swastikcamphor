import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, ErrorState, StatusBadge, TableSkeleton, fmtDate, inr } from "@/components/admin/ui";
import { adminGetOrder, adminUpdateOrder } from "@/lib/admin.functions";
import { adminResendInvoice } from "@/lib/payments-admin.functions";

export const Route = createFileRoute("/admin/orders/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Order Detail — Swastik Camphor Admin" },
      { name: "description", content: "Review order items, delivery address, payment reference and shipment tracking." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Order Detail — Swastik Camphor Admin" },
      { property: "og:description", content: "Review and update a Swastik Camphor order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrderDetailPage,
});

const STATUSES = ["pending", "confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered", "cancelled", "returned", "refunded"];
const PAYMENTS = ["pending", "awaiting_verification", "paid", "failed", "cancelled", "refunded", "cod_pending"];

function OrderDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const get = useServerFn(adminGetOrder);
  const update = useServerFn(adminUpdateOrder);
  const resendInvoice = useServerFn(adminResendInvoice);
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-order", id], queryFn: () => get({ data: { id } }) });
  const [tracking, setTracking] = useState("");
  const [courier, setCourier] = useState("");
  const [notes, setNotes] = useState("");
  const [expected, setExpected] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [dirty, setDirty] = useState(false);

  const order = (data?.order ?? null) as Record<string, unknown> | null;
  const events = (data?.events ?? []) as Array<Record<string, unknown>>;
  const items = (order?.["items"] ?? []) as Array<Record<string, unknown>>;

  async function patch(fields: Record<string, unknown>, ok: string) {
    try {
      await update({ data: { id, ...fields } as never });
      await qc.invalidateQueries({ queryKey: ["admin-order", id] });
      toast.success(ok);
    } catch {
      toast.error("That update could not be saved.");
    }
  }

  return (
    <AdminShell title={order ? `Order ${order["order_number"]}` : "Order"} description="Full order detail and fulfilment" area="orders" actions={<Link to="/admin/orders" className="rounded-md border border-input px-3 py-1.5 text-sm">Back to orders</Link>}>
      {error && <ErrorState message="We could not load this order." />}
      {isLoading && <TableSkeleton rows={5} />}
      {order && (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <Card>
              <h2 className="font-semibold">Items</h2>
              <table className="mt-3 w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="py-2">Product</th><th>Qty</th><th className="text-right">Line total</th></tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="py-2">{(it["name"] as string) ?? "Item"}{it["size"] ? ` · ${it["size"] as string}` : ""}</td>
                      <td>{Number(it["quantity"] ?? 1)}</td>
                      <td className="text-right tabular-nums">{inr(Number(it["price"] ?? 0) * Number(it["quantity"] ?? 1))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{inr(Number(order["subtotal"] ?? 0))}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span>{inr(Number(order["shipping"] ?? 0))}</span></div>
                {Number(order["discount"] ?? 0) > 0 && <div className="flex justify-between text-muted-foreground"><span>Discount</span><span>-{inr(Number(order["discount"]))}</span></div>}
                <div className="flex justify-between font-semibold"><span>Total</span><span>{inr(Number(order["total"] ?? 0))}</span></div>
              </div>
            </Card>

            <Card>
              <h2 className="font-semibold">Customer &amp; delivery</h2>
              <div className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="font-medium">{order["customer_name"] as string}</p>
                  <p className="text-muted-foreground">{order["email"] as string}</p>
                  <p className="text-muted-foreground">{order["phone"] as string}</p>
                </div>
                <div className="text-muted-foreground">
                  <p>{order["address"] as string}</p>
                  <p>{order["city"] as string} {order["state"] as string} {order["pincode"] as string}</p>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="font-semibold">Timeline</h2>
              <ol className="mt-3 space-y-2 text-sm">
                <li className="flex gap-3"><span className="text-muted-foreground">{fmtDate(order["created_at"] as string)}</span><span>Order placed</span></li>
                {events.map((e) => (
                  <li key={e["id"] as string} className="flex gap-3">
                    <span className="text-muted-foreground">{fmtDate(e["created_at"] as string)}</span>
                    <span>{(e["status"] as string).replaceAll("_", " ")}{e["note"] ? ` — ${e["note"] as string}` : ""}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <h2 className="font-semibold">Fulfilment</h2>
              <label className="mt-3 block text-xs uppercase text-muted-foreground">Order status</label>
              <select value={(order["status"] as string) ?? "pending"} onChange={(e) => patch({ status: e.target.value }, "Order status updated")} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {STATUSES.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
              </select>
              <label className="mt-3 block text-xs uppercase text-muted-foreground">Payment status</label>
              <select value={(order["payment_status"] as string) ?? "pending"} onChange={(e) => patch({ payment_status: e.target.value }, "Payment status updated")} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {PAYMENTS.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
              </select>
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <StatusBadge status={(order["payment_method"] as string) ?? "upi"} />
                
              </div>
            </Card>

            <Card>
              <h2 className="font-semibold">Shipment</h2>
              <input
                defaultValue={(order["courier"] as string) ?? ""}
                onChange={(e) => { setCourier(e.target.value); setDirty(true); }}
                placeholder="Courier (e.g. Delhivery)"
                className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <input
                defaultValue={(order["tracking_number"] as string) ?? ""}
                onChange={(e) => { setTracking(e.target.value); setDirty(true); }}
                placeholder="Tracking number"
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <input
                defaultValue={(order["expected_delivery"] as string) ?? ""}
                onChange={(e) => { setExpected(e.target.value); setDirty(true); }}
                placeholder="Expected delivery (e.g. 26 Aug 2026)"
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <textarea
                defaultValue={(order["delivery_note"] as string) ?? ""}
                onChange={(e) => { setDeliveryNote(e.target.value); setDirty(true); }}
                rows={2}
                placeholder="Note shown to the customer in status emails"
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <textarea
                defaultValue={(order["admin_notes"] as string) ?? ""}
                onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
                rows={3}
                placeholder="Internal notes (never shown to the customer)"
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <button
                disabled={!dirty}
                onClick={() => patch(
                  {
                    courier: courier || (order["courier"] as string) || null,
                    tracking_number: tracking || (order["tracking_number"] as string) || null,
                    admin_notes: notes || (order["admin_notes"] as string) || null,
                    expected_delivery: expected || (order["expected_delivery"] as string) || null,
                    delivery_note: deliveryNote || (order["delivery_note"] as string) || null,
                  },
                  "Shipment details saved",
                )}
                className="mt-3 w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                Save shipment details
              </button>
              {order["payment_status"] === "paid" && (
                <button
                  disabled={sendingInvoice}
                  onClick={async () => {
                    setSendingInvoice(true);
                    try {
                      const res = await resendInvoice({ data: { orderId: id } });
                      toast.success(res.sent ? "Invoice emailed to the customer" : "Customer is unsubscribed — email not sent");
                    } catch {
                      toast.error("Could not email the invoice.");
                    } finally {
                      setSendingInvoice(false);
                    }
                  }}
                  className="mt-2 w-full rounded-md border border-input px-3 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {sendingInvoice ? "Sending invoice…" : "Email PDF invoice again"}
                </button>
              )}
            </Card>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
