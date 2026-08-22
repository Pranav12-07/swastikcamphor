import { formatINR } from "@/data/products";
import type { OrderEvent, TrackedOrder } from "@/lib/orders.functions";

/** The happy-path fulfilment journey, in order. */
export const TIMELINE = [
  { key: "pending", label: "Order Placed" },
  { key: "confirmed", label: "Order Confirmed" },
  { key: "processing", label: "Processing" },
  { key: "packed", label: "Packed" },
  { key: "shipped", label: "Shipped" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
] as const;

const EXCEPTIONS: Record<string, string> = {
  cancelled: "Cancelled",
  returned: "Returned",
  refund_initiated: "Refund Initiated",
  refunded: "Refunded",
  on_hold: "On Hold",
  payment_failed: "Payment Failed",
};

const pretty = (s: string) => EXCEPTIONS[s] ?? s.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase());

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

const fmtDay = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : null;

export function OrderTracker({ order, events }: { order: TrackedOrder; events: OrderEvent[] }) {
  const exception = EXCEPTIONS[order.status];
  const currentIndex = TIMELINE.findIndex((s) => s.key === order.status);
  const reachedAt = (key: string) =>
    key === "pending"
      ? order.created_at
      : (events.find((e) => e.status === key)?.created_at ?? null);

  const items = order.items ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-6">
        <div className="card-premium p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Order</p>
              <p className="font-display text-2xl">{order.order_number}</p>
              <p className="mt-1 text-sm text-muted-foreground">Placed {fmtDate(order.created_at)}</p>
            </div>
            <span className="rounded-full bg-secondary px-4 py-1.5 text-sm font-medium">
              {pretty(order.status)}
            </span>
          </div>

          {exception ? (
            <p className="mt-5 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
              This order is marked <strong>{exception}</strong>. Please contact us if you need help.
            </p>
          ) : (
            <ol className="mt-7 space-y-0">
              {TIMELINE.map((step, i) => {
                const done = currentIndex >= i;
                const at = reachedAt(step.key);
                return (
                  <li key={step.key} className="grid grid-cols-[24px_1fr] gap-4">
                    <div className="flex flex-col items-center">
                      <span
                        className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full ring-4 transition-colors ${
                          done ? "bg-primary ring-primary/20" : "bg-muted ring-transparent"
                        }`}
                        aria-hidden="true"
                      />
                      {i < TIMELINE.length - 1 && (
                        <span
                          className={`w-px flex-1 ${done && currentIndex > i ? "bg-primary/60" : "bg-border"}`}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <div className="pb-6">
                      <p className={done ? "font-medium" : "text-muted-foreground"}>{step.label}</p>
                      {at && <p className="text-xs text-muted-foreground">{fmtDate(at)}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {order.delivery_note && (
            <p className="mt-2 rounded-xl bg-secondary/60 p-4 text-sm text-muted-foreground">
              {order.delivery_note}
            </p>
          )}
        </div>

        <div className="card-premium p-6">
          <h2 className="font-display text-xl">What you ordered</h2>
          <div className="gold-rule mt-3 w-14" />
          <ul className="mt-4 space-y-2 text-sm">
            {items.map((it, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span className="min-w-0">
                  {it.name}
                  {it.size ? <span className="text-muted-foreground"> ({it.size})</span> : null} ×{" "}
                  {it.qty ?? it.quantity ?? 1}
                </span>
                <span className="shrink-0">
                  {formatINR(Number(it.price ?? 0) * Number(it.qty ?? it.quantity ?? 1))}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatINR(order.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-primary">
                <dt>Discount</dt>
                <dd>-{formatINR(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd>{order.shipping === 0 ? "Free" : formatINR(order.shipping)}</dd>
            </div>
            <div className="flex justify-between font-display text-lg">
              <dt>Total</dt>
              <dd>{formatINR(order.total)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <aside className="space-y-6">
        <div className="card-premium p-6 text-sm">
          <h2 className="font-display text-xl">Shipment</h2>
          <div className="gold-rule mt-3 w-14" />
          <dl className="mt-4 space-y-2">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Courier</dt>
              <dd>{order.courier || "Assigned at dispatch"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Tracking / AWB</dt>
              <dd className="text-right">{order.tracking_number || "Available once shipped"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Expected delivery</dt>
              <dd>{fmtDay(order.expected_delivery) ?? "To be confirmed"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Payment</dt>
              <dd>
                {(order.payment_provider === "cod" ? "Cash on delivery" : "UPI") +
                  " • " +
                  pretty(order.payment_status)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="card-premium p-6 text-sm">
          <h2 className="font-display text-xl">Delivery address</h2>
          <div className="gold-rule mt-3 w-14" />
          <p className="mt-4 font-medium">{order.customer_name}</p>
          <p className="mt-1 text-muted-foreground">
            {order.address}
            <br />
            {order.city}, {order.state} — {order.pincode}
            <br />
            {order.phone}
          </p>
        </div>

        {events.length > 0 && (
          <div className="card-premium p-6 text-sm">
            <h2 className="font-display text-xl">Updates</h2>
            <div className="gold-rule mt-3 w-14" />
            <ul className="mt-4 space-y-3">
              {[...events].reverse().map((e) => (
                <li key={e.id}>
                  <p className="font-medium">{pretty(e.status)}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(e.created_at)}</p>
                  {e.note && <p className="mt-0.5 text-muted-foreground">{e.note}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}
