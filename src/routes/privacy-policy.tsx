import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { site } from "@/config/site";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Swastik Camphor" },
      { name: "description", content: "How Swastik Camphor collects, uses and protects your personal information." },
      { property: "og:title", content: "Privacy Policy — Swastik Camphor" },
      { property: "og:description", content: "How we handle and protect your personal data." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <>
      <PageHeader eyebrow="Legal" title="Privacy Policy" />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-14 text-sm leading-relaxed text-muted-foreground md:px-8">
        <p>
          At {site.name}, we respect your privacy. This policy explains what information we collect and how we
          use it.
        </p>
        <div>
          <h2 className="font-display text-xl text-foreground">Information we collect</h2>
          <p className="mt-2">
            Name, email, phone number and delivery address when you place an order or contact us, along with
            the contents of your enquiry or chat with our assistant.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl text-foreground">How we use it</h2>
          <p className="mt-2">
            To process and deliver your orders, respond to enquiries, improve our products and services, and
            send order-related updates. We never sell your data to third parties.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl text-foreground">Data security</h2>
          <p className="mt-2">
            Your information is stored securely and is accessible only to authorised team members handling
            your order or enquiry.
          </p>
        </div>
        <div>
          <h2 className="font-display text-xl text-foreground">Your choices</h2>
          <p className="mt-2">
            You can request access to, correction of, or deletion of your personal data by writing to{" "}
            <a href={`mailto:${site.email}`} className="text-primary">
              {site.email}
            </a>
            .
          </p>
        </div>
      </div>
    </>
  );
}