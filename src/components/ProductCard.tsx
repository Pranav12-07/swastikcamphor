import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Heart, Minus, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  defaultSizeOption,
  formatINR,
  isTwinPack,
  pctOff,
  per100g,
  sizeAvailable,
  twinSavings,
  type SizeOption,
} from "@/data/products";
import { useCart } from "@/lib/cart";
import { useStoreSettings } from "@/lib/store-settings";
import { useAuth } from "@/lib/auth";
import { useWishlist } from "@/hooks/use-wishlist";
import { useBoughtCounts } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import { StarRating } from "@/components/StarRating";

export type CardProduct = {
  slug: string;
  name: string;
  short?: string;
  image: string;
  price: number;
  mrp?: number;
  benefits?: string[];
  stock?: number;
  rating?: number | null;
  ratingCount?: number;
  sizeOptions?: SizeOption[];
};

export function ProductCard({
  product,
  reveal = true,
  index = 0,
}: {
  product: CardProduct;
  reveal?: boolean;
  index?: number;
}) {
  const navigate = useNavigate();
  const { lines, add, setQty } = useCart();
  const { freeShippingAbove } = useStoreSettings();
  const { session } = useAuth();
  const { has, toggle } = useWishlist();
  const { t } = useI18n();
  const boughtCounts = useBoughtCounts();

  const options = useMemo(() => product.sizeOptions ?? [], [product.sizeOptions]);
  const packMode = options.length > 1;
  const [picked, setPicked] = useState<string | null>(null);

  const selected = packMode
    ? (options.find((o) => o.label === picked) ?? defaultSizeOption(product))
    : options.length === 1
      ? options[0]!
      : null;

  const price = selected?.price ?? product.price;
  const mrp = selected?.mrp ?? product.mrp ?? product.price;
  const discount = pctOff(mrp, price);
  const per100 = selected ? per100g(selected) : null;
  const twinSave = selected ? twinSavings(product, selected) : null;
  const inStock = selected ? sizeAvailable(product, selected) : (product.stock ?? 1) > 0;
  const image = selected?.image ?? product.image;

  const cartItem = lines.find((i) => i.slug === product.slug && i.size === (selected?.label ?? ""));
  const wished = has(product.slug);

  const detailUrl = selected?.label
    ? `/products/${product.slug}?size=${encodeURIComponent(selected.label)}`
    : `/products/${product.slug}`;

  const goToDetail = () => {
    if (packMode && selected?.label) {
      navigate({
        to: "/products/$slug",
        params: { slug: product.slug },
        search: { size: selected.label },
      });
    } else {
      navigate({ to: "/products/$slug", params: { slug: product.slug } });
    }
  };

  const onAdd = () => {
    add(product.slug, selected?.label);
    toast.success(`${product.name} added to cart`);
  };

  const onToggleWish = () => {
    if (!session) {
      toast.info("Sign in to save favourites.");
      navigate({ to: "/auth" });
      return;
    }
    toggle(product.slug);
  };

  return (
    <article
      onClick={goToDetail}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.target as HTMLElement) === e.currentTarget) goToDetail();
      }}
      tabIndex={0}
      role="link"
      aria-label={`View ${product.name}`}
      className={`card-premium group flex cursor-pointer flex-col overflow-hidden transition-shadow hover:shadow-lg ${reveal ? "reveal" : ""}`}
      style={reveal && index ? { transitionDelay: `${index * 70}ms` } : undefined}
    >
      <div className="relative">
        <img
          src={image}
          alt={selected ? `${product.name} – ${selected.label}` : `${product.name} by Swastik Camphor`}
          loading="lazy"
          className="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {discount > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground shadow">
            {discount}% OFF
          </span>
        )}
        <button
          type="button"
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wished}
          onClick={(e) => {
            e.stopPropagation();
            onToggleWish();
          }}
          className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-background/90 shadow transition-transform hover:scale-105"
        >
          <Heart className={`h-4 w-4 ${wished ? "fill-accent text-accent" : "text-muted-foreground"}`} />
        </button>
        {!inStock && (
          <span className="absolute inset-x-0 bottom-0 bg-background/90 py-1 text-center text-xs font-medium text-destructive">
            Out of stock
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-body text-base font-semibold leading-snug">{product.name}</h3>
        {typeof product.rating === "number" && product.rating > 0 && (product.ratingCount ?? 0) > 0 ? (
          <div className="mt-1 flex items-center gap-1.5">
            <StarRating rating={product.rating} />
            <span className="text-xs text-muted-foreground">({(product.ratingCount ?? 0).toLocaleString("en-IN")})</span>
          </div>
        ) : (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
            {t("Trusted in 5,000+ stores across India")}
          </p>
        )}

        {packMode && (
          <div className="mt-3" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-medium text-muted-foreground">Pack</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Pack size">
              {options.map((opt) => {
                const available = sizeAvailable(product, opt);
                const active = selected?.label === opt.label;
                const off = pctOff(opt.mrp, opt.price);
                return (
                  <button
                    key={opt.label}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={!available}
                    onClick={() => setPicked(opt.label)}
                    className={`flex min-h-9 items-center gap-1 rounded-full border px-2.5 text-xs transition-colors ${
                      active
                        ? "border-primary bg-primary/10 font-medium"
                        : isTwinPack(opt)
                          ? "border-gold/60 hover:border-primary/60"
                          : "border-gold/40 hover:border-primary/60"
                    } ${!available ? "opacity-50 line-through" : ""}`}
                  >
                    {opt.short_label ?? opt.label}
                    {off > 0 && <span className="font-semibold text-primary">{off}%</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-baseline gap-x-2">
          <span className="text-lg font-semibold">{formatINR(price)}</span>
          {mrp > price && <span className="text-sm text-muted-foreground line-through">{formatINR(mrp)}</span>}
        </div>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          Inclusive of all taxes
          {per100 != null && <span> · ₹{per100.toLocaleString("en-IN")} per 100 g</span>}
        </p>
        {twinSave != null && (
          <p className="mt-0.5 text-xs font-medium text-emerald-700">Save {formatINR(twinSave)} vs 2 single jars</p>
        )}
        {price >= freeShippingAbove && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">Free shipping</p>
        )}
        {(() => {
          const bought = boughtCounts[product.slug]?.[selected?.label ?? ""] ?? 0;
          if (bought < 10) return null;
          return (
            <p className="mt-0.5 text-[11px] font-medium text-primary">
              {t(`${Math.floor(bought / 10) * 10}+ bought in the past month`)}
            </p>
          );
        })()}

        <div className="mt-auto flex items-center justify-between gap-2 pt-3" onClick={(e) => e.stopPropagation()}>
          {packMode ? (
            <button
              type="button"
              disabled={!inStock}
              onClick={goToDetail}
              className="min-h-11 w-full rounded-full border border-gold/50 text-sm font-medium transition-colors hover:bg-accent/15 disabled:opacity-50"
            >
              {inStock ? "Select options" : "Out of stock"}
            </button>
          ) : cartItem ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQty(product.slug, cartItem.size, cartItem.qty - 1)}
                className="grid h-9 w-9 place-items-center rounded-full border border-gold/50"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-6 text-center text-sm font-medium">{cartItem.qty}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQty(product.slug, cartItem.size, cartItem.qty + 1)}
                className="grid h-9 w-9 place-items-center rounded-full border border-gold/50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!inStock}
              onClick={onAdd}
              className="min-h-11 w-full rounded-full bg-primary text-sm font-medium text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {inStock ? "Add" : "Out of stock"}
            </button>
          )}
          {packMode && (
            <span className="shrink-0 text-[11px] text-muted-foreground">{options.length} options</span>
          )}
        </div>
      </div>
    </article>
  );
}
