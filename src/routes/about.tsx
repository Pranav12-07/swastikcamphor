import { createFileRoute } from "@tanstack/react-router";
import about from "@/assets/about.jpg";
import { PageHeader } from "@/components/PageHeader";
import { useReveal } from "@/hooks/use-reveal";
import { site } from "@/config/site";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Swastik Camphor — Purity, Tradition & Quality" },
      {
        name: "description",
        content:
          "Learn about Swastik Camphor: a Hyderabad-based brand crafting 100% pure, natural, chemical-free camphor for pooja, aromatherapy and household use.",
      },
      { property: "og:title", content: "About Swastik Camphor" },
      {
        property: "og:description",
        content: "Purity, tradition, quality and sustainability in every camphor tablet we make.",
      },
    ],
  }),
  component: About,
});

const pillars = [
  { title: "Purity", text: "Only 100% pure camphor — never diluted, never chemically loaded." },
  { title: "Tradition", text: "Made with respect for age-old Indian rituals and pooja practices." },
  { title: "Quality", text: "Every batch is checked for fragrance, burn and residue-free performance." },
  { title: "Sustainability", text: "Ethically sourced raw material and eco-friendly packaging." },
];

function About() {
  useReveal();
  return (
    <>
      <PageHeader
        eyebrow="About us"
        title="Devotion, distilled into pure camphor"
        subtitle={`${site.name} is a trusted Indian brand dedicated to producing 100% pure and natural camphor products for spiritual, medicinal and household use.`}
      />

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:px-8 lg:grid-cols-2">
        <div className="reveal overflow-hidden rounded-3xl">
          <img
            src={about}
            alt="A brass lamp and camphor flame during a temple aarti"
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="reveal space-y-4 leading-relaxed text-muted-foreground">
          <p>
            With a deep respect for tradition and an unwavering commitment to quality, we craft camphor that
            is safe, fragrant and completely free from harmful chemicals.
          </p>
          <p>
            Our camphor is used in daily pooja, aarti, meditation, aromatherapy and as a natural home
            freshener. Whether you are a household devotee, a temple, or a wholesale buyer, we deliver the
            same consistent purity in every pack.
          </p>
          <p>
            Based in Hyderabad and shipping across India, {site.name} continues to be a name families trust
            for their most sacred moments.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 md:px-8">
        <h2 className="reveal text-3xl">What we stand for</h2>
        <div className="gold-rule reveal mt-4 w-20" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p, i) => (
            <div key={p.title} className="card-premium reveal p-6" style={{ transitionDelay: `${i * 90}ms` }}>
              <h3 className="font-display text-xl">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}