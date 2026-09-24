import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ReactNode } from "react";
import {
  FileText,
  MessageSquare,
  LayoutDashboard, Package, FolderTree, Boxes, ShoppingCart, Users, CreditCard, Ticket,
  Star, Truck, Image as ImageIcon, BarChart3, Bell, Mail, Settings as SettingsIcon,
  UserCog, ShieldCheck, LogOut, Menu, X, ExternalLink,
} from "lucide-react";
import { adminMe } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/swastik-logo.png.asset.json";

const logo = logoAsset.url;

type Area = "dashboard" | "products" | "orders" | "customers" | "reviews" | "marketing" | "settings" | "admins";

const NAV: Array<{ to: string; label: string; icon: typeof Package; area: Area }> = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, area: "dashboard" },
  { to: "/admin/products", label: "Products", icon: Package, area: "products" },
  { to: "/admin/categories", label: "Categories", icon: FolderTree, area: "products" },
  { to: "/admin/inventory", label: "Inventory", icon: Boxes, area: "products" },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart, area: "orders" },
  { to: "/admin/customers", label: "Customers", icon: Users, area: "customers" },
  { to: "/admin/payments", label: "Payments", icon: CreditCard, area: "orders" },
  { to: "/admin/blogs", label: "Blogs", icon: FileText, area: "marketing" },
  { to: "/admin/messages", label: "Messages", icon: MessageSquare, area: "customers" },
  { to: "/admin/coupons", label: "Coupons", icon: Ticket, area: "marketing" },
  { to: "/admin/reviews", label: "Reviews", icon: Star, area: "reviews" },
  { to: "/admin/shipping", label: "Shipping", icon: Truck, area: "settings" },
  { to: "/admin/homepage", label: "Homepage", icon: ImageIcon, area: "marketing" },
  { to: "/admin/posters", label: "Promo Posters", icon: ImageIcon, area: "marketing" },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3, area: "dashboard" },
  { to: "/admin/notifications", label: "Notifications", icon: Bell, area: "dashboard" },
  { to: "/admin/emails", label: "Email Management", icon: Mail, area: "settings" },
  { to: "/admin/admin-users", label: "Admin Users", icon: ShieldCheck, area: "admins" },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon, area: "settings" },
  { to: "/admin/profile", label: "Admin Profile", icon: UserCog, area: "dashboard" },
];

export function useAdminMe() {
  const fn = useServerFn(adminMe);
  return useQuery({
    queryKey: ["admin-me"],
    queryFn: () => fn(undefined as never),
    retry: false,
    staleTime: 60_000,
  });
}

export function AdminShell({
  title,
  description,
  actions,
  area = "dashboard",
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  area?: Area;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const { data: me, isLoading, isError } = useAdminMe();

  useEffect(() => {
    if (isLoading) return;
    // Signed in but without a staff role: this is a customer, send them home.
    if (me && !me.isStaff) {
      navigate({ to: "/account", replace: true });
      return;
    }
    if (isError) navigate({ to: "/admin/login", replace: true });
  }, [isLoading, isError, me, navigate]);

  useEffect(() => setOpen(false), [pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!me?.isStaff) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-6 text-center">
        <div>
          <h1 className="text-xl font-semibold">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">This area is restricted to Swastik Camphor staff.</p>
          <Link to="/account" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
            Go to my account
          </Link>
        </div>
      </div>
    );
  }

  const allowed = NAV.filter((n) => me.areas.includes(n.area));
  const canSee = me.areas.includes(area);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", replace: true });
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 -translate-x-full overflow-y-auto border-r border-border bg-card transition-transform lg:translate-x-0",
          open && "translate-x-0",
        )}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-4">
          <img src={logo} alt="Swastik Camphor" className="h-9 w-9 rounded-md object-contain" />
          <div className="leading-tight">
            <p className="text-sm font-semibold">SWASTIK CAMPHOR</p>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Admin</p>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-1 p-3">
          {allowed.map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={signOut}
            className="mt-2 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </nav>
      </aside>

      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold sm:text-lg">{title}</h1>
            {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
          </div>
          <div className="flex items-center gap-2">{actions}</div>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent sm:flex"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Storefront
          </a>
        </header>
        <main className="p-4 sm:p-6">
          {canSee ? (
            children
          ) : (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <h2 className="font-semibold">Not available for your role</h2>
              <p className="mt-1 text-sm text-muted-foreground">Your role ({me.roles.join(", ")}) does not include this section.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
