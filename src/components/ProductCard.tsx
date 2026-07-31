import { toast } from "sonner";
import { formatINR, type Product } from "@/data/products";
import { useCart } from "@/lib/cart";

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { add } = useCart();

  return (
    <article
      className="card-premium reveal group flex flex-col overflow-hidden"
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div className="relative aspect-4/3 overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-108"
        />
        <span className="absolute left-3 top-3 rounded-full bg-primary/90 px-3 py-1 text-[0.65rem] uppercase tracking-widest text-primary-foreground">
          100% Pure
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl">{product.name}</h3>
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
            onClick={() => {
              add(product.slug);
              toast.success(`${product.name} added to cart`);
            }}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5"
          >
            Add to cart
          </button>
        </div>
      </div>
    </article>
  );
}