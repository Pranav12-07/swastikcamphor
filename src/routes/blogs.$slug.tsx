import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { getBlog } from "@/lib/blog.functions";
import { useReveal } from "@/hooks/use-reveal";
import { SITE_URL, breadcrumbJsonLd, canonical } from "@/lib/seo";

export const Route = createFileRoute("/blogs/$slug")({
  loader: async ({ params }) => {
    const result = await getBlog({ data: { slug: params.slug } });
    if (!result) throw notFound();
    return result;
  },
  head: ({ loaderData }) => {
    const post = loaderData?.post;
    if (!post) return {};
    const title = post.seo_title ?? post.title;
    const description = post.seo_description ?? post.excerpt ?? post.title;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        ...(post.seo_keywords ? [{ name: "keywords", content: post.seo_keywords }] : []),
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: canonical(`/blogs/${post.slug}`) },
        { name: "twitter:card", content: "summary_large_image" },
        ...(post.cover_image?.startsWith("https://")
          ? [
              { property: "og:image", content: post.cover_image },
              { name: "twitter:image", content: post.cover_image },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}/blogs/${post.slug}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description,
            datePublished: post.published_at,
            keywords: post.seo_keywords,
            author: { "@type": "Organization", name: "Swastik Camphor" },
            publisher: { "@type": "Organization", name: "Swastik Camphor" },
            mainEntityOfPage: canonical(`/blogs/${post.slug}`),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Blog", path: "/blogs" },
              { name: post.title, path: `/blogs/${post.slug}` },
            ]),
          ),
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

/** Renders plain-text content: `## ` lines become headings, blank lines split paragraphs. */
function Content({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="mt-8">
      {blocks.map((block, i) =>
        block.startsWith("## ") ? (
          <section key={i} className="reveal mt-10">
            <h2 className="font-display text-2xl">{block.replace(/^##\s*/, "")}</h2>
            <div className="gold-rule mt-3 w-16" />
          </section>
        ) : block.startsWith("- ") ? (
          <ul key={i} className="mt-4 list-disc space-y-2 pl-5 text-muted-foreground">
            {block.split("\n").map((line, j) => (
              <li key={j} className="leading-relaxed">{line.replace(/^-\s*/, "")}</li>
            ))}
          </ul>
        ) : (
          <p key={i} className="mt-4 leading-relaxed text-muted-foreground">{block}</p>
        ),
      )}
    </div>
  );
}

function BlogPostPage() {
  const { post, related } = Route.useLoaderData();
  useReveal();

  return (
    <>
      <PageHeader eyebrow={post.category ?? "Blog"} title={post.title} subtitle={post.excerpt ?? ""} />
      <article className="mx-auto max-w-3xl px-4 py-12 md:px-8">
        {post.cover_image && (
          <img
            src={post.cover_image}
            alt={post.cover_alt ?? post.title}
            loading="lazy"
            className="aspect-16/9 w-full rounded-3xl object-cover"
          />
        )}
        <p className="mt-6 text-xs uppercase tracking-[0.24em] text-muted-foreground">
          {[post.read_time, "Swastik Camphor"].filter(Boolean).join(" • ")}
        </p>

        <Content text={post.content} />

        {post.related_links.length > 0 && (
          <ul className="mt-8 flex flex-wrap gap-3">
            {post.related_links.map((href) => (
              <li key={href}>
                <a
                  href={href}
                  className="inline-flex rounded-full border border-gold/40 px-4 py-2 text-sm font-medium transition-colors hover:bg-accent/15"
                >
                  {href.replace("/", "").replace(/^\w/, (c) => c.toUpperCase()) || "Home"}
                </a>
              </li>
            ))}
          </ul>
        )}

        <div className="card-premium mt-12 p-8 text-center">
          <h2 className="font-display text-2xl">Buy 100% pure camphor online</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Manufactured in Hyderabad since 1968 and dispatched across India.
          </p>
          <Link
            to="/products"
            className="mt-5 inline-flex rounded-full bg-accent px-7 py-3 text-sm font-semibold text-accent-foreground"
          >
            Shop camphor products
          </Link>
        </div>

        {related.length > 0 && (
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
        )}
      </article>
    </>
  );
}
