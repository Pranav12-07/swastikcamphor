import { Link, createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { listBlogs } from "@/lib/blog.functions";
import { useReveal } from "@/hooks/use-reveal";

export const Route = createFileRoute("/blogs/")({
  loader: () => listBlogs(),
  head: () => ({
    meta: [
      { title: "Camphor Blog — Pooja Camphor Guides, Benefits & Buying Tips" },
      {
        name: "description",
        content:
          "Guides from a camphor manufacturer since 1968: pooja camphor benefits, Bhimseni vs synthetic camphor, safe burning tips and how to buy pure camphor online in India.",
      },
      {
        name: "keywords",
        content:
          "camphor blog, pooja camphor, camphor benefits, bhimseni camphor, buy camphor online, camphor manufacturer",
      },
      { property: "og:title", content: "Camphor Blog — Swastik Camphor" },
      {
        property: "og:description",
        content: "Practical camphor guides: rituals, purity tests, safety and buying advice.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-display text-2xl">We could not load the blog right now</h1>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-display text-2xl">No articles found</h1>
    </div>
  ),
  component: Blogs,
});

function Blogs() {
  const posts = Route.useLoaderData();
  useReveal();
  return (
    <>
      <PageHeader
        eyebrow="Blogs"
        title="Camphor guides, rituals and buying advice"
        subtitle="Written by the Swastik Camphor team — camphor manufacturers in Hyderabad since 1968."
      />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-14 md:grid-cols-2 md:px-8">
        {posts.length === 0 && (
          <p className="text-sm text-muted-foreground">New articles are on the way — check back soon.</p>
        )}
        {posts.map((post, i) => (
          <article
            key={post.slug}
            className="card-premium reveal group overflow-hidden"
            style={{ transitionDelay: `${i * 80}ms` }}
          >
            <Link to="/blogs/$slug" params={{ slug: post.slug }} className="block">
              {post.cover_image && (
                <div className="aspect-16/9 overflow-hidden">
                  <img
                    src={post.cover_image}
                    alt={post.cover_alt ?? post.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              )}
              <div className="p-6">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  {[post.category, post.read_time].filter(Boolean).join(" • ")}
                </p>
                <h2 className="mt-3 font-display text-xl">{post.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
                <span className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 group-hover:underline">
                  Read the guide →
                </span>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </>
  );
}
