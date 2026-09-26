import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * The old /shop listing was merged into /products. Keep a permanent redirect so
 * shared links, bookmarks and Google's index land on the right page; the old
 * ?category= values map onto the new ?filter= chips.
 */
const CATEGORY_FILTERS: Record<string, "tablets" | "bhimseni" | "pouch" | "twin"> = {
  "camphor-tablets": "tablets",
  "bhimseni-camphor": "bhimseni",
  "camphor-tablets-refill-pouch": "pouch",
  "refill-pouches": "pouch",
  "twin-packs": "twin",
};

export const Route = createFileRoute("/shop")({
  beforeLoad: ({ search }) => {
    const raw = (search as Record<string, unknown>)["category"];
    const category = typeof raw === "string" ? raw : "";
    const filter = CATEGORY_FILTERS[category];
    throw redirect({
      to: "/products",
      search: filter ? { filter } : {},
      statusCode: 301,
    });
  },
  component: () => null,
});
