import { Link, createFileRoute } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { formatINR } from "@/data/products";
import { useCatalog } from "@/lib/catalog";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — Swastik Camphor" },
      { name: "description", content: "Review your Swastik Camphor selection before checkout." },
      { property: "og:title", content: "Your Cart — Swastik Camphor" },
      { property: "og:description", content: "Review your pure camphor selection before checkout." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { products } = useCatalog();
  const cart = useCart();
  const [code, setCode] = useState("");

  return (
    <>
      <PageHeader eyebrow="Cart" title="Your pooja essentials" />
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        {cart.lines.length === 0 ? (
          <div className="card-premium p-10 text-center">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Link
              to="/shop"
              className="mt-6 inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
            <ul className="space-y-4">
              {cart.lines.map((line) => {
                const product = products.find((p) => p.slug === line.slug);
                if (!product) return null;
                return (
                  <li key={`${line.slug}-${line.size}`} className="card-premium flex gap-4 p-4">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-24 w-24 shrink-0 rounded-2xl object-cover"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-display text-lg">{product.name}</h2>
                      <p className="text-sm text-muted-foreground">Size: {line.size}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1 rounded-full border border-gold/40">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() => cart.setQty(line.slug, line.size, line.qty - 1)}
                            className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent/15"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm">{line.qty}</span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() => cart.setQty(line.slug, line.size, line.qty + 1)}
                            className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent/15"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="font-medium">{formatINR(product.price * line.qty)}</span>
                        <button
                          type="button"
                          onClick={() => cart.remove(line.slug, line.size)}
                          className="ml-auto inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" /> Remove
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <aside className="card-premium h-fit p-6">
              <h2 className="font-display text-xl">Order summary</h2>
              <div className="gold-rule mt-3 w-14" />
              <dl className="mt-5 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd>{formatINR(cart.subtotal)}</dd>
                </div>
                {cart.discount > 0 && (
                  <div className="flex justify-between text-primary">
                    <dt>Discount ({cart.coupon})</dt>
                    <dd>-{formatINR(cart.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Shipping</dt>
                  <dd>{cart.shipping === 0 ? "Free" : formatINR(cart.shipping)}</dd>
                </div>
                <div className="flex justify-between border-t border-border pt-3 font-display text-lg">
                  <dt>Total</dt>
                  <dd>{formatINR(cart.total)}</dd>
                </div>
              </dl>

              <p className="mt-3 text-xs text-muted-foreground">
                Free shipping on orders above {formatINR(cart.freeShippingAbove)}.
              </p>

              {cart.coupon ? (
                <button
                  type="button"
                  onClick={cart.removeCoupon}
                  className="mt-4 text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  Remove coupon
                </button>
              ) : (
                <form
                  className="mt-4 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (cart.applyCoupon(code)) toast.success("Coupon applied");
                    else toast.error("Invalid coupon code");
                    setCode("");
                  }}
                >
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Coupon code"
                    aria-label="Coupon code"
                    maxLength={30}
                    className="min-w-0 flex-1 rounded-full border border-gold/40 bg-card px-4 py-2 text-sm"
                  />
                  <button type="submit" className="rounded-full border border-gold/50 px-4 py-2 text-sm">
                    Apply
                  </button>
                </form>
              )}

              <Link
                to="/checkout"
                className="mt-6 block rounded-full bg-primary px-6 py-3 text-center text-sm font-semibold text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5"
              >
                Proceed to checkout
              </Link>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}