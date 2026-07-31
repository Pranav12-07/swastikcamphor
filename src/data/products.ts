import tablets from "@/assets/product-tablets.jpg";
import bhimseni from "@/assets/product-bhimseni.jpg";
import cones from "@/assets/product-cones.jpg";
import giftpack from "@/assets/product-giftpack.jpg";

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
};

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