import { canonical, canonicalLink } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { site } from "@/config/site";

export const Route = createFileRoute("/terms-and-conditions")({
  head: () => ({
    links: canonicalLink("/terms-and-conditions"),
    meta: [
      { property: "og:url", content: canonical("/terms-and-conditions") },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Terms & Conditions — Swastik Camphor" },
      { name: "description", content: "The terms that apply when you browse or buy from Swastik Camphor." },
      { property: "og:title", content: "Terms & Conditions — Swastik Camphor" },
      { property: "og:description", content: "Terms of use for the Swastik Camphor website and orders." },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <>
      <PageHeader eyebrow="Legal" title="Terms & Conditions" />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-14 text-sm leading-relaxed text-muted-foreground md:px-8">
        <p>By using this website or placing an order, you agree to the following terms.</p>
        <div>
          <h2 className="font-display text-xl text-foreground">Products and pricing</h2>
          <p className="mt-2">
            Product images are indicative. Prices, offers and availability may change without prior notice.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl text-foreground">Orders</h2>
          <p className="mt-2">
            Every order is confirmed by our team by phone or email before dispatch. We may cancel an order if
            details are incomplete or the product is unavailable.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl text-foreground">Safe use</h2>
          <p className="mt-2">
            Camphor is a flammable product intended for ritual and external use only. Burn it in a proper
            holder in a ventilated space, keep it away from children and pets, and never leave it unattended.
            {" "}{site.name} is not liable for misuse.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl text-foreground">Intellectual property</h2>
          <p className="mt-2">
            All content, branding and images on this website belong to {site.name} and may not be reused
            without permission.
          </p>
        </div>
      </div>
    </>
  );
}