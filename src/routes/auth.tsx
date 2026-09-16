import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
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
          "Sign in to Swastik Camphor with Google, or receive a 6-digit verification code by email.",
      },
      { property: "og:title", content: "Login — Swastik Camphor" },
      { property: "og:description", content: "Access your Swastik Camphor account and order history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Please enter a valid email address.").max(255);

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { session } = useAuth();

  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxRefs = useRef<Array<HTMLInputElement | null>>([]);

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
      const target = redirect && !redirect.startsWith("/admin") ? redirect : "/account";
      navigate({ to: target, replace: true });
    })();
    return () => {
      active = false;
    };
  }, [session, navigate, redirect]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function requestCode(resend = false) {
    if (busy) return;
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Please enter a valid email address.";
      setError(message);
      toast.error(message);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { error: sendError } = await supabase.auth.signInWithOtp({
        email: parsed.data.toLowerCase(),
        options: { shouldCreateUser: true },
      });
      if (sendError) throw new Error(sendError.message);
      setStep("otp");
      setDigits(["", "", "", "", "", ""]);
      setCooldown(60);
      toast.success(resend ? "New code sent to your email." : "Verification code sent to your email.");
      setTimeout(() => boxRefs.current[0]?.focus(), 50);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      const message = /rate|limit|often/i.test(raw)
        ? "Too many requests. Please wait a minute and try again."
        : "We could not send the code right now. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(code: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: code,
        type: "email",
      });
      if (verifyError) throw new Error(verifyError.message);
      toast.success("Signed in.");
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      const message = /expired/i.test(raw)
        ? "This code has expired. Please request a new one."
        : "Invalid OTP. Please try again.";
      setError(message);
      toast.error(message);
      setDigits(["", "", "", "", "", ""]);
      boxRefs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  }

  function onDigit(index: number, value: string) {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      setDigits((d) => d.map((v, i) => (i === index ? "" : v)));
      return;
    }
    const next = [...digits];
    for (let i = 0; i < clean.length && index + i < 6; i++) next[index + i] = clean[i]!;
    setDigits(next);
    const filled = Math.min(index + clean.length, 5);
    boxRefs.current[filled]?.focus();
    const joined = next.join("");
    if (joined.length === 6 && !next.includes("")) void submitCode(joined);
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
        title={step === "otp" ? "Verify your email" : "Login / Sign Up"}
        subtitle={
          step === "otp"
            ? `We sent a 6-digit code to ${email}`
            : redirect === "/checkout"
              ? "Please login to continue — your cart is safe and waiting."
              : "Welcome to Swastik Camphor. Continue with Google or your email."
        }
      />
      <section className="mx-auto w-full max-w-md px-4 pb-20 md:px-8">
        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {step === "email" && (
          <div className="surface-glass space-y-5 rounded-2xl p-6">
            <Button
              type="button"
              onClick={onGoogle}
              size="lg"
              className="w-full rounded-full"
            >
              Continue with Google
            </Button>

            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-widest text-muted-foreground">Or</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void requestCode();
              }}
              className="space-y-4"
            >
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

              <Button type="submit" disabled={busy} size="lg" variant="outline" className="w-full rounded-full">
                {busy ? "Sending code…" : "Email me a code"}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                We will send a 6-digit code to your inbox. Valid for a few minutes.
              </p>
            </form>
          </div>
        )}

        {step === "otp" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitCode(digits.join(""));
            }}
            className="surface-glass space-y-5 rounded-2xl p-6"
          >
            <div>
              <p className="mb-2 text-center text-sm text-muted-foreground">
                Enter the 6-digit code sent to your email
              </p>
              <div className="flex justify-center gap-2">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      boxRefs.current[i] = el;
                    }}
                    value={d}
                    onChange={(ev) => onDigit(i, ev.target.value)}
                    onKeyDown={(ev) => {
                      if (ev.key === "Backspace" && !digits[i] && i > 0) boxRefs.current[i - 1]?.focus();
                    }}
                    inputMode="numeric"
                    maxLength={6}
                    aria-label={`Digit ${i + 1}`}
                    className="h-12 w-11 rounded-lg border border-border bg-background text-center text-lg font-semibold"
                  />
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={busy || digits.join("").length !== 6}
              size="lg"
              className="w-full rounded-full"
            >
              {busy ? "Verifying…" : "Verify code"}
            </Button>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                disabled={cooldown > 0 || busy}
                onClick={() => void requestCode(true)}
                className="text-muted-foreground underline disabled:no-underline disabled:opacity-60"
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setDigits(["", "", "", "", "", ""]);
                  setError(null);
                }}
                className="text-muted-foreground underline"
              >
                Change email
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="underline">
            Back to home
          </Link>
        </p>
      </section>
    </>
  );
}
