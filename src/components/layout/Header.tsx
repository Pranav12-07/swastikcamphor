import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Menu, ShoppingBag, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import logoAsset from "@/assets/swastik-logo.png.asset.json";
import { mainNav, site } from "@/config/site";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { count } = useCart();
  const { session, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

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
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3 md:px-8">
        <Link to="/" className="flex min-w-0 shrink items-center gap-2 sm:gap-3" onClick={() => setOpen(false)}>
          <img
            src={logoAsset.url}
            alt="Swastik Camphor — pure camphor manufacturer since 1968"
            className="h-9 w-auto shrink-0 object-contain sm:h-11"
            width={188}
            height={92}
          />
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate font-display text-base leading-tight text-foreground lg:text-lg">
              {site.name}
            </span>
            <span className="block truncate text-[0.62rem] uppercase tracking-[0.2em] text-muted-foreground lg:text-[0.68rem]">
              ESTD 1968 • {site.tagline}
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
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex rounded-full border border-gold/40 px-3 py-2 text-xs font-medium transition-colors hover:bg-accent/15"
            >
              Admin
            </Link>
          )}
          {session ? (
            <>
              <Link
                to="/account"
                aria-label="My account"
                className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 transition-colors hover:bg-accent/15"
              >
                <User className="h-4 w-4" aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={signOut}
                aria-label="Sign out"
                className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 transition-colors hover:bg-accent/15"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="rounded-full border border-gold/40 px-3 py-2 text-xs font-medium transition-colors hover:bg-accent/15"
            >
              Sign in
            </Link>
          )}
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