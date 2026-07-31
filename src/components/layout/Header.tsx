import { Link } from "@tanstack/react-router";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";
import logo from "@/assets/logo.png";
import { mainNav, site } from "@/config/site";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { count } = useCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-500",
        scrolled ? "surface-glass shadow-[var(--shadow-soft)]" : "bg-background/80 backdrop-blur-sm",
      )}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:flex sm:justify-between md:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-3" onClick={() => setOpen(false)}>
          <img
            src={logo}
            alt="Swastik Camphor logo"
            className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-gold/50"
            width={44}
            height={44}
          />
          <span className="min-w-0">
            <span className="block truncate font-display text-lg leading-tight text-foreground">
              {site.name}
            </span>
            <span className="block truncate text-[0.68rem] uppercase tracking-[0.22em] text-muted-foreground">
              {site.tagline}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {mainNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="rounded-full px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent/15 hover:text-foreground data-[status=active]:bg-accent/20 data-[status=active]:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/cart"
            aria-label={`Cart with ${count} items`}
            className="relative grid h-10 w-10 place-items-center rounded-full border border-gold/40 transition-colors hover:bg-accent/15"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[0.65rem] font-semibold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 lg:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="animate-rise-in border-t border-gold/25 bg-background/95 px-4 pb-4 lg:hidden" aria-label="Mobile">
          {mainNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="block border-b border-border/60 py-3 text-sm font-medium text-foreground/90 last:border-0"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}