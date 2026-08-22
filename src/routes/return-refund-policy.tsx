import { canonical, canonicalLink } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { site } from "@/config/site";

export const Route = createFileRoute("/return-refund-policy")({
  head: () => ({
    links: canonicalLink("/return-refund-policy"),
    meta: [
      { property: "og:url", content: canonical("/return-refund-policy") },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Return & Refund Policy — Swastik Camphor" },
      { name: "description", content: "Returns, replacements and refunds for Swastik Camphor orders." },
      { property: "og:title", content: "Return & Refund Policy — Swastik Camphor" },
      { property: "og:description", content: "7-day returns on unopened products, free replacement on damage." },
    ],
  }),
  component: Returns,
});

function Returns() {
  return (
    <>
      <PageHeader eyebrow="Legal" title="Return & Refund Policy" />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-14 text-sm leading-relaxed text-muted-foreground md:px-8">
        <div>
          <h2 className="font-display text-xl text-foreground">Returns</h2>
          <p className="mt-2">
            Unopened products in their original packaging can be returned within 7 days of delivery. Opened
            camphor packs cannot be returned for hygiene and safety reasons.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl text-foreground">Damaged or wrong items</h2>
          <p className="mt-2">
            Share photos of the parcel within 48 hours of delivery and we will replace the item free of
            charge.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl text-foreground">Refunds</h2>
          <p className="mt-2">
            Approved refunds are processed within 5-7 business days to the original payment method. Shipping
            charges are non-refundable unless the error was ours.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl text-foreground">How to request</h2>
          <p className="mt-2">
            Email{" "}
            <a href={`mailto:${site.email}`} className="text-primary">
              {site.email}
            </a>{" "}
            or call {site.phone} with your order number.
          </p>
        </div>
      </div>
    </>
  );
}