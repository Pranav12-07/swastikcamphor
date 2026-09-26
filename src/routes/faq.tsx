import { canonical, canonicalLink } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { ChevronDown } from "lucide-react";
import { site } from "@/config/site";
import { useReveal } from "@/hooks/use-reveal";

export const Route = createFileRoute("/faq")({
  head: () => ({
    links: canonicalLink("/faq"),
    meta: [
      { property: "og:url", content: canonical("/faq") },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "FAQ — Camphor Purity, Orders & Shipping | Swastik Camphor" },
      {
        name: "description",
        content:
          "Answers about Swastik Camphor purity, usage, bulk orders, shipping timelines, returns and payment options.",
      },
      { property: "og:title", content: "Swastik Camphor FAQ" },
      { property: "og:description", content: "Common questions about our camphor, orders and delivery." },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: Faq,
});

const faqs = [
  {
    q: "Is Swastik Camphor 100% pure?",
    a: "Yes. All our camphor is 100% pure and natural, free from harmful chemicals and adulterants, and quality checked batch by batch.",
  },
  {
    q: "What is the difference between camphor tablets and Bhimseni camphor?",
    a: "Camphor tablets are ideal for daily pooja and aarti with a clean, residue-free burn. Bhimseni camphor is natural crystal camphor prized for rituals, Ayurvedic use and aromatherapy.",
  },
  {
    q: "Do you deliver across India?",
    a: "Yes. We ship pan-India. Orders are usually dispatched within 1-2 business days and delivered in 3-7 business days depending on your location.",
  },
  {
    q: "Is shipping free?",
    a: "Shipping is free on orders above ₹499. Below that, a flat ₹49 shipping charge applies.",
  },
  {
    q: "Can I place a bulk or wholesale order?",
    a: `Absolutely. Temples, retailers and event organisers can write to ${site.email} or call ${site.phone} with quantity and city for a customised quote.`,
  },
  {
    q: "How should camphor be stored?",
    a: "Keep camphor in an airtight container, away from direct sunlight and heat, so it retains its fragrance and does not evaporate.",
  },
  {
    q: "Can I return a product?",
    a: "Unopened products can be returned within 7 days of delivery. Damaged or incorrect items are replaced free of charge.",
  },
  {
    q: "Is camphor safe to use at home?",
    a: "Yes, when used correctly. Always burn camphor in a proper holder in a ventilated space, keep it away from children, pets and flammable items, and never leave a flame unattended. Camphor is for external and ritual use only.",
  },
];

function Faq() {
  useReveal();
  return (
    <>
      <PageHeader
        eyebrow="FAQ"
        title="Frequently asked questions"
        subtitle="Everything you may want to know before you light your next camphor flame."
      />
      <div className="mx-auto max-w-3xl px-4 py-14 md:px-8">
        {/* Native <details>: answers stay in the page HTML so Google can read them. */}
        <div className="reveal card-premium divide-y divide-border px-6">
          {faqs.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left transition-all hover:underline [&::-webkit-details-marker]:hidden">
                <h3 className="font-display text-lg">{f.q}</h3>
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </>
  );
}