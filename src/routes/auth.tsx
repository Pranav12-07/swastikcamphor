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

type Mode = "whatsapp" | "email";

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { session } = useAuth();
  const signIn = useServerFn(signInWithDetails);
  const sendOtp = useServerFn(sendWhatsAppOtp);
  const verifyOtp = useServerFn(verifyWhatsAppOtp);

  const [mode, setMode] = useState<Mode>("whatsapp");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // WhatsApp OTP state
  const [waPhone, setWaPhone] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [masked, setMasked] = useState("");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [cooldown, setCooldown] = useState(0);
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

  async function requestOtp(resend = false) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await sendOtp({ data: { phone: waPhone } });
      if (!result.ok) {
        setError(result.message);
        toast.error(result.message);
        return;
      }
      setSessionId(result.sessionId);
      setMasked(result.masked);
      setStep("otp");
      setDigits(["", "", "", "", "", ""]);
      setCooldown(45);
      toast.success(resend ? "New OTP sent successfully." : "OTP sent successfully.");
      setTimeout(() => boxRefs.current[0]?.focus(), 50);
    } catch {
      const message = "Unable to send the OTP right now. Please try again in a few minutes.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function submitOtp(code: string) {
    if (busy || !sessionId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await verifyOtp({ data: { phone: waPhone, sessionId, code } });
      if (!result.ok) {
        setError(result.message);
        toast.error(result.message);
        setDigits(["", "", "", "", "", ""]);
        boxRefs.current[0]?.focus();
        return;
      }
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
    if (joined.length === 6 && !next.includes("")) void submitOtp(joined);
  }

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
        title={step === "otp" ? "Verify WhatsApp" : "Login / Sign Up"}
        subtitle={
          step === "otp"
            ? `OTP sent to ${masked}`
            : redirect === "/checkout"
              ? "Please login to continue — your cart is safe and waiting."
              : "Welcome to Swastik Camphor. Verify your mobile number to continue."
        }
      />
      <section className="mx-auto w-full max-w-md px-4 pb-20 md:px-8">
        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {mode === "whatsapp" && step === "phone" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void requestOtp();
            }}
            className="surface-glass space-y-4 rounded-2xl p-6"
          >
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="wa-phone">
                Mobile number
              </label>
              <div className="flex items-stretch gap-2">
                <span className="flex items-center rounded-lg border border-border bg-muted/40 px-2 text-sm">
                  🇮🇳 +91
                </span>
                <input
                  id="wa-phone"
                  type="tel"
                  inputMode="numeric"
                  value={waPhone}
                  onChange={(ev) => setWaPhone(ev.target.value)}
                  required
                  maxLength={15}
                  autoComplete="tel"
                  placeholder="98765 43210"
                  className={inputClass}
                />
              </div>
            </div>

            <Button type="submit" disabled={busy} size="lg" className="w-full rounded-full">
              {busy ? "Sending OTP…" : "Continue with WhatsApp"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              We will send a 6-digit code to your WhatsApp. Valid for 5 minutes.
            </p>
          </form>
        )}

        {mode === "whatsapp" && step === "otp" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitOtp(digits.join(""));
            }}
            className="surface-glass space-y-5 rounded-2xl p-6"
          >
            <div>
              <p className="mb-2 text-center text-sm text-muted-foreground">
                Enter the 6-digit OTP sent to WhatsApp
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
              {busy ? "Verifying…" : "Verify OTP"}
            </Button>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                disabled={cooldown > 0 || busy}
                onClick={() => void requestOtp(true)}
                className="text-muted-foreground underline disabled:no-underline disabled:opacity-60"
              >
                {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setSessionId(null);
                  setDigits(["", "", "", "", "", ""]);
                  setError(null);
                }}
                className="text-muted-foreground underline"
              >
                Change mobile number
              </button>
            </div>
          </form>
        )}

        {mode === "email" && (
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

            <Button type="submit" disabled={busy} size="lg" className="w-full rounded-full">
              {busy ? "Please wait…" : "Continue"}
            </Button>
          </form>
        )}

        {step === "phone" && (
          <div className="mt-6 border-t border-border pt-5 text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Or</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setError(null);
                setMode(mode === "whatsapp" ? "email" : "whatsapp");
              }}
              className="mt-3 w-full rounded-full"
              size="lg"
            >
              {mode === "whatsapp" ? "Continue with Email" : "Continue with WhatsApp"}
            </Button>
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
