import { Flame } from "lucide-react";
import { useCatalog } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";

/** Round category shortcuts under the hero. Categories come from /admin/categories. */
export function CategoryTiles() {
  const { categories } = useCatalog();
  const { t } = useI18n();
  if (categories.length === 0) return null;

  // Up to 4 fit side by side on a phone; more become a swipeable row.
  const scroll = categories.length > 4;

  return (
    <nav aria-label={t("Shop by category")} className="mx-auto max-w-7xl px-4 pt-8 md:px-8 md:pt-12">
      <ul
        className={
          scroll
            ? "-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-4 md:gap-5 md:overflow-visible md:px-0 lg:grid-cols-5 [&::-webkit-scrollbar]:hidden"
            : "grid grid-cols-4 gap-2 md:gap-5"
        }
      >
        {categories.map((c) => (
          <li key={c.slug} className={scroll ? "w-[4.75rem] shrink-0 snap-start md:w-auto" : undefined}>
            <a
              href={`/shop?category=${encodeURIComponent(c.slug)}`}
              className="group flex h-full flex-col items-center gap-2 rounded-2xl p-1 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:card-premium md:flex-row md:gap-4 md:p-4 md:text-left md:transition-transform md:duration-300 md:hover:-translate-y-0.5"
            >
              <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border border-gold/40 bg-secondary md:h-14 md:w-14">
                {c.image_url ? (
                  <img src={c.image_url} alt="" loading="lazy" width={64} height={64} className="h-full w-full object-cover" />
                ) : (
                  <Flame className="h-6 w-6 text-accent" aria-hidden="true" />
                )}
              </span>
              <span className="min-w-0">
                <span className="line-clamp-2 block text-xs font-medium leading-tight text-foreground md:text-base">{c.name}</span>
                <span className="mt-0.5 hidden text-sm text-muted-foreground md:block">{t("View products")}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
