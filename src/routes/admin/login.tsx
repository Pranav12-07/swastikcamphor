import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adminMe } from "@/lib/admin.functions";
import { useServerFn } from "@tanstack/react-start";
import logoAsset from "@/assets/swastik-logo.png.asset.json";

const logo = logoAsset.url;
import { Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Staff Login — Swastik Camphor Admin" },
      { name: "description", content: "Secure staff sign-in for the Swastik Camphor store management system." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Staff Login — Swastik Camphor Admin" },
      { property: "og:description", content: "Secure staff sign-in for the Swastik Camphor store management system." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const me = useServerFn(adminMe);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        if (active) setChecking(false);
        return;
      }
      try {
        const info = await me(undefined as never);
        if (info.isStaff) {
          navigate({ to: "/admin/dashboard", replace: true });
          return;
        }
      } catch {
        /* not staff */
      }
      if (active) setChecking(false);
    })();
    return () => {
      active = false;
    };
  }, [me, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setBusy(false);
      toast.error("Invalid email or password");
      return;
    }
    try {
      const info = await me(undefined as never);
      if (!info.isStaff) {
        await supabase.auth.signOut();
        toast.error("This account does not have staff access");
        setBusy(false);
        return;
      }
      navigate({ to: "/admin/dashboard", replace: true });
    } catch {
      await supabase.auth.signOut();
      toast.error("We could not verify your access. Try again.");
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg">
        <div className="flex flex-col items-center text-center">
          <img src={logo} alt="Swastik Camphor" className="h-14 w-14 object-contain" />
          <h1 className="mt-3 text-lg font-semibold tracking-tight">Swastik Camphor Admin</h1>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Management System</p>
        </div>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium" htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              type="email"
              required
              maxLength={255}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              required
              maxLength={100}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Sign in
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Staff access only. All actions are logged.
        </p>
      </div>
    </div>
  );
}
