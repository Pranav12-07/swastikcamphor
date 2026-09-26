import { Flame } from "lucide-react";
import { useCatalog } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";

/** "BHIMSENI CAMPHOR" -> "Bhimseni Camphor"; leaves mixed-case names untouched. */
function toTitleCase(name: string): string {
  if (name !== name.toUpperCase()) return name;
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/** Round category shortcuts under the hero. Categories come from /admin/categories. */
export function CategoryTiles() {
  const { categories, products } = useCatalog();
  const { t } = useI18n();
  if (categories.length === 0) return null;

  // Up to 4 sit in one centred row; more become swipeable on phones, wrapping on desktop.
  const scroll = categories.length > 4;

  const imageFor = (slug: string, imageUrl: string | null): string | null =>
    imageUrl ?? products.find((p) => p.category === slug)?.image ?? null;

  return (
    <nav aria-label={t("Shop by category")} className="mx-auto max-w-7xl px-4 pt-8 md:px-8 md:pt-12">
      <ul
        className={
          scroll
            ? "-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:flex-wrap md:justify-center md:gap-6 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden"
            : "flex flex-wrap justify-center gap-4 md:gap-6"
        }
      >
        {categories.map((c) => {
          const image = imageFor(c.slug, c.image_url);
          return (
            <li key={c.slug} className={scroll ? "shrink-0 snap-start" : undefined}>
              <a
                href={`/shop?category=${encodeURIComponent(c.slug)}`}
                className="group flex w-20 flex-col items-center gap-2 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:w-28"
              >
                <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-gold/50 bg-secondary transition-transform duration-300 group-hover:-translate-y-0.5 md:h-24 md:w-24">
                  {image ? (
                    <img src={image} alt="" loading="lazy" width={96} height={96} className="h-full w-full object-cover" />
                  ) : (
                    <Flame className="h-6 w-6 text-accent md:h-8 md:w-8" aria-hidden="true" />
                  )}
                </span>
                <span className="line-clamp-2 text-xs font-medium leading-tight text-foreground md:text-sm">
                  {toTitleCase(c.name)}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
