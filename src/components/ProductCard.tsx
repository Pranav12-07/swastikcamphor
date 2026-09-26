import { Heart } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { formatINR, type Product } from "@/data/products";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { StarRating } from "@/components/StarRating";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { add } = useCart();
  const wishlist = useWishlist();
  const saved = wishlist.has(product.slug);
  const discount = product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  async function onWishlist() {
    if (!wishlist.signedIn) {
      toast.info("Sign in to save products to your wishlist.");
      return;
    }
    try {
      const result = await wishlist.toggle(product.slug);
      toast.success(result.saved ? "Saved to your wishlist" : "Removed from your wishlist");
    } catch {
      toast.error("We could not update your wishlist.");
    }
  }

  return (
    <article
      className="card-premium reveal group relative flex cursor-pointer flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg"
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      {/* Whole-card click target — buttons below sit above it and are unaffected. */}
      <Link
        to="/products/$slug"
        params={{ slug: product.slug }}
        aria-label={`View details for ${product.name}`}
        className="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="sr-only">View {product.name}</span>
      </Link>

      <div className="relative aspect-4/3 overflow-hidden">
        <img
          src={product.image}
          alt={`${product.name} by Swastik Camphor`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-108"
        />
        <span className="absolute left-2 top-2 rounded-full bg-primary/90 px-2 py-0.5 text-[0.58rem] uppercase tracking-wider text-primary-foreground sm:left-3 sm:top-3 sm:px-3 sm:py-1 sm:text-[0.65rem] sm:tracking-widest">
          100% Pure
        </span>
        {discount > 0 && (
          <span className="absolute bottom-2 left-2 rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground shadow-md sm:bottom-3 sm:left-3 sm:px-3.5 sm:py-1.5 sm:text-sm">
            {discount}% OFF
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void onWishlist();
          }}
          aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          aria-pressed={saved}
          className="absolute right-2 top-2 z-20 grid h-9 w-9 place-items-center rounded-full bg-background/85 backdrop-blur transition-transform hover:scale-110 sm:right-3 sm:top-3"
        >
          <Heart className={`h-4 w-4 ${saved ? "fill-primary text-primary" : "text-muted-foreground"}`} />
        </button>
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-5">
        <h3 className="line-clamp-2 font-body text-base font-semibold leading-snug transition-colors group-hover:text-primary sm:line-clamp-none sm:text-2xl">{product.name}</h3>
        {typeof product.rating === "number" && product.rating > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StarRating rating={product.rating} className="text-sm" />
            <span className="text-xs text-muted-foreground">{product.rating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({(product.ratingCount ?? 0).toLocaleString("en-IN")})</span>
          </div>
        )}
        <p className="mt-2 hidden flex-1 text-sm leading-relaxed text-muted-foreground sm:block">{product.short}</p>
        <ul className="mt-3 hidden flex-wrap gap-1.5 sm:flex">
          {product.bestFor.map((tag) => (
            <li key={tag} className="rounded-full bg-secondary px-2.5 py-1 text-[0.68rem] text-secondary-foreground">
              {tag}
            </li>
          ))}
        </ul>
        <div className="mt-auto flex flex-col items-stretch gap-2 pt-3 sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:pt-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-lg font-semibold sm:text-xl">
            <span>{formatINR(product.price)}</span>
            {product.mrp > product.price && (
              <>
                <span className="text-xs font-normal text-muted-foreground line-through sm:text-sm">{formatINR(product.mrp)}</span>
                <span className="hidden text-base font-bold text-destructive sm:inline">{discount}% OFF</span>
              </>
            )}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              add(product.slug);
              toast.success(`${product.name} added to cart`);
            }}
            className="relative z-20 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5 sm:w-auto sm:py-2"
          >
            Add to cart
          </button>
        </div>
        <span className="mt-3 hidden text-sm text-muted-foreground underline underline-offset-4 group-hover:text-foreground sm:block">
          View product details
        </span>
      </div>
    </article>
  );
}
