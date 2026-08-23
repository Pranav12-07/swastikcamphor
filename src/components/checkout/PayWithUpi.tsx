import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, QrCode, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import QRCode from "qrcode";
import { getPaymentState } from "@/lib/payments.functions";
import { formatINR } from "@/data/products";
import { upi } from "@/config/site";

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
        if (result.state === "PAID") {
          if (timer.current) clearInterval(timer.current);
          toast.success("Payment received");
          navigate({ to: "/order-success/$orderNumber", params: { orderNumber } });
        }
      } catch {
        /* transient network hiccup — keep polling */
      }
    }, 5000);
  }, [navigate, orderNumber, state]);

  useEffect(() => {
    watchPayment();
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [watchPayment]);

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

      <div className="mt-6 rounded-2xl border border-gold/40 bg-card p-5 text-center">
        <p className="text-sm font-medium">Scan to pay</p>

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

        <a
          href={upiUri}
          className="mt-4 inline-flex items-center justify-center rounded-xl border border-gold/40 px-5 py-3 text-sm font-medium md:hidden"
        >
          Open UPI app to pay
        </a>

        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Waiting for your payment…
        </p>
      </div>

      <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-gold" /> Your order is marked paid only after the payment is verified.
      </p>
    </div>
  );
}
