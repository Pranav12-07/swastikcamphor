import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Loader2, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { PayWithUpi } from "@/components/checkout/PayWithUpi";
import { getPaymentState } from "@/lib/payments.functions";
import { formatINR } from "@/data/products";
import { useCart } from "@/lib/cart";
import { downloadReceiptPdf } from "@/lib/receipt";
import { useOrderRealtime } from "@/hooks/use-order-realtime";

export const Route = createFileRoute("/_authenticated/order-success/$orderNumber")({
  head: () => ({
    meta: [
      { title: "Order Confirmation — Swastik Camphor" },
      { name: "description", content: "Payment confirmation and order summary for your Swastik Camphor order." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Order Confirmation — Swastik Camphor" },
      { property: "og:description", content: "Your pure camphor order confirmation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrderSuccessPage,
});

const POLL_TIMEOUT_MS = 3 * 60 * 1000;

function SuccessCheck() {
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
      <motion.circle
        cx="60"
        cy="60"
        r="52"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, ease: "easeInOut" }}
        style={{ rotate: -90, transformOrigin: "60px 60px" }}
      />
      <motion.path
        d="M38 62 L54 78 L84 45"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.45, delay: 0.6, ease: "easeOut" }}
      />
    </svg>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 24 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-2 w-2 rounded-sm"
          style={{
            left: `${(i * 37) % 100}%`,
            background: i % 3 === 0 ? "hsl(var(--primary))" : i % 3 === 1 ? "#d4af37" : "#0f766e",
          }}
          initial={{ y: -20, opacity: 0, rotate: 0 }}
          animate={{ y: 320, opacity: [0, 1, 1, 0], rotate: 360 }}
          transition={{ duration: 2.2, delay: (i % 8) * 0.12, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

function OrderSuccessPage() {
  const { orderNumber } = Route.useParams();
  const fetchState = useServerFn(getPaymentState);
  const cart = useCart();
  const startedAt = useRef(Date.now());
  const [timedOut, setTimedOut] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cleared = useRef(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["payment-state", orderNumber],
    queryFn: () => fetchState({ data: { orderNumber } }),
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      if (state === "AWAITING") return 15000;
      if (!state || state === "PENDING") {
        if (Date.now() - startedAt.current > POLL_TIMEOUT_MS) return false;
        return 3000;
      }
      return false;
    },
    refetchOnWindowFocus: true,
  });

  // Live push from the backend: the screen flips the moment the payment is settled.
  const onOrderChange = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["payment-state", orderNumber] });
  }, [queryClient, orderNumber]);
  const live = useOrderRealtime(orderNumber, onOrderChange);


  useEffect(() => {
    if (data?.state === "PENDING" && Date.now() - startedAt.current > POLL_TIMEOUT_MS) setTimedOut(true);
  }, [data]);

  useEffect(() => {
    if ((data?.state === "PAID" || data?.state === "COD" || data?.state === "AWAITING") && !cleared.current) {
      cleared.current = true;
      setPopupOpen(data.state === "PAID");
      cart.clear();
    }
  }, [data, cart]);


  const state = data?.state;

  const handleDownloadReceipt = async () => {
    if (!data || data.state !== "PAID") return;
    setDownloading(true);
    try {
      await downloadReceiptPdf({
        orderNumber: data.orderNumber,
        paymentStatus: data.paymentStatus,
        paymentMethod: data.paymentMethod,
        paymentReference: data.paymentReference,
        customerName: data.customerName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        items: data.items.map((i) => ({ name: i.name, size: i.size, qty: i.qty, price: i.price })),
        subtotal: data.subtotal,
        shipping: data.shipping,
        discount: data.discount,
        tax: data.tax,
        total: data.total,
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Order"
        title={
          state === "PAID"
            ? "Payment successful 🎉"
            : state === "COD"
              ? "Order confirmed"
              : state === "AWAITING"
                ? "Payment under verification"
                : state === "PENDING" || !state
                  ? "Verifying your payment…"
                  : "Payment not completed"
        }

        subtitle={`Order #${orderNumber}`}
      />

      <section className="relative mx-auto w-full max-w-3xl px-4 py-12 md:px-8">
        {isLoading && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your order…
          </div>
        )}
        {error && <p className="text-sm text-destructive">We could not load this order.</p>}

        {data && (state === "PAID" || state === "COD") && (
          <div className="relative">
            {state === "PAID" && <Confetti />}
            <div className="card-premium flex flex-col items-center p-8 text-center">
              <SuccessCheck />
              <h2 className="mt-4 font-display text-2xl">Thank you for your order 🙏</h2>

              <p className="mt-2 text-sm text-muted-foreground">
                {state === "PAID"
                  ? "Your payment is complete and your receipt has been emailed to you. We are packing your camphor with care and will dispatch it shortly."
                  : "Your order is confirmed. Please keep the exact amount ready — we are packing your camphor with care and will dispatch it shortly."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                We truly appreciate you choosing Swastik Camphor for your pooja.
              </p>
              {state === "PAID" && data.email && (
                <p className="mt-1 text-xs text-muted-foreground">Receipt sent to {data.email}</p>
              )}

              <dl className="mt-6 grid w-full gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-xl border border-gold/30 p-3">
                  <dt className="text-xs uppercase text-muted-foreground">Order ID</dt>
                  <dd className="font-medium">#{data.orderNumber}</dd>
                </div>
                <div className="rounded-xl border border-gold/30 p-3">
                  <dt className="text-xs uppercase text-muted-foreground">
                    {state === "PAID" ? "Amount paid" : "Amount due"}
                  </dt>
                  <dd className="font-medium">{formatINR(data.total)}</dd>
                </div>
                <div className="rounded-xl border border-gold/30 p-3">
                  <dt className="text-xs uppercase text-muted-foreground">Payment method</dt>
                  <dd className="font-medium">{data.paymentMethod}</dd>
                </div>
                <div className="rounded-xl border border-gold/30 p-3">
                  <dt className="text-xs uppercase text-muted-foreground">Payment status</dt>
                  <dd className="font-medium uppercase">{data.paymentStatus.replaceAll("_", " ")}</dd>
                </div>
              </dl>
              {data.paymentReference && (
                <p className="mt-3 font-mono text-xs text-muted-foreground">
                  Payment reference: {data.paymentReference}
                </p>
              )}
            </div>

            <div className="card-premium mt-6 p-6">
              <h3 className="font-display text-xl">Your items</h3>
              <ul className="mt-4 space-y-3 text-sm">
                {data.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    {item.image && (
                      <img src={item.image} alt={item.name} className="h-12 w-12 rounded-lg object-cover" />
                    )}
                    <span className="min-w-0 flex-1">
                      {item.name} <span className="text-muted-foreground">({item.size}) × {item.qty}</span>
                    </span>
                    <span>{formatINR(item.price * item.qty)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd>{formatINR(data.subtotal)}</dd>
                </div>
                {data.discount > 0 && (
                  <div className="flex justify-between text-primary">
                    <dt>Discount</dt>
                    <dd>-{formatINR(data.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Shipping</dt>
                  <dd>{data.shipping === 0 ? "Free" : formatINR(data.shipping)}</dd>
                </div>
                {data.tax > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Tax</dt>
                    <dd>{formatINR(data.tax)}</dd>
                  </div>
                )}
                <div className="flex justify-between font-display text-lg">
                  <dt>Total</dt>
                  <dd>{formatINR(data.total)}</dd>
                </div>
              </dl>
              <p className="mt-4 text-sm text-muted-foreground">
                Delivering to {data.customerName}, {data.address}. Expected delivery in 3–6 working days.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/orders/$orderNumber"
                params={{ orderNumber }}
                className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                View order details
              </Link>
              {state === "PAID" && (
                <button
                  type="button"
                  onClick={handleDownloadReceipt}
                  disabled={downloading}
                  className="inline-flex items-center gap-2 rounded-full border border-gold/40 px-6 py-2.5 text-sm font-medium disabled:opacity-60"
                >
                  {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Download receipt (PDF)
                </button>
              )}
              <Link to="/shop" className="rounded-full border border-gold/40 px-6 py-2.5 text-sm font-medium">
                Continue shopping
              </Link>
            </div>
          </div>
        )}

        {data && state === "PENDING" && (
          <div className="card-premium p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <h2 className="mt-4 font-display text-xl">
              {timedOut ? "Payment verification in progress" : "Verifying your payment…"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {timedOut
                ? "Payment status is still being confirmed. Please check your Orders page before trying again."
                : "We're checking your payment status with the bank. Please do not make another payment."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/orders/$orderNumber"
                params={{ orderNumber }}
                className="rounded-full border border-gold/40 px-6 py-2.5 text-sm font-medium"
              >
                Go to my orders
              </Link>
            </div>
          </div>
        )}

        {data && state === "AWAITING" && (
          <div className="card-premium p-8 text-center">
            <h2 className="font-display text-xl">Thank you — we received your payment reference</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Reference <span className="font-mono">{data.paymentReference ?? "—"}</span> for {formatINR(data.total)} is
              being verified by our team. You will get a confirmation email as soon as it clears — usually within a few
              hours. Please do not pay again.
            </p>
            <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className={`h-2 w-2 rounded-full ${live ? "animate-pulse bg-emerald-500" : "bg-muted-foreground/40"}`}
                aria-hidden
              />
              {live ? "Live — this page updates the moment it is verified" : "Checking for updates…"}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/orders/$orderNumber"
                params={{ orderNumber }}
                className="rounded-full border border-gold/40 px-6 py-2.5 text-sm font-medium"
              >
                Track this order
              </Link>
              <Link to="/shop" className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground">
                Continue shopping
              </Link>
            </div>
          </div>
        )}



        {data && (state === "FAILED" || state === "CANCELLED" || state === "EXPIRED") && (
          <div className="space-y-6">
            <div className="card-premium p-8 text-center">
              <h2 className="font-display text-2xl text-destructive">
                {state === "CANCELLED" ? "Payment cancelled" : state === "EXPIRED" ? "Payment expired" : "Payment failed"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {state === "CANCELLED"
                  ? "Your payment was cancelled. No amount has been treated as a successful purchase."
                  : "We couldn't complete your payment. Your order has NOT been confirmed."}
              </p>
            </div>
            <PayWithUpi orderNumber={orderNumber} amount={data.total} />
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/cart" className="rounded-full border border-gold/40 px-6 py-2.5 text-sm font-medium">
                Return to cart
              </Link>
              <Link to="/checkout" className="rounded-full border border-gold/40 px-6 py-2.5 text-sm font-medium">
                Back to checkout
              </Link>
            </div>
          </div>
        )}
      </section>

      <AnimatePresence>
        {popupOpen && data && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="card-premium relative w-full max-w-sm p-7 text-center"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
            >
              <button
                type="button"
                onClick={() => setPopupOpen(false)}
                aria-label="Close"
                className="absolute right-3 top-3 text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="mx-auto w-fit">
                <SuccessCheck />
              </div>
              <h3 className="mt-3 font-display text-xl">🎉 Payment Successful!</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Your payment of <span className="font-semibold text-foreground">{formatINR(data.total)}</span> has been
                received successfully. Your order has been placed.
              </p>
              <p className="mt-2 text-sm font-medium">Order ID: #{data.orderNumber}</p>
              <div className="mt-5 flex flex-col gap-2">
                <Link
                  to="/orders/$orderNumber"
                  params={{ orderNumber }}
                  className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  View order
                </Link>
                <button
                  type="button"
                  onClick={handleDownloadReceipt}
                  disabled={downloading}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-gold/40 px-6 py-2.5 text-sm font-medium disabled:opacity-60"
                >
                  {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Download receipt
                </button>
                <Link to="/shop" className="rounded-full border border-gold/40 px-6 py-2.5 text-sm font-medium">
                  Continue shopping
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
