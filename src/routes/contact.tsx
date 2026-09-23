import { canonical, canonicalLink } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/PageHeader";
import { SocialLinks } from "@/components/SocialLinks";
import { ContactMap } from "@/components/contact/ContactMap";
import { site } from "@/config/site";
import { submitContact } from "@/lib/api.functions";
import { useReveal } from "@/hooks/use-reveal";

export const Route = createFileRoute("/contact")({
  head: () => ({
    links: canonicalLink("/contact"),
    meta: [
      { property: "og:url", content: canonical("/contact") },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Contact Swastik Camphor — Hyderabad | Call, Email or Visit" },
      {
        name: "description",
        content:
          "Contact Swastik Camphor at 8-1-40/189, Samatha Colony, Shaikpet, Hyderabad, Telangana 500008. Call +91 7416886881, email shop@online.swastikcamphor.in, or send us a message online.",
      },
      { property: "og:title", content: "Contact Swastik Camphor" },
      {
        property: "og:description",
        content: "Reach our Hyderabad team for orders, bulk enquiries and support.",
      },
    ],
  }),
  component: Contact,
});

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Enter a valid email address").max(255),
  phone: z
    .string()
    .trim()
    .max(20)
    .refine((v) => v === "" || /^[0-9+\-\s]{6,20}$/.test(v), "Enter a valid phone number"),
  subject: z.string().trim().min(2, "Please add a subject").max(150),
  message: z.string().trim().min(10, "Please write at least 10 characters").max(2000),
});

function Contact() {
  useReveal();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form).entries());
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        next[String(i.path[0])] = i.message;
      });
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await submitContact({ data: parsed.data });
      form.reset();
      setSent(true);
      toast.success("Thank you! Your message has been received.");
    } catch {
      toast.error("Something went wrong. Please email us at " + site.email);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Contact us"
        title="We would love to hear from you"
        subtitle="Questions about our camphor, a bulk order for your temple, or feedback — our Hyderabad team is happy to help."
      />

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:px-8 lg:grid-cols-[1.1fr_1fr]">
        <form onSubmit={onSubmit} noValidate className="card-premium reveal grid gap-4 p-6 sm:grid-cols-2">
          <h2 className="sm:col-span-2 font-display text-2xl">Send us a message</h2>
          {(
            [
              { name: "name", label: "Your name", type: "text", full: false, autoComplete: "name" },
              { name: "email", label: "Email address", type: "email", full: false, autoComplete: "email" },
              { name: "phone", label: "Phone (optional)", type: "tel", full: false, autoComplete: "tel" },
              { name: "subject", label: "Subject", type: "text", full: false, autoComplete: "off" },
            ] as const
          ).map((f) => (
            <div key={f.name}>
              <label htmlFor={f.name} className="text-sm font-medium">
                {f.label}
              </label>
              <input
                id={f.name}
                name={f.name}
                type={f.type}
                autoComplete={f.autoComplete}
                aria-invalid={Boolean(errors[f.name])}
                className="mt-1.5 w-full rounded-xl border border-gold/40 bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              {errors[f.name] && <p className="mt-1 text-xs text-destructive">{errors[f.name]}</p>}
            </div>
          ))}
          <div className="sm:col-span-2">
            <label htmlFor="message" className="text-sm font-medium">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              rows={5}
              maxLength={2000}
              aria-invalid={Boolean(errors["message"])}
              className="mt-1.5 w-full rounded-xl border border-gold/40 bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {errors["message"] && <p className="mt-1 text-xs text-destructive">{errors["message"]}</p>}
          </div>
          <button
            type="submit"
            disabled={busy}
            className="sm:col-span-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5 disabled:opacity-60"
          >
            {busy ? "Sending…" : "Send message"}
          </button>
          {sent && (
            <p className="sm:col-span-2 text-sm text-primary">
              Thank you for reaching out — we usually reply within one business day.
            </p>
          )}
        </form>

        <div className="reveal space-y-5">
          <div className="card-premium p-6">
            <h2 className="font-display text-2xl">Reach us directly</h2>
            <div className="gold-rule mt-3 w-14" />
            <ul className="mt-5 space-y-4 text-sm">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <span>{site.address.full}</span>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <a href={`tel:${site.phoneHref}`} className="hover:text-primary">
                  {site.phone}
                </a>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <a href={`mailto:${site.email}`} className="hover:text-primary">
                  {site.email}
                </a>
              </li>
              <li className="flex gap-3">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <span>Monday – Saturday, 9:30 AM – 7:00 PM IST</span>
              </li>
            </ul>
            <a
              href={`https://wa.me/${site.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-gold/50 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent/15"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> Chat on WhatsApp
            </a>
            <SocialLinks className="mt-6" />
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 pb-20 md:px-8">
        <h2 className="reveal text-2xl">Visit our location</h2>
        <div className="gold-rule reveal mt-3 w-16" />
        <div className="reveal mt-6">
          <ContactMap />
        </div>
      </section>
    </>
  );
}