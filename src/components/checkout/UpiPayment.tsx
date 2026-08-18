import { useEffect, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { upi } from "@/config/site";
import { formatINR } from "@/data/products";
import { submitUpiReference } from "@/lib/api.functions";

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
  email,
  amount,
}: {
  orderNumber: string;
  email: string;
  amount: number;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
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

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (reference.trim().length < 6) {
      toast.error("Enter the 12-digit UPI transaction / UTR number");
      return;
    }
    setBusy(true);
    try {
      await submitUpiReference({ data: { order_number: orderNumber, email, reference: reference.trim() } });
      setDone(true);
      toast.success("Payment reference received — we'll verify and confirm shortly.");
    } catch {
      toast.error("We could not save your reference. Please WhatsApp us the screenshot.");
    } finally {
      setBusy(false);
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

      {done ? (
        <div className="mt-6 rounded-xl border border-gold/40 bg-card p-4 text-sm">
          <p className="font-medium">Payment reference received</p>
          <p className="mt-1 text-muted-foreground">
            We're verifying your payment for order <span className="font-medium">{orderNumber}</span> and will confirm
            dispatch shortly.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 border-t border-border pt-5">
          <label htmlFor="upi-ref" className="text-sm font-medium">
            After paying, enter the UPI transaction / UTR number
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="upi-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 412345678901"
              className="w-full rounded-xl border border-gold/40 bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={busy}
              className="shrink-0 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Submitting…" : "I have paid"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
