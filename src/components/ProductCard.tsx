import { Heart } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { formatINR, type Product } from "@/data/products";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/hooks/use-wishlist";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { add } = useCart();
  const wishlist = useWishlist();
  const saved = wishlist.has(product.slug);

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
        <span className="absolute left-3 top-3 rounded-full bg-primary/90 px-3 py-1 text-[0.65rem] uppercase tracking-widest text-primary-foreground">
          100% Pure
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void onWishlist();
          }}
          aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          aria-pressed={saved}
          className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-background/85 backdrop-blur transition-transform hover:scale-110"
        >
          <Heart className={`h-4 w-4 ${saved ? "fill-primary text-primary" : "text-muted-foreground"}`} />
        </button>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl transition-colors group-hover:text-primary">{product.name}</h3>
        {typeof product.rating === "number" && product.rating > 0 && (
          <div className="mt-1.5 flex items-center gap-2">
            <StarRating rating={product.rating} className="text-sm" />
            <span className="text-xs text-muted-foreground">{product.rating.toFixed(1)}</span>
          </div>
        )}
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{product.short}</p>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {product.bestFor.map((tag) => (
            <li key={tag} className="rounded-full bg-secondary px-2.5 py-1 text-[0.68rem] text-secondary-foreground">
              {tag}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="font-display text-lg">
            {formatINR(product.price)}{" "}
            <span className="text-sm text-muted-foreground line-through">{formatINR(product.mrp)}</span>
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              add(product.slug);
              toast.success(`${product.name} added to cart`);
            }}
            className="relative z-20 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5"
          >
            Add to cart
          </button>
        </div>
        <span className="mt-3 text-sm text-muted-foreground underline underline-offset-4 group-hover:text-foreground">
          View product details
        </span>
      </div>
    </article>
  );
}
