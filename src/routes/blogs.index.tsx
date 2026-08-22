import { Link, createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { blogPosts } from "@/data/blog";
import { useReveal } from "@/hooks/use-reveal";

export const Route = createFileRoute("/blogs/")({
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
  component: Blogs,
});

function Blogs() {
  useReveal();
  return (
    <>
      <PageHeader
        eyebrow="Blogs"
        title="Camphor guides, rituals and buying advice"
        subtitle="Written by the Swastik Camphor team — camphor manufacturers in Hyderabad since 1968."
      />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-14 md:grid-cols-2 md:px-8">
        {blogPosts.map((post, i) => (
          <article
            key={post.slug}
            className="card-premium reveal group overflow-hidden"
            style={{ transitionDelay: `${i * 80}ms` }}
          >
            <Link to="/blogs/$slug" params={{ slug: post.slug }} className="block">
              <div className="aspect-16/9 overflow-hidden">
                <img
                  src={post.image}
                  alt={post.imageAlt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="p-6">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  {post.tag} • {post.read}
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
