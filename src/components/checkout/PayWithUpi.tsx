import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, CheckCircle2, Copy, Clock3, Loader2, QrCode, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import QRCode from "qrcode";
import { getPaymentState, submitUpiReference } from "@/lib/payments.functions";
import { formatINR } from "@/data/products";
import { upi } from "@/config/site";


const UPI_APPS = [
  { id: "gpay", label: "Google Pay", scheme: "tez" },
  { id: "phonepe", label: "PhonePe", scheme: "phonepe" },
  { id: "paytm", label: "Paytm", scheme: "paytmmp" },
] as const;

/**
 * UPI-only checkout. A QR is generated for our own UPI ID with the exact order
 * amount and reference. No other payment methods are offered. The browser never
 * marks anything as paid — the server confirms the payment before the order
 * becomes PAID.
 */
export function PayWithUpi({ orderNumber, amount }: { orderNumber: string; amount: number }) {
  const state = useServerFn(getPaymentState);
  const navigate = useNavigate();

  const [qrImage, setQrImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [payState, setPayState] = useState<"PENDING" | "PAID" | "FAILED">("PENDING");
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [appError, setAppError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const upiUri =
    `upi://pay?pa=${encodeURIComponent(upi.vpa)}&pn=${encodeURIComponent(upi.payeeName)}` +
    `&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Order ${orderNumber}`)}` +
    `&tr=${encodeURIComponent(orderNumber)}`;

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(upiUri, { width: 512, margin: 1 })
      .then((img) => { if (alive) setQrImage(img); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [upiUri]);

  /** Polls the authoritative server state until the payment is confirmed. */
  const watchPayment = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(async () => {
      try {
        const result = await state({ data: { orderNumber } });
        setCheckedAt(new Date());
        if (result.state === "PAID") {
          if (timer.current) clearInterval(timer.current);
          setPayState("PAID");
          toast.success("Payment verified");
          setTimeout(() => navigate({ to: "/order-success/$orderNumber", params: { orderNumber } }), 1200);
        } else if (result.state === "FAILED" || result.state === "CANCELLED" || result.state === "EXPIRED") {
          if (timer.current) clearInterval(timer.current);
          setPayState("FAILED");
        } else {
          setPayState("PENDING");
        }
      } catch {
        /* transient network hiccup — keep polling */
      }
    }, 5000);
  }, [navigate, orderNumber, state]);

  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) {
        state({ data: { orderNumber } })
          .then((r) => {
            setCheckedAt(new Date());
            if (r.state === "PAID") {
              setPayState("PAID");
              toast.success("Payment verified");
              navigate({ to: "/order-success/$orderNumber", params: { orderNumber } });
            }
          })
          .catch(() => undefined);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    watchPayment();
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [watchPayment, state, orderNumber, navigate]);

  useEffect(() => {
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [watchPayment]);

  /** Opens a specific UPI app (or the Android chooser) with the order prefilled. */
  const openApp = (id: string, scheme: string) => {
    setAppError(null);
    const link = scheme === "upi" ? upiUri : upiUri.replace("upi://", `${scheme}://`);
    const started = Date.now();
    const onHide = () => { if (document.hidden) setAppError(null); };
    document.addEventListener("visibilitychange", onHide, { once: true });
    window.location.href = link;
    // If we are still visible after a moment, the app never opened.
    setTimeout(() => {
      if (!document.hidden && Date.now() - started < 3000 && id !== "any") {
        setAppError("This app is not installed. Please choose another UPI app.");
      }
    }, 1800);
  };

  const copyVpa = async () => {
    try {
      await navigator.clipboard.writeText(upi.vpa);
      setCopied(true);
      toast.success("UPI ID copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — please note the UPI ID manually");
    }
  };

  return (
    <div className="card-premium p-6 md:p-8">
      <h2 className="font-display text-2xl">Pay {formatINR(amount)} via UPI</h2>
      <div className="gold-rule mt-3 w-14" />
      <p className="mt-4 text-sm text-muted-foreground">
        Scan the QR with any UPI app (Google Pay, PhonePe, Paytm, BHIM) or pay to our UPI ID. Your order is confirmed
        once the payment is verified.
      </p>

      <div
        className={`mt-6 flex items-center gap-3 rounded-xl border p-4 text-sm ${
          payState === "PAID"
            ? "border-emerald-500/40 bg-emerald-500/10"
            : payState === "FAILED"
              ? "border-destructive/40 bg-destructive/5"
              : "border-gold/40 bg-muted/30"
        }`}
        role="status"
        aria-live="polite"
      >
        {payState === "PAID" ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        ) : payState === "FAILED" ? (
          <AlertTriangle className="h-5 w-5 text-destructive" />
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-gold" />
        )}
        <div>
          <p className="font-medium">
            {payState === "PAID"
              ? "Payment verified"
              : payState === "FAILED"
                ? "Payment not completed"
                : "Payment pending — waiting for confirmation"}
          </p>
          <p className="text-xs text-muted-foreground">
            {payState === "PAID"
              ? "Taking you to your order confirmation…"
              : payState === "FAILED"
                ? "No money was captured. Scan the QR again to retry."
                : `We check every 5 seconds${checkedAt ? ` • last checked ${checkedAt.toLocaleTimeString()}` : ""}`}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gold/40 bg-card p-5 text-center">
        <div className="md:hidden">
          <p className="text-sm font-medium">Pay directly with UPI</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {UPI_APPS.map((app) => (
              <button
                key={app.id}
                type="button"
                onClick={() => openApp(app.id, app.scheme)}
                className="rounded-xl border border-gold/40 px-3 py-3 text-xs font-medium transition-transform duration-300 active:scale-95"
              >
                {app.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => openApp("any", "upi")}
            className="mt-2 w-full rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
          >
            Pay with any UPI app
          </button>
          {appError && <p className="mt-2 text-xs text-destructive">{appError}</p>}
        </div>

        <div className="my-5 flex items-center gap-3 md:hidden">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-muted-foreground">OR</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <p className="text-sm font-medium">Scan QR code to pay</p>

        {qrImage ? (
          <img
            src={qrImage}
            alt={`UPI QR code to pay ${formatINR(amount)} for order ${orderNumber}`}
            className="mx-auto mt-4 h-60 w-60 rounded-xl bg-white p-3 shadow-sm"
          />
        ) : (
          <div className="mx-auto mt-4 flex h-60 w-60 items-center justify-center rounded-xl border border-dashed border-gold/50 bg-muted/30">
            <QrCode className="h-20 w-20 text-muted-foreground/40" />
          </div>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          Pay exactly {formatINR(amount)} • Order {orderNumber}
        </p>

        <div className="mt-5 rounded-xl border border-gold/30 bg-muted/30 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">UPI ID</p>
          <p className="mt-1 break-all text-sm font-semibold">{upi.vpa}</p>
          <p className="text-xs text-muted-foreground">{upi.payeeName}</p>
          <button
            type="button"
            onClick={copyVpa}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy UPI ID"}
          </button>
        </div>


      </div>


      <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-gold" /> Your order is marked paid only after the payment is verified.
      </p>
    </div>
  );
}
