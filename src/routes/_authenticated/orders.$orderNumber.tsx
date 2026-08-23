import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { OrderTracker } from "@/components/orders/OrderTracker";
import { getMyOrder, type TrackedOrder } from "@/lib/orders.functions";
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
