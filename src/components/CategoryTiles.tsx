import { Link } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import { useCatalog } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";

/** Fixed category shortcuts under the hero — always these 3 products, never the admin category list. */
const TILES = [
  { label: "Camphor Tablets Jars", slug: "camphor-tablets", packHint: "100 g Jar" },
  { label: "Bhimseni Camphor Jars", slug: "bhimseni-camphor", packHint: "100 g Jar" },
  { label: "Camphor Tablets Pouch", slug: "camphor-tablets-refill-pouch", packHint: "100 g" },
] as const;

export function CategoryTiles() {
  const { products } = useCatalog();
  const { t } = useI18n();

  const imageFor = (slug: string, packHint: string): string | null => {
    const product = products.find((p) => p.slug === slug);
    if (!product) return null;
    const option = (product.sizeOptions ?? []).find((o) => o.label.includes(packHint) && o.image);
    return option?.image ?? product.image ?? null;
  };

  return (
    <nav aria-label={t("Shop by category")} className="mx-auto max-w-7xl px-4 pt-6 md:px-8 md:pt-10">
      <ul className="mx-auto grid max-w-2xl grid-cols-3 gap-3 md:gap-6">
        {TILES.map((tile) => {
          const image = imageFor(tile.slug, tile.packHint);
          return (
            <li key={tile.slug}>
              <Link
                to="/products/$slug"
                params={{ slug: tile.slug }}
                className="group flex flex-col items-center gap-2 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-gold/50 bg-secondary transition-transform duration-300 group-hover:-translate-y-0.5 md:h-28 md:w-28">
                  {image ? (
                    <img src={image} alt="" loading="lazy" width={112} height={112} className="h-full w-full object-cover" />
                  ) : (
                    <Flame className="h-6 w-6 text-accent md:h-8 md:w-8" aria-hidden="true" />
                  )}
                </span>
                <span className="line-clamp-2 text-[13px] font-medium leading-tight text-foreground md:text-base">
                  {t(tile.label)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
