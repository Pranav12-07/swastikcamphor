import tablets from "@/assets/product-tablets.jpg";
import bhimseni from "@/assets/product-bhimseni.jpg";
import cones from "@/assets/product-cones.jpg";
import giftpack from "@/assets/product-giftpack.jpg";

export type SizeOption = {
  label: string;
  price: number;
  mrp: number | null;
  stock: number | null;
  popular: boolean;
  /** Short text for selector pills, e.g. "2 × 100 g". */
  short_label: string | null;
  /** Net weight of the whole pack in grams. */
  grams: number | null;
  /** Weight of one unit inside the pack in grams. */
  unit_grams: number | null;
  /** 1 for single packs, 2 for Twin Packs. */
  pack_count: number;
  container: string | null;
  sku: string | null;
  /** Photo of this pack's source listing. */
  image: string | null;
  /** "Feature on home" flag set in admin. */
  featured: boolean;
  /** Pre-selected when no "Most chosen" option is set. */
  is_default: boolean;
};

export type Product = {
  slug: string;
  name: string;
  short: string;
  description: string;
  image: string;
  price: number;
  mrp: number;
  sizes: string[];
  benefits: string[];
  bestFor: string[];
  rating?: number | null;
  ratingCount?: number;
  sizeOptions?: SizeOption[];
};

/** Normalise the products.size_options jsonb column. */
export function parseSizeOptions(raw: unknown): SizeOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o) => {
      if (!o || typeof o !== "object") return null;
      const r = o as Record<string, unknown>;
      const label = String(r["label"] ?? "").trim();
      const price = Number(r["price"]);
      if (!label || !Number.isFinite(price) || price <= 0) return null;
      const mrp = r["mrp"] == null ? null : Number(r["mrp"]);
      const stock = r["stock"] == null ? null : Number(r["stock"]);
      const num = (k: string) => {
        const v = r[k] == null ? null : Number(r[k]);
        return v != null && Number.isFinite(v) ? v : null;
      };
      const str = (k: string) => {
        const v = r[k];
        return typeof v === "string" && v.trim() ? v.trim() : null;
      };
      return {
        label,
        price,
        mrp: mrp != null && Number.isFinite(mrp) ? mrp : null,
        stock: stock != null && Number.isFinite(stock) ? Math.max(0, Math.trunc(stock)) : null,
        popular: Boolean(r["popular"]),
        short_label: str("short_label"),
        grams: num("grams"),
        unit_grams: num("unit_grams"),
        pack_count: num("pack_count") ?? 1,
        container: str("container"),
        sku: str("sku"),
        image: str("image"),
        featured: Boolean(r["featured"]),
        is_default: Boolean(r["is_default"]),
      } as SizeOption;
    })
    .filter((o): o is SizeOption => o !== null);
}

type WithSizes = { sizeOptions?: SizeOption[]; stock?: number };

/** Pre-selected size: "Most chosen" when in stock, else the admin default, else the first in stock, else the first. */
export function defaultSizeOption(product: WithSizes): SizeOption | null {
  const opts = product.sizeOptions ?? [];
  if (!opts.length) return null;
  return (
    opts.find((o) => o.popular && sizeAvailable(product, o)) ??
    opts.find((o) => o.is_default && sizeAvailable(product, o)) ??
    opts.find((o) => sizeAvailable(product, o)) ??
    opts[0]!
  );
}

/** % off, always rounded DOWN so a discount is never overstated. */
export function pctOff(mrp: number | null | undefined, price: number): number {
  if (!mrp || mrp <= price) return 0;
  return Math.floor(((mrp - price) / mrp) * 100);
}

/** Price per 100 g, rounded to the nearest rupee. Null when the weight is unknown. */
export function per100g(opt: SizeOption): number | null {
  if (!opt.grams || opt.grams <= 0) return null;
  return Math.round((opt.price / opt.grams) * 100);
}

export const isTwinPack = (opt: SizeOption | null | undefined) => (opt?.pack_count ?? 1) > 1;

/** Savings of a Twin Pack vs buying the same weight as single jars. Null when not a Twin Pack or no saving. */
export function twinSavings(product: WithSizes, twin: SizeOption): number | null {
  if (!isTwinPack(twin) || !twin.unit_grams) return null;
  const single = (product.sizeOptions ?? []).find(
    (o) => !isTwinPack(o) && o.unit_grams === twin.unit_grams,
  );
  if (!single) return null;
  const save = single.price * (twin.pack_count || 2) - twin.price;
  return save > 0 ? save : null;
}

/** Twin Pack saving as a whole % vs the same weight in single jars. Null when not a Twin Pack or under 1%. */
export function twinSavingsPct(product: WithSizes, twin: SizeOption): number | null {
  if (!isTwinPack(twin) || !twin.unit_grams) return null;
  const single = (product.sizeOptions ?? []).find(
    (o) => !isTwinPack(o) && o.unit_grams === twin.unit_grams,
  );
  if (!single) return null;
  const full = single.price * (twin.pack_count || 2);
  if (full <= 0) return null;
  const pct = Math.floor(((full - twin.price) / full) * 100);
  return pct >= 1 ? pct : null;
}

/** The matching Twin Pack for a single-pack option (same unit weight), when one exists. */
export function matchingTwin(product: WithSizes, single: SizeOption): SizeOption | null {
  if (isTwinPack(single) || !single.unit_grams) return null;
  return (
    (product.sizeOptions ?? []).find((o) => isTwinPack(o) && o.unit_grams === single.unit_grams) ??
    null
  );
}

/** "Best value" = lowest per-100 g option of this product. Marks at most one option per product. */
export function bestValueOption(product: WithSizes): SizeOption | null {
  let best: SizeOption | null = null;
  let bestRate = Infinity;
  for (const o of product.sizeOptions ?? []) {
    const rate = per100g(o);
    if (rate != null && rate < bestRate) {
      best = o;
      bestRate = rate;
    }
  }
  return best;
}

/** The Twin Pack of this product with the biggest rupee saving vs buying single jars. */
export function bestSavingTwin(product: WithSizes): SizeOption | null {
  let best: SizeOption | null = null;
  let bestSave = 0;
  for (const o of product.sizeOptions ?? []) {
    const save = twinSavings(product, o);
    if (save != null && save > bestSave) {
      best = o;
      bestSave = save;
    }
  }
  return best;
}

/** Human net weight, e.g. "100 g" or "1 kg". */
export function formatGrams(grams: number | null | undefined): string {
  if (!grams) return "";
  return grams >= 1000 ? `${grams / 1000} kg` : `${grams} g`;
}

/** Pack contents line, e.g. "2 × 100 g jars" or "1 × 100 g jar". */
export function packContents(opt: SizeOption): string {
  const unit = formatGrams(opt.unit_grams ?? opt.grams);
  const container = (opt.container ?? "pack").toLowerCase();
  const count = opt.pack_count || 1;
  return `${count} × ${unit} ${container}${count > 1 ? "s" : ""}`;
}

/** A size is sellable when its own stock (or the product stock it falls back to) is above zero. */
export function sizeAvailable(product: WithSizes, opt: SizeOption): boolean {
  const stock = opt.stock ?? product.stock;
  return stock == null || stock > 0;
}

/** True when nothing sellable remains: product stock 0 and no size with its own stock left. */
export function isOutOfStock(product: WithSizes): boolean {
  const opts = product.sizeOptions ?? [];
  if (opts.length) return opts.every((o) => !sizeAvailable(product, o));
  return product.stock != null && product.stock <= 0;
}

/** Price for a chosen size label, falling back to the product's base price. */
export function priceForSize(product: WithSizes & { price: number }, size: string | null | undefined): number {
  const opt = size ? (product.sizeOptions ?? []).find((o) => o.label === size) : undefined;
  return opt?.price ?? product.price;
}

export const products: Product[] = [
  {
    slug: "camphor-tablets",
    name: "Swastik Camphor Tablets",
    short: "Clean-burning pure camphor tablets for daily pooja and aarti.",
    description:
      "Our signature 100% pure camphor tablets burn with a bright, steady flame and leave no residue. Ideal for daily pooja, aarti and temple use, with a fresh, uplifting fragrance that purifies the surroundings.",
    image: tablets,
    price: 149,
    mrp: 199,
    sizes: ["50 g", "100 g", "250 g"],
    benefits: ["Residue-free clean burn", "Bright steady flame", "Fresh purifying fragrance"],
    bestFor: ["Daily Pooja", "Temple Use", "Home Fragrance"],
  },
  {
    slug: "bhimseni-camphor",
    name: "Swastik Bhimseni Camphor",
    short: "Natural Bhimseni camphor crystals for rituals, Ayurveda and aromatherapy.",
    description:
      "Made from natural camphor, Bhimseni crystals are prized for spiritual rituals, traditional Ayurvedic preparations and aromatherapy. Cooling, aromatic and completely free of harmful additives.",
    image: bhimseni,
    price: 299,
    mrp: 379,
    sizes: ["50 g", "100 g"],
    benefits: ["100% natural camphor", "Ayurvedic & aromatherapy grade", "Cooling aroma"],
    bestFor: ["Aromatherapy", "Meditation", "Ayurveda"],
  },
  {
    slug: "camphor-cones-blocks",
    name: "Camphor Cones & Blocks",
    short: "Long-lasting cones and slabs for temples, havan and pest control.",
    description:
      "Dense camphor cones and blocks designed for longer burn time — perfect for temples, havan ceremonies and larger spaces. Also widely used in wardrobes and storage areas as a natural insect repellent.",
    image: cones,
    price: 249,
    mrp: 320,
    sizes: ["100 g", "250 g", "500 g"],
    benefits: ["Extended burn time", "Great for large spaces", "Natural insect repellent"],
    bestFor: ["Temple Use", "Household Use", "Wholesale Purchase"],
  },
  {
    slug: "pooja-gift-pack",
    name: "Swastik Pooja Gift Pack",
    short: "A premium hamper of camphor, brass lamp and dried flowers.",
    description:
      "An elegant festive hamper containing pure camphor tablets, a small brass lamp and dried flowers — a thoughtful gift for Diwali, housewarming ceremonies and corporate gifting.",
    image: giftpack,
    price: 899,
    mrp: 1199,
    sizes: ["Standard", "Deluxe"],
    benefits: ["Festive premium packaging", "Complete pooja essentials", "Ready to gift"],
    bestFor: ["Gift Packs", "Daily Pooja", "Temple Use"],
  },
];

export const getProduct = (slug: string) => products.find((p) => p.slug === slug);

export const formatINR = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    value,
  );

export const COUPONS: Record<string, number> = { SWASTIK10: 0.1, POOJA15: 0.15 };
export const FREE_SHIPPING_ABOVE = 499;
export const SHIPPING_FLAT = 49;