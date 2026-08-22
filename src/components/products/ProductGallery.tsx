import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Premium product gallery: large main image + swipeable / scrollable thumbnail rail. */
export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const list = images.length ? images : [];
  const [active, setActive] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActive(0);
  }, [images.join("|")]);

  if (!list.length) return null;
  const go = (next: number) => setActive((next + list.length) % list.length);

  return (
    <div>
      <figure className="relative overflow-hidden rounded-3xl bg-secondary/30">
        {list.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={`${name} — pure camphor for pooja and aarti (view ${i + 1})`}
            width={1200}
            height={900}
            loading={i === 0 ? "eager" : "lazy"}
            className={`h-full w-full object-contain transition-opacity duration-500 ${
              i === active ? "opacity-100" : "pointer-events-none absolute inset-0 opacity-0"
            }`}
          />
        ))}

        {list.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => go(active - 1)}
              className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-background/80 p-2 shadow transition hover:bg-background md:block"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => go(active + 1)}
              className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-background/80 p-2 shadow transition hover:bg-background md:block"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </figure>

      {list.length > 1 && (
        <div className="relative mt-4">
          <div
            ref={railRef}
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:thin]"
          >
            {list.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show image ${i + 1}`}
                aria-current={i === active}
                className={`h-20 w-20 shrink-0 snap-start overflow-hidden rounded-xl border transition ${
                  i === active ? "border-primary ring-2 ring-primary/30" : "border-border opacity-80 hover:opacity-100"
                }`}
              >
                <img src={src} alt={`${name} thumbnail ${i + 1}`} loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-xs text-muted-foreground md:hidden">
            <span>Swipe to see all {list.length} photos</span>
            <span>
              {active + 1} / {list.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
