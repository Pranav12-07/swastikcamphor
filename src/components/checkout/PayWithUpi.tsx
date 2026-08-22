import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { startPayment } from "@/lib/payments.functions";
import { formatINR } from "@/data/products";

const APPS = [
  { id: "gpay", label: "Google Pay", color: "#1A73E8" },
  { id: "phonepe", label: "PhonePe", color: "#5F259F" },
  { id: "paytm", label: "Paytm", color: "#00BAF2" },
  { id: "any", label: "Other UPI apps / UPI ID", color: "#0F766E" },
] as const;

/**
 * Starts a real PhonePe payment. The gateway decides the app/intent flow —
 * the browser never marks anything as paid.
 */
export function PayWithUpi({ orderNumber, amount }: { orderNumber: string; amount: number }) {
  const start = useServerFn(startPayment);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const pay = async (app: (typeof APPS)[number]["id"]) => {
    setBusy(app);
    setFailed(false);
    try {
      const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
      const result = await start({ data: { orderNumber, app, mobile: isMobile } });
      if (!result.ok) {
        toast.error(result.error);
        setFailed(true);
        return;
      }
      window.location.href = result.redirectUrl;
    } catch {
      toast.error("We could not start the payment. Please try again.");
      setFailed(true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="card-premium p-6 md:p-8">
      <h2 className="font-display text-2xl">Pay {formatINR(amount)} securely</h2>
      <div className="gold-rule mt-3 w-14" />
      <p className="mt-4 text-sm text-muted-foreground">
        Choose your UPI app. We open it with the exact amount and confirm your order only after the payment is
        verified by the gateway.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {APPS.map((app) => (
          <button
            key={app.id}
            type="button"
            disabled={busy !== null}
            onClick={() => pay(app.id)}
            className="flex items-center justify-between rounded-xl border border-gold/40 bg-card px-4 py-3.5 text-sm font-medium transition-transform duration-300 hover:-translate-y-0.5 disabled:opacity-60"
          >
            <span className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: app.color }} />
              Pay with {app.label}
            </span>
            {busy === app.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="text-muted-foreground">{formatINR(amount)}</span>
            )}
          </button>
        ))}
      </div>

      {failed && (
        <div className="mt-5 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="font-medium">Unable to open the UPI app</p>
          <p className="mt-1 text-muted-foreground">
            Try another app above, or use “Other UPI apps / UPI ID” to pay from the secure PhonePe page.
          </p>
        </div>
      )}
    </div>
  );
}
