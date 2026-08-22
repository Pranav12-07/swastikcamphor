import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { OrderTracker } from "@/components/orders/OrderTracker";
import { trackOrder, type OrderEvent, type TrackedOrder } from "@/lib/orders.functions";

export const Route = createFileRoute("/track-order")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Track Your Order — Swastik Camphor" },
      {
        name: "description",
        content:
          "Track your Swastik Camphor order with your order ID and email — see packing, dispatch, courier details and expected delivery.",
      },
      { property: "og:title", content: "Track Your Order — Swastik Camphor" },
      { property: "og:description", content: "Live status and courier tracking for your camphor order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrackOrderPage,
});

function TrackOrderPage() {
  const track = useServerFn(trackOrder);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ order: TrackedOrder; events: OrderEvent[] } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const data = await track({
        data: {
          orderNumber: String(form.get("orderNumber") ?? "").trim(),
          email: String(form.get("email") ?? "").trim(),
        },
      });
      setResult(data);
    } catch {
      toast.error("We could not find an order with those details.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Order tracking"
        title="Track your order"
        subtitle="Enter your order ID and the email you used at checkout to see exactly where your parcel is."
      />
      <section className="mx-auto w-full max-w-5xl px-4 py-12 md:px-8">
        <form onSubmit={onSubmit} className="card-premium grid gap-4 p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label htmlFor="orderNumber" className="text-sm font-medium">
              Order ID
            </label>
            <input
              id="orderNumber"
              name="orderNumber"
              required
              placeholder="SC…"
              className="mt-1.5 w-full rounded-xl border border-gold/40 bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium">
              Email used on the order
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1.5 w-full rounded-xl border border-gold/40 bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Looking…" : "Track"}
          </button>
        </form>

        {result && (
          <div className="mt-10">
            <OrderTracker order={result.order} events={result.events} />
          </div>
        )}
      </section>
    </>
  );
}
