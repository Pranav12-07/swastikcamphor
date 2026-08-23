import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { OrderTracker } from "@/components/orders/OrderTracker";
import { getMyOrder, getMyReceiptUrl, type TrackedOrder } from "@/lib/orders.functions";
import { downloadReceiptPdf } from "@/lib/receipt";

export const Route = createFileRoute("/_authenticated/orders/$orderNumber")({
  head: () => ({
    meta: [
      { title: "Order Tracking — Swastik Camphor" },
      { name: "description", content: "Live status, courier details and delivery timeline for your order." },
      { property: "og:title", content: "Order Tracking — Swastik Camphor" },
      { property: "og:description", content: "Follow your Swastik Camphor order from packing to delivery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrderTrackingPage,
});

function OrderTrackingPage() {
  const { orderNumber } = Route.useParams();
  const fetchOrder = useServerFn(getMyOrder);
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-order", orderNumber],
    queryFn: () => fetchOrder({ data: { orderNumber } }),
    // keeps the customer's view in step with admin updates
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });

  return (
    <>
      <PageHeader eyebrow="Track order" title={`Order ${orderNumber}`} subtitle="Where your parcel is right now." />
      <section className="mx-auto w-full max-w-6xl px-4 py-12 md:px-8">
        <Link to="/account" className="text-sm text-primary underline-offset-4 hover:underline">
          ← Back to my orders
        </Link>
        <div className="mt-6">
          {isLoading && <p className="text-sm text-muted-foreground">Loading your order…</p>}
          {error && <p className="text-sm text-destructive">We could not load this order.</p>}
          {data && (
            <>
              <OrderTracker order={data.order} events={data.events} />
              {data.order.payment_status === "paid" && <InvoiceButton order={data.order} />}
            </>
          )}
        </div>
      </section>
    </>
  );
}

/** Branded PDF invoice for a paid order, generated in the browser on demand. */
function InvoiceButton({ order }: { order: TrackedOrder }) {
  const [busy, setBusy] = useState(false);
  const hostedUrl = useServerFn(getMyReceiptUrl);

  async function download() {
    if (busy) return;
    setBusy(true);
    try {
      // Prefer the same hosted PDF that was emailed on payment; fall back to
      // generating it in the browser if storage is unavailable.
      try {
        const { url } = await hostedUrl({ data: { orderNumber: order.order_number } });
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      } catch {
        /* fall through to local generation */
      }
      await downloadReceiptPdf({
        orderNumber: order.order_number,
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_provider ?? "UPI",
        paymentReference: null,
        customerName: order.customer_name,
        email: order.email,
        phone: order.phone,
        address: `${order.address}, ${order.city}, ${order.state} ${order.pincode}`,
        items: (order.items ?? []).map((i) => ({
          name: i.name ?? "Item",
          size: i.size ?? "",
          qty: Number(i.qty ?? i.quantity ?? 1),
          price: Number(i.price ?? 0),
        })),
        subtotal: Number(order.subtotal),
        shipping: Number(order.shipping),
        discount: Number(order.discount),
        tax: Number(order.tax),
        total: Number(order.total),
      });
    } catch {
      toast.error("Could not generate the invoice. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={busy}
      className="mt-6 inline-flex items-center gap-2 rounded-full border border-gold/40 px-6 py-2.5 text-sm font-medium disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Download invoice (PDF)
    </button>
  );
}
