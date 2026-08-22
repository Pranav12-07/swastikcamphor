import { Link, createFileRoute } from "@tanstack/react-router";
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
import { UpiPayment } from "@/components/checkout/UpiPayment";


export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Checkout — Swastik Camphor" },
      { name: "description", content: "Complete your Swastik Camphor order with secure delivery details." },
      { property: "og:title", content: "Checkout — Swastik Camphor" },
      { property: "og:description", content: "Complete your pure camphor order." },
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
  const { session, loading: authLoading } = useAuth();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [method, setMethod] = useState<"upi" | "cod">("upi");
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
        <PageHeader
          eyebrow="Order placed"
          title={method === "upi" ? "Complete your UPI payment" : "Dhanyavaad! Your order is placed"}
        />
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-16 md:px-8">
          <div className="card-premium p-8 text-center">
            <p className="text-muted-foreground">Your order reference is</p>
            <p className="mt-2 font-display text-3xl">{orderNumber}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              {method === "upi"
                ? "Pay securely below with Google Pay, PhonePe or any UPI app to confirm dispatch."
                : "Our team will call or email you shortly to confirm delivery. Please keep cash ready on delivery."}
            </p>
          </div>
          {method === "upi" && (
            <UpiPayment orderNumber={orderNumber} email={placed.email} amount={placed.total} />
          )}
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/orders/$orderNumber"
              params={{ orderNumber }}
              className="inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Track this order
            </Link>
            <Link
              to="/shop"
              className="inline-flex rounded-full border border-gold/40 px-6 py-2.5 text-sm font-medium"
            >
              Continue shopping
            </Link>
          </div>
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
    const parsed = schema.safeParse(raw);
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
          payment_method: method,
        },
      });
      setPlaced({ email: parsed.data.email, total: cart.total });
      cart.clear();
      setOrderNumber(result.orderNumber);
    } catch {
      toast.error("We could not place your order. Please try again or call us.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Checkout" title="Delivery details" subtitle="We confirm every order personally before dispatch." />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:px-8 lg:grid-cols-[1.4fr_1fr]">
        <form onSubmit={onSubmit} noValidate className="card-premium grid gap-4 p-6 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.name} className={f.name === "address" ? "sm:col-span-2" : ""}>
              <label htmlFor={f.name} className="text-sm font-medium">
                {f.label}
              </label>
              <input
                id={f.name}
                name={f.name}
                type={f.type}
                autoComplete={f.autoComplete}
                aria-invalid={Boolean(errors[f.name])}
                className="mt-1.5 w-full rounded-xl border border-gold/40 bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              {errors[f.name] && <p className="mt-1 text-xs text-destructive">{errors[f.name]}</p>}
            </div>
          ))}
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-medium">Payment method</legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {([
                { id: "upi", label: "UPI — Google Pay / PhonePe", hint: "Instant, secure QR or app payment" },
                { id: "cod", label: "Cash on delivery", hint: "Pay the courier when it arrives" },
              ] as const).map((option) => (
                <label
                  key={option.id}
                  className={`flex cursor-pointer flex-col rounded-xl border px-4 py-3 text-sm transition-colors ${
                    method === option.id ? "border-primary bg-primary/5" : "border-gold/40"
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <input
                      type="radio"
                      name="payment_method"
                      value={option.id}
                      checked={method === option.id}
                      onChange={() => setMethod(option.id)}
                      className="accent-primary"
                    />
                    {option.label}
                  </span>
                  <span className="mt-1 pl-6 text-xs text-muted-foreground">{option.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button
            type="submit"
            disabled={busy}
            className="sm:col-span-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5 disabled:opacity-60"
          >
            {busy
              ? "Placing order…"
              : method === "upi"
                ? `Continue to UPI payment • ${formatINR(cart.total)}`
                : `Place order • ${formatINR(cart.total)}`}
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