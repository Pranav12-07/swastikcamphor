import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { site } from "@/config/site";
import { useReveal } from "@/hooks/use-reveal";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Camphor Purity, Orders & Shipping | Swastik Camphor" },
      {
        name: "description",
        content:
          "Answers about Swastik Camphor purity, usage, bulk orders, shipping timelines, returns and payment options.",
      },
      { property: "og:title", content: "Swastik Camphor FAQ" },
      { property: "og:description", content: "Common questions about our camphor, orders and delivery." },
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
        <Accordion type="single" collapsible className="reveal card-premium divide-y divide-border px-6">
          {faqs.map((f, i) => (
            <AccordionItem key={f.q} value={`item-${i}`} className="border-0">
              <AccordionTrigger className="text-left font-display text-lg">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </>
  );
}