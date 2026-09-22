import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, CheckCircle2, Copy, Clock3, Loader2, QrCode, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import QRCode from "qrcode";
import { getGatewayStatus, getPaymentState, startPayment, submitUpiReference } from "@/lib/payments.functions";
import { formatINR } from "@/data/products";
import { upi } from "@/config/site";
import { useOrderRealtime } from "@/hooks/use-order-realtime";
import { Button } from "@/components/ui/button";


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
  const submitRef = useServerFn(submitUpiReference);
  const navigate = useNavigate();

  const [qrImage, setQrImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [payState, setPayState] = useState<"PENDING" | "AWAITING" | "PAID" | "FAILED">("PENDING");
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [appError, setAppError] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [sending, setSending] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [gateway, setGateway] = useState<boolean | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [gatewayQr, setGatewayQr] = useState<string | null>(null);
  const status = useServerFn(getGatewayStatus);
  const start = useServerFn(startPayment);


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

  /** One authoritative status check against the server (the browser never decides). */
  const checkNow = useCallback(async () => {
    try {
      const result = await state({ data: { orderNumber } });
      setCheckedAt(new Date());
      setExpiresAt(result.expiresAt ? new Date(result.expiresAt) : null);
      if (result.state === "PAID") {
        if (timer.current) clearInterval(timer.current);
        setPayState("PAID");
        toast.success("Payment verified");
        setTimeout(() => navigate({ to: "/order-success/$orderNumber", params: { orderNumber } }), 1200);
      } else if (result.state === "FAILED" || result.state === "CANCELLED" || result.state === "EXPIRED") {
        if (timer.current) clearInterval(timer.current);
        setPayState("FAILED");
      } else if (result.state === "AWAITING") {
        setPayState("AWAITING");
      } else {
        setPayState("PENDING");
      }
    } catch {
      /* transient network hiccup — the next tick retries */
    }
  }, [navigate, orderNumber, state]);

  /** Polls the authoritative server state until the payment is confirmed. */
  const watchPayment = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => void checkNow(), 5000);
  }, [checkNow]);

  // Instant push from the backend (webhook / gateway poll / admin verification).
  const live = useOrderRealtime(orderNumber, checkNow);

  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) void checkNow();
    };
    document.addEventListener("visibilitychange", onVisible);
    void checkNow();
    watchPayment();
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [watchPayment, checkNow]);

  // Countdown for the payment window.
  useEffect(() => {
    if (!expiresAt) { setRemaining(null); return; }
    const tick = () => setRemaining(Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  useEffect(() => {
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [watchPayment]);

  // Is the PhonePe gateway configured? Decides between the live checkout and the manual UPI fallback.
  useEffect(() => {
    let alive = true;
    status({})
      .then((r) => { if (alive) setGateway(Boolean(r.configured)); })
      .catch(() => { if (alive) setGateway(false); });
    return () => { alive = false; };
  }, [status]);

  const isMobile = typeof navigator !== "undefined" && /android|iphone|ipad|ipod/i.test(navigator.userAgent);

  /**
   * PhonePe's hosted checkout only renders the live QR when it runs as a real
   * top-level page. Inside an iframe (editor preview, embeds) it degrades to a
   * blurred "Click to view QR" screen — so always break out of the frame.
   */
  const openPaymentPage = (url: string) => {
    const framed = typeof window !== "undefined" && window.top !== window.self;
    if (!framed) {
      window.location.href = url;
      return;
    }
    try {
      // Same-origin parents allow a direct top-level navigation.
      if (window.top) {
        window.top.location.href = url;
        return;
      }
    } catch {
      /* cross-origin parent — fall through to a new tab */
    }
    const tab = window.open(url, "_blank", "noopener,noreferrer");
    if (!tab) window.location.href = url;
  };


  /**
   * Starts a real PhonePe transaction on the server and hands the customer to
   * the gateway (hosted page, UPI app intent, or a dynamic gateway QR).
   */
  const payViaGateway = async (app: "gpay" | "phonepe" | "paytm" | "any" | "qr") => {
    if (starting) return;
    setStarting(app);
    setAppError(null);
    try {
      const result = await start({ data: { orderNumber, app, mobile: isMobile && app !== "qr" } });
      if (!result.ok) {
        // Gateway refused at the merchant level (e.g. IP allow-list): switch the
        // customer to the direct UPI QR instead of leaving them stuck.
        if ("blocked" in result && result.blocked) {
          setGateway(false);
          setGatewayQr(null);
        }
        toast.error(result.error);
        return;
      }

      if (app === "qr") {
        if (result.qrData) {
          const img = await QRCode.toDataURL(result.qrData, { width: 512, margin: 1 });
          setGatewayQr(img);
          toast.success("Scan the QR — we confirm your payment automatically");
        } else {
          toast.error("The gateway did not return a QR. Please use the pay button instead.");
        }
        void checkNow();
        return;
      }
      const target = result.intentUrl ?? result.redirectUrl;
      if (!target) {
        toast.error("Could not open the payment page. Please try again.");
        return;
      }
      openPaymentPage(target);
    } catch {
      toast.error("Could not start the payment. Please try again.");
    } finally {
      setStarting(null);
    }
  };


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

  /** Sends the UTR to the server so our team can verify the transfer. */
  const sendReference = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    try {
      const result = await submitRef({ data: { orderNumber, reference: reference.trim() } });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.state === "PAID") {
        setPayState("PAID");
        navigate({ to: "/order-success/$orderNumber", params: { orderNumber } });
        return;
      }
      setPayState("AWAITING");
      toast.success("Reference received — we are verifying your payment");
      navigate({ to: "/order-success/$orderNumber", params: { orderNumber } });
    } catch {
      toast.error("Could not submit the reference. Please try again.");
    } finally {
      setSending(false);
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

      {payState !== "PENDING" && (
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
        ) : payState === "AWAITING" ? (
          <Clock3 className="h-5 w-5 text-gold" />
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-gold" />
        )}
        <div>
          <p className="font-medium">
            {payState === "PAID"
              ? "Payment verified"
              : payState === "FAILED"
                ? "Payment not completed"
                : payState === "AWAITING"
                  ? "Reference received — verification in progress"
                  : "Payment pending — waiting for confirmation"}
          </p>
          <p className="text-xs text-muted-foreground">
            {payState === "PAID"
              ? "Taking you to your order confirmation…"
              : payState === "FAILED"
                ? "No money was captured. Scan the QR again to retry."
                : payState === "AWAITING"
                  ? "Our team confirms UPI transfers within a few hours. You will get an email the moment it is verified."
                  : `${live ? "Live — confirms automatically" : "Checking every 5 seconds"}${
                      checkedAt ? ` • last checked ${checkedAt.toLocaleTimeString()}` : ""
                    }${
                      remaining != null && remaining > 0
                        ? ` • QR valid for ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
                        : ""
                    }`}
          </p>
        </div>

      </div>

      {gateway && payState !== "PAID" && (
        <section className="mt-6 overflow-hidden rounded-2xl border border-phonepe/25 bg-phonepe-surface p-5 shadow-sm sm:p-6" aria-label="PhonePe secure payment">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-phonepe text-xl font-bold text-phonepe-foreground" aria-hidden="true">
                पे
              </span>
              <div className="text-left">
                <p className="text-2xl font-bold text-phonepe">PhonePe</p>
                <p className="text-sm font-semibold text-muted-foreground">UPI GATEWAY</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-phonepe sm:max-w-32">
              <ShieldCheck className="h-6 w-6 shrink-0" aria-hidden="true" />
              <span className="text-xs font-semibold leading-tight">Safe &amp; secure transactions</span>
            </div>
          </div>

          <div className="mt-5 text-left">
            <p className="text-base font-semibold text-foreground">Continue UPI payment through PhonePe Gateway.</p>
            <p className="mt-1 text-sm text-muted-foreground">Pay securely using PhonePe or any supported UPI app.</p>
          </div>

          <Button
            type="button"
            onClick={() => void payViaGateway("any")}
            disabled={starting !== null}
            size="lg"
            className="mt-5 h-12 w-full rounded-full bg-primary px-5 text-base font-semibold text-primary-foreground shadow-md transition-transform duration-300 hover:-translate-y-0.5 hover:bg-primary/90"
          >
            {starting === "any" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Continue to UPI payment · {formatINR(amount)}
          </Button>

          <p className="mt-3 text-center text-xs font-medium text-muted-foreground">
            Pay with PhonePe&nbsp;&nbsp; | &nbsp;&nbsp;Fast&nbsp;&nbsp; · &nbsp;&nbsp;Secure&nbsp;&nbsp; · &nbsp;&nbsp;Trusted
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 border-t border-phonepe/15 pt-4 text-phonepe">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-phonepe text-xs font-bold text-phonepe-foreground" aria-hidden="true">पे</span>
            <span className="text-xs font-semibold">Powered by PhonePe UPI Gateway</span>
          </div>

          {appError && <p className="mt-2 text-xs text-destructive">{appError}</p>}
        </section>
      )}

      {(!gateway || gatewayQr) && (
      <div className="mt-6 rounded-2xl border border-gold/40 bg-card p-5 text-center">
        {!gateway && (
          <>
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
          </>
        )}

        <p className="mb-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-destructive">
          Live payment — real money will be debited
        </p>

        <p className="text-sm font-medium">
          {gatewayQr ? "Scan this gateway QR to pay" : "Scan QR code to pay"}
        </p>




        {(gatewayQr ?? qrImage) ? (
          <img
            src={(gatewayQr ?? qrImage) as string}
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

        {!gateway && (
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
        )}
      </div>
      )}

      {!gateway && payState !== "PAID" && (
        <form onSubmit={sendReference} className="mt-6 rounded-2xl border border-gold/30 bg-muted/20 p-5 text-left">
          <label htmlFor="upi-reference" className="text-sm font-medium">
            Already paid? Share your UPI reference
          </label>
          <p className="mt-1 text-xs text-muted-foreground">
            Copy the 12-digit UTR / transaction ID from your UPI app receipt so we can confirm your order.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              id="upi-reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. 418923746512"
              inputMode="numeric"
              maxLength={40}
              className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-gold"
            />
            <button
              type="submit"
              disabled={sending || reference.trim().length < 6}
              className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5 disabled:opacity-50"
            >
              {sending ? "Submitting…" : "Submit reference"}
            </button>
          </div>
        </form>
      )}




      <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-gold" /> Your order is marked paid only after the payment is verified.
      </p>
    </div>
  );
}
