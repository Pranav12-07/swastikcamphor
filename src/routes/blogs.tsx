import { createFileRoute } from "@tanstack/react-router";
import tablets from "@/assets/product-tablets.jpg";
import bhimseni from "@/assets/product-bhimseni.jpg";
import cones from "@/assets/product-cones.jpg";
import about from "@/assets/about.jpg";
import { PageHeader } from "@/components/PageHeader";
import { useReveal } from "@/hooks/use-reveal";

export const Route = createFileRoute("/blogs")({
  head: () => ({
    meta: [
      { title: "Blogs — Camphor Rituals, Benefits & Care | Swastik Camphor" },
      {
        name: "description",
        content:
          "Read about the spiritual significance of camphor, Bhimseni camphor benefits, safe burning tips and how to choose pure camphor for your home.",
      },
      { property: "og:title", content: "Swastik Camphor Blogs" },
      { property: "og:description", content: "Camphor rituals, benefits, safety tips and buying guides." },
    ],
  }),
  component: Blogs,
});

const posts = [
  {
    title: "The spiritual significance of camphor in Hindu rituals",
    excerpt:
      "Camphor burns completely without leaving a trace — a symbol of the ego dissolving in divine light. Here is why every aarti ends with a camphor flame.",
    image: about,
    tag: "Rituals",
    read: "4 min read",
  },
  {
    title: "Bhimseni vs synthetic camphor: how to tell the difference",
    excerpt:
      "Natural Bhimseni camphor is cooling, aromatic and Ayurveda-friendly. Learn the simple tests to identify genuinely pure camphor.",
    image: bhimseni,
    tag: "Buying guide",
    read: "5 min read",
  },
  {
    title: "Five safe ways to burn camphor at home",
    excerpt:
      "Ventilation, the right holder and safe distances — small habits that keep your daily pooja beautiful and worry free.",
    image: tablets,
    tag: "Safety",
    read: "3 min read",
  },
  {
    title: "Camphor beyond pooja: freshness, wardrobes and wellness",
    excerpt:
      "From repelling insects naturally to easing congestion in traditional remedies, camphor has a place in every Indian home.",
    image: cones,
    tag: "Wellness",
    read: "4 min read",
  },
];

function Blogs() {
  useReveal();
  return (
    <>
      <PageHeader
        eyebrow="Blogs"
        title="Stories, rituals and camphor wisdom"
        subtitle="Practical guides and traditional knowledge from the Swastik Camphor family."
      />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-14 md:grid-cols-2 md:px-8">
        {posts.map((post, i) => (
          <article
            key={post.title}
            className="card-premium reveal group overflow-hidden"
            style={{ transitionDelay: `${i * 80}ms` }}
          >
            <div className="aspect-16/9 overflow-hidden">
              <img
                src={post.image}
                alt=""
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
            </div>
          </article>
        ))}
      </div>
    </>
  );
}