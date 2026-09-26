import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { formatINR, isTwinPack, matchingTwin, twinSavings, twinSavingsPct } from "@/data/products";
import { useCatalog } from "@/lib/catalog";
import { useStoreSettings } from "@/lib/store-settings";
import { canonicalLink, seoMeta } from "@/lib/seo";
import { useI18n } from "@/lib/i18n";
import { FreeShippingProgress } from "@/components/cart/FreeShippingProgress";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      ...seoMeta({
        title: "Your Cart | Swastik Camphor",
        description: "Review your Swastik Camphor order and check out securely.",
        path: "/cart",
      }),
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: canonicalLink("/cart"),
  }),
  component: CartPage,
});

function CartPage() {
  const cart = useCart();
  const { session } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [upselling, setUpselling] = useState(false);
  const { products } = useCatalog();
  const { shippingFlat } = useStoreSettings();

  const switchToTwin = (slug: string, singleSize: string, twinLabel: string) => {
    cart.setQty(slug, singleSize, 0);
    cart.add(slug, twinLabel, 1, { skipUpsell: true });
  };

  // --- Live savings breakdown (all from the cart context / store settings) ---
  const lineInfo = (slug: string, size: string) => {
    const p = products.find((x) => x.slug === slug);
    const opt = p?.sizeOptions?.find((o) => o.label === size);
    return { product: p, opt, price: opt?.price ?? p?.price ?? 0, mrp: opt?.mrp ?? opt?.price ?? p?.price ?? 0 };
  };
  const itemSavings = cart.lines.reduce((sum, l) => {
    const { price, mrp } = lineInfo(l.slug, l.size);
    return sum + (mrp > price ? (mrp - price) * l.qty : 0);
  }, 0);
  const shippingSaved = cart.subtotal > 0 && cart.shipping === 0 ? shippingFlat : 0;
  const totalSaved = itemSavings + cart.stealDeal + shippingSaved;

  // A single-jar line whose Twin Pack isn't already in the cart.
  const upgradeFor = (slug: string, size: string) => {
    const product = products.find((p) => p.slug === slug);
    const opt = product?.sizeOptions?.find((o) => o.label === size);
    if (!product || !opt || isTwinPack(opt)) return null;
    const twin = matchingTwin(product, opt);
    if (!twin || (twin.stock != null && twin.stock <= 0)) return null;
    if (cart.lines.some((l) => l.slug === slug && l.size === twin.label)) return null;
    const save = twinSavings(product, twin) ?? 0;
    const pct = twinSavingsPct(product, twin);
    if (save <= 0) return null;
    return { twin, save, pct };
  };

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center md:px-8">
        <h1 className="text-3xl">Your cart is empty</h1>
        <p className="mt-3 text-muted-foreground">
          Browse our pure camphor range and add something you love.
        </p>
        <Link
          to="/products"
          className="mt-8 inline-block rounded-full bg-primary px-7 py-3 text-sm font-medium text-primary-foreground"
        >
          Shop products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-16">
      <h1 className="text-3xl md:text-4xl">Your Cart</h1>
      <div className="gold-rule mt-4 w-20" />

      {/* Live savings breakdown — pulses once when the Steal Deal activates. */}
      {totalSaved > 0 && (
        <div
          key={cart.stealDeal > 0 ? "deal-on" : "deal-off"}
          className={`mt-6 rounded-2xl border border-emerald-600/25 bg-emerald-50/60 p-4 ${cart.stealDeal > 0 ? "animate-savings-pulse" : ""}`}
        >
          <p className="font-semibold text-emerald-800">
            {t("You're saving")} {formatINR(totalSaved)} {t("on this order")}
          </p>
          <ul className="tnum mt-1.5 space-y-0.5 text-sm text-emerald-900/80">
            {itemSavings > 0 && <li>{t("Pack savings")}: {formatINR(itemSavings)}</li>}
            {cart.stealDeal > 0 && (
              <li>
                {t("Steal Deal")}: −{formatINR(cart.stealDeal)}
              </li>
            )}
            {shippingSaved > 0 && <li>{t("Free shipping")}: {formatINR(shippingSaved)}</li>}
          </ul>
        </div>
      )}

      <div className="mt-8 grid gap-10 md:grid-cols-[1fr_340px]">
        <ul className="space-y-4">
          {cart.lines.map((l) => {
            const upgrade = upgradeFor(l.slug, l.size);
            const info = lineInfo(l.slug, l.size);
            const name = info.product?.name ?? l.slug;
            const image = info.opt?.image ?? info.product?.image;
            return (
              <li key={`${l.slug}__${l.size}`} className="rounded-xl border border-gold/25 bg-card p-4">
                <div className="flex gap-4">
                  {image && <img src={image} alt={name} className="h-20 w-20 rounded-lg object-cover" />}
                  <div className="flex-1">
                    <Link to="/products/$slug" params={{ slug: l.slug }} className="font-body font-semibold hover:underline">
                      {name}
                    </Link>
                    {l.size && <p className="text-xs text-muted-foreground">{l.size}</p>}
                    <p className="tnum mt-1 text-sm">{formatINR(info.price)}</p>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button
                      type="button"
                      aria-label={`Remove ${name}`}
                      onClick={() => cart.setQty(l.slug, l.size, 0)}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => cart.setQty(l.slug, l.size, l.qty - 1)}
                        className="grid h-8 w-8 place-items-center rounded-full border border-gold/50"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="tnum min-w-6 text-center text-sm font-medium">{l.qty}</span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => cart.setQty(l.slug, l.size, l.qty + 1)}
                        className="grid h-8 w-8 place-items-center rounded-full border border-gold/50"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                {upgrade && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold/30 bg-secondary/60 px-3 py-2.5">
                    <p className="text-xs">
                      <span className="font-semibold">{t("Twin Pack")}:</span> {t("get 2 for")}{" "}
                      {formatINR(upgrade.twin.price)} — {t("Save")} {formatINR(upgrade.save)}
                      {upgrade.pct != null ? ` (${upgrade.pct}%)` : ""}
                    </p>
                    <button
                      type="button"
                      onClick={() => switchToTwin(l.slug, l.size, upgrade.twin.label)}
                      className="min-h-9 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
                    >
                      {t("Switch to Twin Pack")}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <aside className="h-fit rounded-2xl border border-gold/25 bg-card p-6">
          <h2 className="font-body text-lg font-semibold">{t("Order Summary")}</h2>
          <dl className="tnum mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("Subtotal")}</dt>
              <dd>{formatINR(cart.subtotal)}</dd>
            </div>
            {cart.discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("Coupon")}</dt>
                <dd className="text-emerald-700">−{formatINR(cart.discount)}</dd>
              </div>
            )}
            {cart.stealDeal > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("Steal Deal")}</dt>
                <dd className="text-emerald-700">−{formatINR(cart.stealDeal)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("Shipping")}</dt>
              <dd>{cart.shipping === 0 ? t("Free") : formatINR(cart.shipping)}</dd>
            </div>
            <div className="flex justify-between border-t border-gold/25 pt-2 text-lg font-bold text-maroon-deep">
              <dt>{t("Total")}</dt>
              <dd>{formatINR(cart.total)}</dd>
            </div>
          </dl>

          <div className="mt-4">
            <FreeShippingProgress />
          </div>

          <button
            type="button"
            onClick={() => {
              if (session) {
                navigate({ to: "/checkout" });
              } else {
                sessionStorage.setItem("returnTo", "/checkout");
                navigate({ to: "/auth" });
              }
            }}
            className="mt-5 block w-full rounded-full bg-primary py-3 text-center text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5"
          >
            {t("Proceed to checkout")}
          </button>
        </aside>
      </div>
    </div>
  );
}
