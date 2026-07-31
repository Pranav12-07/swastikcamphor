import { MapPin, Navigation } from "lucide-react";
import { site } from "@/config/site";

export function ContactMap() {
  return (
    <div className="card-premium overflow-hidden">
      <div className="aspect-video w-full sm:aspect-21/9">
        <iframe
          title={`Google Map showing ${site.name} at ${site.address.full}`}
          src={site.mapEmbedUrl}
          className="h-full w-full border-0"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-5 sm:flex sm:justify-between">
        <p className="flex min-w-0 gap-2 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <span>{site.address.full}</span>
        </p>
        <a
          href={site.directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5"
        >
          <Navigation className="h-4 w-4" aria-hidden="true" />
          Get Directions
        </a>
      </div>
    </div>
  );
}