import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import logoAsset from "@/assets/swastik-logo.png.asset.json";
import { SocialLinks } from "@/components/SocialLinks";
import { mainNav, marketplaces, site, supportNav } from "@/config/site";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-gold/25 bg-secondary/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-2 md:px-8 lg:grid-cols-4">
        <div>
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={logoAsset.url}
              alt="Swastik Camphor logo"
              className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-gold/50"
              width={48}
              height={48}
            />
            <span className="font-display text-xl">{site.name}</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            100% pure, natural camphor crafted with devotion in Hyderabad — for pooja, aarti, aromatherapy
            and everyday freshness.
          </p>
          <SocialLinks className="mt-6" />
        </div>

        <nav aria-label="Explore">
          <h2 className="font-display text-lg">Explore</h2>
          <div className="gold-rule mt-2 w-12" />
          <ul className="mt-4 space-y-2 text-sm">
            {mainNav.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="text-muted-foreground transition-colors hover:text-foreground">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Quick links">
          <h2 className="font-display text-lg">Quick Links</h2>
          <div className="gold-rule mt-2 w-12" />
          <ul className="mt-4 space-y-2 text-sm">
            {supportNav.map((item) => (
              <li key={item.label}>
                <Link to={item.to} className="text-muted-foreground transition-colors hover:text-foreground">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="font-display text-lg">Reach Us</h2>
          <div className="gold-rule mt-2 w-12" />
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <span>{site.address.full}</span>
            </li>
            <li className="flex gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <a href={`tel:${site.phoneHref}`} className="hover:text-foreground">
                {site.phone}
              </a>
            </li>
            <li className="flex gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <a href={`mailto:${site.email}`} className="hover:text-foreground">
                {site.email}
              </a>
            </li>
          </ul>
          <p className="mt-5 text-xs uppercase tracking-[0.2em] text-muted-foreground">Also available on</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {marketplaces.map((m) => (
              <li key={m.id}>
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-gold/40 px-3 py-1 text-xs transition-colors hover:bg-accent/15"
                >
                  {m.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-gold/20 px-4 py-5 text-center text-xs text-muted-foreground md:px-8">
        © {new Date().getFullYear()} {site.name}. All rights reserved.
      </div>
    </footer>
  );
}