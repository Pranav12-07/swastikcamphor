import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { blogPosts, getPost } from "@/data/blog";
import { useReveal } from "@/hooks/use-reveal";

export const Route = createFileRoute("/blogs/$slug")({
  loader: ({ params }) => {
    const post = getPost(params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData }) => {
    const post = loaderData;
    if (!post) return {};
    return {
      meta: [
        { title: post.seoTitle },
        { name: "description", content: post.description },
        { name: "keywords", content: post.keywords },
        { property: "og:title", content: post.seoTitle },
        { property: "og:description", content: post.description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `https://swastikcamphor.in/blogs/${post.slug}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.description,
            datePublished: post.date,
            keywords: post.keywords,
            author: { "@type": "Organization", name: "Swastik Camphor" },
            publisher: { "@type": "Organization", name: "Swastik Camphor" },
          }),
        },
      ],
    };
  },
  errorComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-display text-2xl">We could not load this article</h1>
      <Link to="/blogs" className="mt-4 inline-block text-primary underline">
        Back to all blogs
      </Link>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-display text-2xl">Article not found</h1>
      <Link to="/blogs" className="mt-4 inline-block text-primary underline">
        Back to all blogs
      </Link>
    </div>
  ),
  component: BlogPostPage,
});

function BlogPostPage() {
  const post = Route.useLoaderData();
  useReveal();
  const related = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <>
      <PageHeader eyebrow={post.tag} title={post.title} subtitle={post.excerpt} />
      <article className="mx-auto max-w-3xl px-4 py-12 md:px-8">
        <img
          src={post.image}
          alt={post.imageAlt}
          loading="lazy"
          className="aspect-16/9 w-full rounded-3xl object-cover"
        />
        <p className="mt-6 text-xs uppercase tracking-[0.24em] text-muted-foreground">
          {post.read} • Swastik Camphor
        </p>

        {post.sections.map((section) => (
          <section key={section.heading} className="reveal mt-10">
            <h2 className="font-display text-2xl">{section.heading}</h2>
            <div className="gold-rule mt-3 w-16" />
            {section.paragraphs.map((text) => (
              <p key={text.slice(0, 40)} className="mt-4 leading-relaxed text-muted-foreground">
                {text}
              </p>
            ))}
            {section.links && (
              <ul className="mt-5 flex flex-wrap gap-3">
                {section.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="inline-flex rounded-full border border-gold/40 px-4 py-2 text-sm font-medium transition-colors hover:bg-accent/15"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {post.faqs && post.faqs.length > 0 && (
          <section className="reveal mt-12">
            <h2 className="font-display text-2xl">Frequently asked questions</h2>
            <div className="gold-rule mt-3 w-16" />
            <dl className="mt-5 space-y-5">
              {post.faqs.map((f) => (
                <div key={f.q}>
                  <dt className="font-medium">{f.q}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <div className="card-premium mt-12 p-8 text-center">
          <h2 className="font-display text-2xl">Buy 100% pure camphor online</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Manufactured in Hyderabad since 1968 and dispatched across India.
          </p>
          <Link
            to="/shop"
            className="mt-5 inline-flex rounded-full bg-accent px-7 py-3 text-sm font-semibold text-accent-foreground"
          >
            Shop camphor products
          </Link>
        </div>

        <section className="mt-14">
          <h2 className="font-display text-xl">Read next</h2>
          <ul className="mt-4 space-y-3">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  to="/blogs/$slug"
                  params={{ slug: r.slug }}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </>
  );
}
