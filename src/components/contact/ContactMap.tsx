import { MapPin, Navigation } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { site } from "@/config/site";

export function ContactMap() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div className="card-premium overflow-hidden">
      <div ref={ref} className="aspect-video w-full sm:aspect-21/9">
        {visible ? (
          <iframe
            title={`Google Map showing ${site.name} at ${site.address.full}`}
            src={site.mapEmbedUrl}
            className="h-full w-full border-0"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div
            className="grid h-full w-full place-items-center bg-muted/40 text-sm text-muted-foreground"
            aria-hidden="true"
          >
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-accent" /> Loading map…
            </span>
          </div>
        )}
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