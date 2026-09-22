import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/PageHeader";
import { formatINR } from "@/data/products";
import { useCatalog } from "@/lib/catalog";
import { placeOrder } from "@/lib/api.functions";
import { listMyAddresses, saveMyAddress, type SavedAddress } from "@/lib/account.functions";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { PayWithUpi } from "@/components/checkout/PayWithUpi";


export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Checkout — Swastik Camphor" },
      { name: "description", content: "Complete your Swastik Camphor order with secure delivery details." },
      { property: "og:title", content: "Checkout — Swastik Camphor" },
      { property: "og:description", content: "Complete your pure camphor order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Checkout,
});

const schema = z.object({
  customer_name: z.string().trim().min(2, "Please enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().regex(/^[0-9+\-\s]{6,20}$/, "Enter a valid phone number"),
  address: z.string().trim().min(5, "Enter your full address").max(300),
  city: z.string().trim().min(2, "Enter your city").max(80),
  state: z.string().trim().min(2, "Enter your state").max(80),
  pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
});

const fields = [
  { name: "customer_name", label: "Full name", type: "text", autoComplete: "name" },
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  { name: "phone", label: "Phone", type: "tel", autoComplete: "tel" },
  { name: "address", label: "Delivery address", type: "text", autoComplete: "street-address" },
  { name: "city", label: "City", type: "text", autoComplete: "address-level2" },
  { name: "state", label: "State", type: "text", autoComplete: "address-level1" },
  { name: "pincode", label: "Pincode", type: "text", autoComplete: "postal-code" },
] as const;

function Checkout() {
  const { products } = useCatalog();
  const cart = useCart();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{ email: string; total: number } | null>(null);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>("new");
  const [saveAddress, setSaveAddress] = useState(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    listMyAddresses()
      .then((rows) => {
        if (cancelled) return;
        setAddresses(rows);
        const preferred = rows.find((r) => r.is_default) ?? rows[0];
        if (preferred) setSelectedAddress(preferred.id);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [session]);

  const chosen = addresses.find((a) => a.id === selectedAddress) ?? null;
  const prefill: Record<string, string> = chosen
    ? {
        customer_name: chosen.full_name,
        email: session?.user?.email ?? "",
        phone: chosen.phone,
        address: [chosen.line1, chosen.line2].filter(Boolean).join(", "),
        city: chosen.city,
        state: chosen.state,
        pincode: chosen.pincode,
      }
    : { email: session?.user?.email ?? "" };



  // Login is required before placing an order — the cart is preserved throughout.
  if (!authLoading && !session && !orderNumber) {
    return (
      <>
        <PageHeader
          eyebrow="Checkout"
          title="Sign in to place your order"
          subtitle="Your cart is saved. Sign in with a phone or email OTP and we'll bring you straight back here."
        />
        <div className="mx-auto max-w-md px-4 py-16 text-center md:px-8">
          <Link
            to="/auth"
            search={{ redirect: "/checkout" }}
            className="inline-flex rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground"
          >
            Sign in / Create account
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            Signing in links this order to your account so you can track it any time.
          </p>
        </div>
      </>
    );
  }

  if (orderNumber && placed) {
    return (
      <>
        <PageHeader eyebrow="Order placed" title="Complete your UPI payment" />
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-16 md:px-8">
          <div className="card-premium p-8 text-center">
            <p className="text-muted-foreground">Your order reference is</p>
            <p className="mt-2 font-display text-3xl">{orderNumber}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              Scan the QR below to pay. Your order is confirmed only after the payment is verified.
            </p>
          </div>
          <PayWithUpi orderNumber={orderNumber} amount={placed.total} />

        </div>
      </>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Checkout" title="Your cart is empty" />
        <div className="mx-auto max-w-2xl px-4 py-16 text-center md:px-8">
          <Link
            to="/shop"
            className="inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Browse products
          </Link>
        </div>
      </>
    );
  }

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const raw = Object.fromEntries(form.entries());
    // The receipt goes to the signed-in account's email — never a typed one.
    const parsed = schema.safeParse({ ...raw, email: session?.user?.email ?? raw["email"] });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        next[String(i.path[0])] = i.message;
      });
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const items = cart.lines.map((l) => {
        const p = products.find((x) => x.slug === l.slug)!;
        return { slug: l.slug, name: p.name, size: l.size, qty: l.qty, price: p.price };
      });
      const result = await placeOrder({
        data: {
          ...parsed.data,
          items,
          subtotal: cart.subtotal,
          shipping: cart.shipping,
          discount: cart.discount,
          total: cart.total,
          coupon_code: cart.coupon,
          payment_method: "upi",
        },
      });
      if (session && saveAddress && !chosen) {
        await saveMyAddress({
          data: {
            label: "Home",
            full_name: parsed.data.customer_name,
            phone: parsed.data.phone,
            line1: parsed.data.address,
            city: parsed.data.city,
            state: parsed.data.state,
            pincode: parsed.data.pincode,
            is_default: addresses.length === 0,
          },
        }).catch(() => undefined);
      }
      // Totals come back from the server — it is the pricing authority.
      // The cart is only cleared once the payment is verified (order-success page).
      setPlaced({ email: parsed.data.email, total: result.total });
      setOrderNumber(result.orderNumber);
    } catch (err) {
      toast.error(
        err instanceof Error && err.message && err.message.length < 140
          ? err.message
          : "We could not place your order. Please try again or call us.",
      );
    } finally {
      setBusy(false);
    }

  };

  return (
    <>
      <PageHeader eyebrow="Checkout" title="Delivery details" subtitle="We confirm every order personally before dispatch." />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:px-8 lg:grid-cols-[1.4fr_1fr]">
        <form onSubmit={onSubmit} noValidate className="card-premium grid gap-4 p-6 sm:grid-cols-2">
          {addresses.length > 0 && (
            <fieldset className="sm:col-span-2">
              <legend className="text-sm font-medium">Deliver to</legend>
              <div className="mt-2 grid gap-2">
                {addresses.map((a) => (
                  <label
                    key={a.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-xl border px-4 py-3 text-sm transition-colors ${
                      selectedAddress === a.id ? "border-primary bg-primary/5" : "border-gold/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="saved_address"
                      className="mt-1 accent-primary"
                      checked={selectedAddress === a.id}
                      onChange={() => setSelectedAddress(a.id)}
                    />
                    <span>
                      <span className="font-medium">
                        {a.label} — {a.full_name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {[a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(", ")} • {a.phone}
                      </span>
                    </span>
                  </label>
                ))}
                <label
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm transition-colors ${
                    selectedAddress === "new" ? "border-primary bg-primary/5" : "border-gold/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="saved_address"
                    className="accent-primary"
                    checked={selectedAddress === "new"}
                    onChange={() => setSelectedAddress("new")}
                  />
                  Use a new address
                </label>
              </div>
            </fieldset>
          )}
          {session?.user?.email && (
            <div className="sm:col-span-2">
              <span className="text-sm font-medium">Email</span>
              <p className="mt-1.5 w-full rounded-xl border border-gold/40 bg-muted/40 px-4 py-2.5 text-sm">
                {session.user.email}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your receipt will be sent to this address from your signed-in account.
              </p>
            </div>
          )}
          {fields
            .filter((f) => !(f.name === "email" && session?.user?.email))
            .map((f) => (
            <div key={f.name} className={f.name === "address" ? "sm:col-span-2" : ""}>
              <label htmlFor={f.name} className="text-sm font-medium">
                {f.label}
              </label>
              <input
                key={`${f.name}-${selectedAddress}`}
                id={f.name}
                name={f.name}
                type={f.type}
                autoComplete={f.autoComplete}
                defaultValue={prefill[f.name] ?? ""}
                aria-invalid={Boolean(errors[f.name])}
                className="mt-1.5 w-full rounded-xl border border-gold/40 bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              {errors[f.name] && <p className="mt-1 text-xs text-destructive">{errors[f.name]}</p>}
            </div>
          ))}
          {session && !chosen && (
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={saveAddress}
                onChange={(e) => setSaveAddress(e.target.checked)}
                className="accent-primary"
              />
              Save this address to my account for next time
            </label>
          )}

          <div className="sm:col-span-2 rounded-xl border border-gold/40 bg-card/50 p-4 text-sm">
            <p className="font-medium">Payment method</p>
            <p className="mt-1 text-muted-foreground">UPI QR — secure, instant, verified by the gateway.</p>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="sm:col-span-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5 disabled:opacity-60"
          >
            {busy ? "Placing order…" : `Continue to UPI payment • ${formatINR(cart.total)}`}
          </button>
        </form>

        <aside className="card-premium h-fit p-6">
          <h2 className="font-display text-xl">Your order</h2>
          <div className="gold-rule mt-3 w-14" />
          <ul className="mt-5 space-y-3 text-sm">
            {cart.lines.map((l) => {
              const p = products.find((x) => x.slug === l.slug);
              if (!p) return null;
              return (
                <li key={`${l.slug}-${l.size}`} className="flex justify-between gap-3">
                  <span className="min-w-0">
                    {p.name} <span className="text-muted-foreground">({l.size}) × {l.qty}</span>
                  </span>
                  <span className="shrink-0">{formatINR(p.price * l.qty)}</span>
                </li>
              );
            })}
          </ul>
          <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd>{cart.shipping === 0 ? "Free" : formatINR(cart.shipping)}</dd>
            </div>
            {cart.discount > 0 && (
              <div className="flex justify-between text-primary">
                <dt>Discount</dt>
                <dd>-{formatINR(cart.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between font-display text-lg">
              <dt>Total</dt>
              <dd>{formatINR(cart.total)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </>
  );
}