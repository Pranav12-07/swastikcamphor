import { Link, useNavigate } from "@tanstack/react-router";
import { bestSavingTwin, formatINR, isTwinPack, pctOff, twinSavings, type SizeOption } from "@/data/products";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { QtyStepper } from "@/components/QtyStepper";
import { PriceTag } from "@/components/PriceTag";

export type PackProduct = {
  slug: string;
  name: string;
  image: string;
  stock?: number;
  sizeOptions?: SizeOption[];
};

export type PackRef = {
  product: PackProduct;
  option: SizeOption;
};

/** One pack option as a card: photo, savings %, Add-to-cart stepper and Buy now. */
export function PackCard({ pack, bestValue }: { pack: PackRef; bestValue?: boolean }) {
  const { product, option } = pack;
  const { t } = useI18n();
  const { lines, add } = useCart();
  const navigate = useNavigate();
  const off = pctOff(option.mrp, option.price);
  const outOfStock = option.stock != null && option.stock <= 0;
  const stock = option.stock ?? product.stock ?? null;

  // Twin Pack savings vs buying the same weight as single jars (from real prices).
  const single = isTwinPack(option)
    ? (product.sizeOptions ?? []).find((o) => !isTwinPack(o) && o.unit_grams === option.unit_grams)
    : null;
  const twinSave = isTwinPack(option) ? twinSavings(product, option) : null;
  const twinFull = single ? single.price * (option.pack_count || 2) : null;
  const twinPct = twinSave != null && twinFull ? Math.floor((twinSave / twinFull) * 100) : null;
  const bestTwin = bestSavingTwin(product);
  const isBestSaving = isTwinPack(option) && bestTwin?.label === option.label;

  const buyNow = () => {
    const inCart = lines.some((l) => l.slug === product.slug && l.size === option.label);
    if (!inCart) add(product.slug, option.label, 1, { skipUpsell: true });
    void navigate({ to: "/checkout" });
  };

  return (
    <div className="card-premium group relative flex h-full flex-col overflow-hidden">
      {off > 0 && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-accent px-2.5 py-1 text-sm font-bold text-accent-foreground shadow">
          {off}% {t("OFF")}
        </span>
      )}
      {isBestSaving ? (
        <span className="absolute right-2 top-2 z-10 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-accent-foreground shadow">
          {t("Best saving")}
        </span>
      ) : bestValue ? (
        <span className="absolute right-2 top-2 z-10 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground shadow">
          {t("Best value")}
        </span>
      ) : null}
      <Link
        to="/products/$slug"
        params={{ slug: product.slug }}
        search={{ size: option.label }}
        aria-label={`${product.name} – ${option.label}`}
        className="block"
      >
        <img
          src={option.image ?? product.image}
          alt={`${product.name} – ${option.label}`}
          loading="lazy"
          className="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </Link>
      <div className="flex flex-1 flex-col p-3 md:p-4">
        <h3 className="truncate font-body text-[13px] font-semibold leading-snug md:text-sm">{product.name}</h3>
        <p className="mt-0.5 line-clamp-2 min-h-8 text-xs text-muted-foreground">{option.label}</p>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          <PriceTag amount={option.price} className="text-[22px] text-maroon-deep md:text-[26px]" />
          {option.mrp != null && option.mrp > option.price && (
            <span className="tnum text-base text-muted-foreground line-through md:text-lg">{formatINR(option.mrp)}</span>
          )}
          {off > 0 && <span className="text-base font-bold text-emerald-700 md:text-lg">{off}% {t("OFF")}</span>}
        </div>
        {twinSave != null && twinPct != null && twinFull != null ? (
          <>
            <p className="tnum mt-1 text-[11px] text-muted-foreground">
              {option.pack_count || 2} {t("jars separately")}: {formatINR(twinFull)}
            </p>
            <p className="tnum mt-0.5 text-xs font-semibold text-emerald-700">
              {t("Save")} {formatINR(twinSave)} ({twinPct}%) {t("vs 2 single jars")}
            </p>
          </>
        ) : off >= 1 && option.mrp != null ? (
          <p className="tnum mt-1 text-xs font-semibold text-emerald-700">
            {t("You save")} {formatINR(option.mrp - option.price)} {t("on MRP")}
          </p>
        ) : null}
        {stock != null && stock >= 1 && stock <= 10 && (
          <p className="mt-0.5 text-xs font-medium text-amber-700">
            {t("Only")} {stock} {t("left")}
          </p>
        )}
        <div className="mt-auto flex flex-col gap-2 pt-3 lg:flex-row">
          <div className="lg:flex-1">
            <QtyStepper slug={product.slug} size={option.label} max={stock} disabled={outOfStock} />
          </div>
          <button
            type="button"
            disabled={outOfStock}
            onClick={buyNow}
            className="h-11 w-full whitespace-nowrap rounded-full border border-gold/50 px-4 text-xs font-semibold transition-colors hover:bg-accent/15 disabled:opacity-50 lg:flex-1"
          >
            {t("Buy now")}
          </button>
        </div>
      </div>
    </div>
  );
}
