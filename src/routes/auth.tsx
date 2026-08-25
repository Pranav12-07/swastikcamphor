import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { signInWithDetails } from "@/lib/login.functions";
import { sendWhatsAppOtp, verifyWhatsAppOtp } from "@/lib/whatsapp-auth.functions";
import { adminMe } from "@/lib/admin.functions";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";


const searchSchema = z.object({
  /** Same-origin path to return to after signing in (e.g. /checkout). */
  redirect: z.string().startsWith("/").max(120).optional(),
});

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Login — Swastik Camphor" },
      {
        name: "description",
        content:
          "Sign in to Swastik Camphor with your name, email and mobile number, or continue instantly with Google.",
      },
      { property: "og:title", content: "Login — Swastik Camphor" },
      { property: "og:description", content: "Access your Swastik Camphor account and order history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const formSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your name."),
  email: z.string().trim().email("Please enter a valid email address."),
  phone: z
    .string()
    .trim()
    .refine((v) => /^(\+?91)?[6-9]\d{9}$/.test(v.replace(/[^\d+]/g, "")), "Please enter a valid 10-digit mobile number."),
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { session } = useAuth();
  const signIn = useServerFn(signInWithDetails);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // After a session exists, the destination comes from the backend role, never
  // from client state: staff land in /admin, customers always in /account.
  useEffect(() => {
    if (!session) return;
    let active = true;
    (async () => {
      let staff = false;
      try {
        const me = await adminMe(undefined as never);
        staff = me.isStaff;
      } catch {
        staff = false;
      }
      if (!active) return;
      if (staff) {
        navigate({ to: "/admin/dashboard", replace: true });
        return;
      }
      // Customers may return to where they were, but never into the admin area.
      const target = redirect && !redirect.startsWith("/admin") ? redirect : "/account";
      navigate({ to: target, replace: true });
    })();
    return () => {
      active = false;
    };
  }, [session, navigate, redirect]);


  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const parsed = formSchema.safeParse({ fullName, email, phone });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Please check your details.");

      const result = await signIn({
        data: { full_name: parsed.data.fullName, email: parsed.data.email, phone: parsed.data.phone },
      });
      const { error: sessionError } = await supabase.auth.verifyOtp({
        token_hash: result.tokenHash,
        type: "email",
      });
      if (sessionError) throw new Error("We couldn't sign you in. Please try again.");
      toast.success("Signed in.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setError(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Google sign-in failed. Please try again.");
        return;
      }
      if (result.redirected) return;
      toast.success("Signed in.");
    } catch {
      toast.error("Google sign-in failed. Please try again.");
    }
  }

  const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-70";

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Sign in to your account"
        subtitle={
          redirect === "/checkout"
            ? "Enter your details to complete your order — your cart is safe and waiting."
            : "Enter your name, email and mobile number to continue — no password, no code."
        }
      />
      <section className="mx-auto w-full max-w-md px-4 pb-20 md:px-8">
        <form onSubmit={onSubmit} className="surface-glass space-y-4 rounded-2xl p-6">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              value={fullName}
              onChange={(ev) => setFullName(ev.target.value)}
              required
              maxLength={120}
              autoComplete="name"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
              maxLength={255}
              autoComplete="email"
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="phone">
              Mobile number
            </label>
            <div className="flex items-stretch gap-2">
              <span className="flex items-center rounded-lg border border-border bg-muted/40 px-2 text-sm">
                🇮🇳 +91
              </span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(ev) => setPhone(ev.target.value)}
                required
                autoComplete="tel"
                placeholder="98765 43210"
                className={inputClass}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" disabled={busy} size="lg" className="w-full rounded-full">
            {busy ? "Please wait…" : "Continue"}
          </Button>
        </form>

        <div className="mt-6 border-t border-border pt-5 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Or</p>
          <Button
            type="button"
            variant="outline"
            onClick={onGoogle}
            className="mt-3 w-full rounded-full"
            size="lg"
          >
            Continue with Google
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="underline">
            Back to home
          </Link>
        </p>
      </section>
    </>
  );
}
