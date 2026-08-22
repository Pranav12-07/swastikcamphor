import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";

const searchSchema = z.object({
  /** Same-origin path to return to after signing in (e.g. /checkout). */
  redirect: z.string().startsWith("/").max(120).optional(),
});

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Sign In or Create Account — Swastik Camphor" },
      {
        name: "description",
        content:
          "Sign in to your Swastik Camphor account with an email OTP or password to check out, track orders and manage your details.",
      },
      { property: "og:title", content: "Sign In — Swastik Camphor" },
      { property: "og:description", content: "Access your Swastik Camphor account and order history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "otp" | "password" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { session } = useAuth();
  const [mode, setMode] = useState<Mode>("otp");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: redirect ?? "/account", replace: true });
  }, [session, navigate, redirect]);

  async function sendOtp() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      setOtpSent(true);
      toast.success("We emailed you a 6-digit code.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the code");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "email" });
      if (error) throw error;
      toast.success("Signed in.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That code did not work");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "otp") {
      await (otpSent ? verifyOtp() : sendOtp());
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: fullName } },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const tabs: Array<{ id: Mode; label: string }> = [
    { id: "otp", label: "Email OTP" },
    { id: "password", label: "Password" },
    { id: "signup", label: "Create account" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title={mode === "signup" ? "Create your account" : "Sign in"}
        subtitle={
          redirect === "/checkout"
            ? "Sign in to complete your order — your cart is safe and waiting."
            : "Track orders, save your wishlist and check out faster."
        }
      />
      <section className="mx-auto w-full max-w-md px-4 pb-20 md:px-8">
        <div className="mb-4 grid grid-cols-3 gap-1 rounded-full border border-gold/40 p-1 text-sm">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setMode(t.id);
                setOtpSent(false);
              }}
              className={`rounded-full px-3 py-2 transition-colors ${
                mode === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent/15"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="surface-glass space-y-4 rounded-2xl p-6">
          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="fullName">
                Full name
              </label>
              <input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={mode === "otp" && otpSent}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-70"
            />
          </div>

          {mode === "otp" && otpSent && (
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="code">
                6-digit code
              </label>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                maxLength={8}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-center text-lg tracking-[0.4em]"
              />
              <button
                type="button"
                onClick={() => setOtpSent(false)}
                className="mt-2 text-xs text-muted-foreground underline"
              >
                Use a different email
              </button>
            </div>
          )}

          {mode !== "otp" && (
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={mode === "password" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy
              ? "Please wait…"
              : mode === "otp"
                ? otpSent
                  ? "Verify & sign in"
                  : "Email me a code"
                : mode === "password"
                  ? "Sign in"
                  : "Create account"}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            <Link to="/" className="underline">
              Back to home
            </Link>
          </p>
        </form>
      </section>
    </>
  );
}
