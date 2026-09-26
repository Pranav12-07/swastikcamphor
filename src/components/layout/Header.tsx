import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, LogOut, Menu, Phone, ShoppingBasket, Tag, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import logoAsset from "@/assets/swastik-logo-trimmed.png.asset.json";
import { site } from "@/config/site";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";

/** Full nav from 1024 px. Twin Pack Offers is the gold pill. */
const NAV = [
  { label: "Home", to: "/" },
  { label: "Our Products", to: "/products" },
  { label: "Twin Pack Offers", to: "/products", hash: "twin-packs", pill: true },
  { label: "About Us", to: "/about" },
  { label: "Blogs", to: "/blogs" },
  { label: "Contact Us", to: "/contact" },
] as const;

const whatsappMessage = encodeURIComponent(
  "Hi Swastik Camphor! I'd like to know more about your camphor products.",
);

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { count } = useCart();
  const { session, isAdmin } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock page scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
    <header
      className={cn(
        "site-header sticky top-0 z-50 w-full transition-all duration-200",
        scrolled
          ? "border-b border-gold/30 bg-background/95 shadow-[var(--shadow-soft)] backdrop-blur"
          : "bg-background/80",
      )}
    >
      <div
        className={cn(
          "mx-auto flex h-[60px] max-w-7xl items-center justify-between gap-2 px-3 transition-all duration-200 sm:px-4 md:px-8 xl:h-[76px]",
          scrolled && "xl:h-[62px]",
        )}
      >
        <Link
          to="/"
          aria-label="Swastik Camphor home"
          className="flex min-w-0 shrink items-center gap-2 sm:gap-2.5"
          onClick={() => setOpen(false)}
        >
          <img
            src={logoAsset.url}
            alt="Swastik Camphor logo"
            className="h-[38px] w-auto shrink-0 object-contain xl:h-12"
            width={188}
            height={92}
            fetchPriority="high"
          />
          <span className="flex flex-col leading-none">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-deep lg:text-[13px]">
              100% {t("PURE")} · {t("SINCE")} 1968
            </span>
          </span>
        </Link>

        {/* Full nav from 1024px; below that the drawer takes over */}
        <nav className="hidden items-center lg:flex lg:gap-4 xl:gap-6" aria-label="Primary">
          {NAV.map((item) =>
            "pill" in item && item.pill ? (
              <Link
                key={item.label}
                to={item.to}
                hash={item.hash}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-gold-soft px-3 py-1.5 text-sm font-semibold text-maroon-deep transition-colors hover:bg-gold/60 xl:px-3.5 xl:text-[15px]"
              >
                <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                {t(item.label)}
              </Link>
            ) : (
              <Link
                key={item.label}
                to={item.to}
                className="whitespace-nowrap rounded-full px-2 py-2 text-sm font-medium text-foreground/80 underline-offset-8 transition-colors hover:bg-accent/15 hover:text-foreground data-[status=active]:text-foreground data-[status=active]:underline data-[status=active]:decoration-gold data-[status=active]:decoration-2 xl:px-3 xl:text-[15px]"
              >
                {t(item.label)}
              </Link>
            ),
          )}
        </nav>

        <TooltipProvider delayDuration={250}>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <span className="hidden xl:inline-flex">
            <LanguageSwitcher className="h-10" />
          </span>
          {isAdmin && (
            <Link
              to="/admin"
              className="hidden rounded-full border border-gold/40 px-3 py-2 text-xs font-medium transition-colors hover:bg-accent/15 xl:inline-flex"
            >
              {t("Admin")}
            </Link>
          )}
          {session ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/account"
                    aria-label={t("My account")}
                    className="hidden h-9 w-9 place-items-center rounded-full border border-gold/40 transition-colors hover:bg-accent/15 lg:grid xl:h-10 xl:w-10"
                  >
                    <User className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom">{t("My account")}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={signOut}
                    aria-label={t("Sign out")}
                    className="hidden h-9 w-9 place-items-center rounded-full border border-gold/40 transition-colors hover:bg-accent/15 lg:grid xl:h-10 xl:w-10"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{t("Sign out")}</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <Link
              to="/auth"
              aria-label={t("Sign in")}
              className="hidden h-9 w-9 place-items-center rounded-full border border-gold/40 transition-colors hover:bg-accent/15 lg:grid xl:h-10 xl:w-10"
            >
              <User className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">{t("Sign in")}</span>
            </Link>
          )}
          {!session && (
            <Link
              to="/auth"
              className="hidden rounded-full border border-gold/40 px-3 py-2 text-xs font-medium transition-colors hover:bg-accent/15 min-[1440px]:inline-flex"
            >
              {t("Sign in")}
            </Link>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/cart"
                aria-label={`${t("Cart")}, ${count} ${t("items")}`}
                className="relative flex h-11 w-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5 xl:h-10 xl:w-auto xl:px-3.5"
              >
                <ShoppingBasket className="h-4 w-4" aria-hidden="true" />
                <span className="hidden text-sm font-medium xl:inline">{t("Cart")}</span>
                {count > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[0.65rem] font-bold text-maroon-deep">
                    {count}
                  </span>
                )}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="bottom">{t("Cart")}</TooltipContent>
          </Tooltip>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-label={t("Menu")}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold/40 lg:hidden"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        </TooltipProvider>
      </div>

    </header>

      {/* Mobile / tablet drawer (below 1024px) */}
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label={t("Menu")}>
          <button
            type="button"
            aria-label={t("Close menu")}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-maroon-deep/50 backdrop-blur-sm"
          />
          <nav
            aria-label="Mobile"
            className="animate-rise-in absolute right-0 top-0 flex h-full w-[85%] max-w-[360px] flex-col overflow-y-auto border-l border-gold/30 bg-background p-5 shadow-[var(--shadow-lift)]"
          >
            <div className="flex items-center justify-between">
              <img src={logoAsset.url} alt="" className="h-9 w-auto object-contain" width={188} height={92} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("Close menu")}
                className="grid h-11 w-11 place-items-center rounded-full border border-gold/40"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <Link
              to="/products"
              hash="twin-packs"
              onClick={() => setOpen(false)}
              className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gold-soft px-4 text-sm font-semibold text-maroon-deep"
            >
              <Tag className="h-4 w-4" aria-hidden="true" />
              {t("Twin Pack Offers")}
            </Link>

            <div className="mt-3">
              {NAV.filter((item) => !("pill" in item && item.pill)).map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="flex h-12 items-center border-b border-border/60 text-sm font-medium text-foreground/90 last:border-0"
                >
                  {t(item.label)}
                </Link>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <LanguageSwitcher className="h-11" />
              {session ? (
                <Link
                  to="/account"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-gold/40 text-sm font-medium"
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                  {t("My account")}
                </Link>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-full border border-gold/40 text-sm font-medium"
                >
                  {t("Sign in")}
                </Link>
              )}
            </div>

            {session && (
              <>
                <Link
                  to="/wishlist"
                  onClick={() => setOpen(false)}
                  className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-full border border-gold/40 text-sm font-medium"
                >
                  <Heart className="h-4 w-4" aria-hidden="true" />
                  {t("Wishlist")}
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="mt-3 inline-flex h-11 items-center justify-center rounded-full border border-gold/40 text-sm font-medium"
                  >
                    {t("Admin")}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-full border border-gold/40 text-sm font-medium"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  {t("Sign out")}
                </button>
              </>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <a
                href={`https://wa.me/${site.whatsapp}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#25D366] text-sm font-semibold text-white"
              >
                WhatsApp
              </a>
              <a
                href={`tel:${site.phoneHref}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-gold/40 text-sm font-medium"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                {t("Call")}
              </a>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
