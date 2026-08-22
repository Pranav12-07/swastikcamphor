import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { ProductCard } from "@/components/ProductCard";
import { useCatalog } from "@/lib/catalog";
import { useWishlist } from "@/hooks/use-wishlist";

export const Route = createFileRoute("/_authenticated/wishlist")({
  head: () => ({
    meta: [
      { title: "My Wishlist — Swastik Camphor" },
      { name: "description", content: "Camphor products you have saved for later at Swastik Camphor." },
      { property: "og:title", content: "My Wishlist — Swastik Camphor" },
      { property: "og:description", content: "Your saved Swastik Camphor products." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { products } = useCatalog();
  const wishlist = useWishlist();
  const saved = products.filter((p) => wishlist.has(p.slug));

  return (
    <>
      <PageHeader eyebrow="Wishlist" title="Saved for later" subtitle="Your favourite camphor picks, in one place." />
      <section className="mx-auto w-full max-w-7xl px-4 py-12 md:px-8">
        {wishlist.loading ? (
          <p className="text-sm text-muted-foreground">Loading your wishlist…</p>
        ) : saved.length === 0 ? (
          <div className="card-premium p-10 text-center">
            <p className="text-muted-foreground">You have not saved any products yet.</p>
            <Link
              to="/shop"
              className="mt-5 inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Browse the shop
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {saved.map((p, i) => (
              <ProductCard key={p.slug} product={p} index={i} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
