import { useEffect, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { upi } from "@/config/site";
import { formatINR } from "@/data/products";

function buildUpiUrl(scheme: string, amount: number, orderNumber: string) {
  const params = new URLSearchParams({
    pa: upi.vpa,
    pn: upi.payeeName,
    am: amount.toFixed(2),
    cu: "INR",
    tn: `Order ${orderNumber}`,
    tr: orderNumber,
  });
  return `${scheme}://${scheme === "upi" ? "pay" : "upi/pay"}?${params.toString()}`;
}

const APPS = [
  { id: "gpay", label: "Google Pay", scheme: "tez", color: "#1A73E8" },
  { id: "phonepe", label: "PhonePe", scheme: "phonepe", color: "#5F259F" },
  { id: "any", label: "Any UPI app", scheme: "upi", color: "#0F766E" },
] as const;

export function UpiPayment({
  orderNumber,
  amount,
}: {
  orderNumber: string;
  amount: number;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(buildUpiUrl("upi", amount, orderNumber), { margin: 1, width: 320 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [amount, orderNumber]);

  const copyVpa = async () => {
    try {
      await navigator.clipboard.writeText(upi.vpa);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy. Please note the UPI ID manually.");
    }
  };

  return (
    <div className="card-premium p-6 md:p-8">
      <h2 className="font-display text-2xl">Pay {formatINR(amount)} via UPI</h2>
      <div className="gold-rule mt-3 w-14" />
      <p className="mt-4 text-sm text-muted-foreground">
        Pay with Google Pay, PhonePe, Paytm or any UPI app. On mobile, tap an app below; on desktop, scan the QR.
      </p>

      <div className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-start">
        <div className="mx-auto w-fit rounded-2xl border border-gold/40 bg-card p-3">
          {qr ? (
            <img src={qr} alt={`UPI QR code to pay ${formatINR(amount)}`} className="h-40 w-40" />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </div>

        <div className="space-y-3">
          {APPS.map((app) => (
            <a
              key={app.id}
              href={buildUpiUrl(app.scheme, amount, orderNumber)}
              className="flex items-center justify-between rounded-xl border border-gold/40 bg-card px-4 py-3 text-sm font-medium transition-transform duration-300 hover:-translate-y-0.5"
            >
              <span className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: app.color }} />
                Pay with {app.label}
              </span>
              <span className="text-muted-foreground">{formatINR(amount)}</span>
            </a>
          ))}

          <button
            type="button"
            onClick={copyVpa}
            className="flex w-full items-center justify-between rounded-xl border border-dashed border-gold/50 px-4 py-3 text-sm"
          >
            <span className="font-mono">{upi.vpa}</span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy UPI ID"}
            </span>
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-gold/40 bg-card p-4 text-sm">
        <p className="font-medium">After you pay</p>
        <p className="mt-1 text-muted-foreground">
          We receive your UPI payment for order <span className="font-medium">{orderNumber}</span> automatically and
          will confirm dispatch shortly. No transaction number needed.
        </p>
      </div>
    </div>
  );
}
