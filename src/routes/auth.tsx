import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { requestWhatsappOtp, verifyWhatsappOtp, recordEmailLogin } from "@/lib/otp.functions";
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
      { name: "robots", content: "noindex, nofollow" },
      { title: "Sign In or Create Account — Swastik Camphor" },
      {
        name: "description",
        content:
          "Sign in to Swastik Camphor with a one-time code sent to your WhatsApp or email — no password needed — to check out and track orders.",
      },
      { property: "og:title", content: "Sign In — Swastik Camphor" },
      { property: "og:description", content: "Access your Swastik Camphor account and order history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Channel = "whatsapp" | "email";

const emailSchema = z.string().trim().email();
const RESEND_SECONDS = 60;

/** Indian mobile number normalised to E.164. */
function toE164(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (/^\+91[6-9]\d{9}$/.test(digits)) return digits;
  if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  return null;
}

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { session } = useAuth();

  const sendWhatsapp = useServerFn(requestWhatsappOtp);
  const checkWhatsapp = useServerFn(verifyWhatsappOtp);
  const noteEmailLogin = useServerFn(recordEmailLogin);

  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (session) navigate({ to: redirect ?? "/account", replace: true });
  }, [session, navigate, redirect]);

  useEffect(() => {
    if (cooldown <= 0) return;
    timer.current = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [cooldown]);

  function reset() {
    setSent(false);
    setCode("");
    setError(null);
    setCooldown(0);
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (channel === "whatsapp") {
        const e164 = toE164(phone);
        if (!e164) throw new Error("Please enter a valid Indian mobile number.");
        const result = await sendWhatsapp({
          data: { phone: e164, ...(fullName.trim() ? { full_name: fullName.trim() } : {}) },
        });
        if (!result.ok) {
          setError(result.message);
          toast.error(result.message);
          return;
        }
        setSent(true);
        setCooldown(RESEND_SECONDS);
        toast.success("OTP sent on WhatsApp.");
      } else {
        if (!emailSchema.safeParse(email).success) throw new Error("Please enter a valid email address.");
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
        });
        if (otpError) throw otpError;
        setSent(true);
        setCooldown(RESEND_SECONDS);
        toast.success("We emailed you a 6-digit code.");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Network error. Please check your connection and try again.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const token = code.trim();
      if (!/^\d{6}$/.test(token)) throw new Error("Incorrect OTP. Please check the code and try again.");

      if (channel === "whatsapp") {
        const e164 = toE164(phone)!;
        const result = await checkWhatsapp({
          data: { phone: e164, code: token, ...(fullName.trim() ? { full_name: fullName.trim() } : {}) },
        });
        if (!result.ok) {
          setError(result.message);
          toast.error(result.message);
          return;
        }
        const { error: sessionError } = await supabase.auth.verifyOtp({
          token_hash: result.tokenHash,
          type: "email",
        });
        if (sessionError) throw sessionError;
      } else {
        const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token,
          type: "email",
        });
        if (verifyError) {
          throw new Error(
            /expired/i.test(verifyError.message)
              ? "This OTP has expired. Please request a new OTP."
              : "Incorrect OTP. Please check the code and try again.",
          );
        }
        const userId = verified.user?.id;
        if (userId) {
          try {
            await noteEmailLogin({
              data: {
                userId,
                ...(fullName.trim() ? { full_name: fullName.trim() } : {}),
                ...(toE164(phone) ? { phone: toE164(phone)! } : {}),
              },
            });
          } catch {
            /* profile bookkeeping must never block sign-in */
          }
        }
      }
      toast.success("Signed in.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Incorrect OTP. Please check the code and try again.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-70";
  const destination = channel === "whatsapp" ? toE164(phone) : email.trim();

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Sign in to continue"
        subtitle={
          redirect === "/checkout"
            ? "Sign in to complete your order — your cart is safe and waiting."
            : "No password needed — we'll send a one-time code to your WhatsApp or email."
        }
      />
      <section className="mx-auto w-full max-w-md px-4 pb-20 md:px-8">
        {!sent && (
          <div className="mb-5 grid grid-cols-2 gap-2 text-sm">
            {(
              [
                { key: "whatsapp", label: "Continue with WhatsApp" },
                { key: "email", label: "Continue with Email" },
              ] as { key: Channel; label: string }[]
            ).map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => {
                  setChannel(c.key);
                  reset();
                }}
                className={`rounded-xl border px-3 py-3 text-left leading-snug transition-colors ${
                  channel === c.key
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:bg-accent/10"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={sent ? verify : sendCode} className="surface-glass space-y-4 rounded-2xl p-6">
          {!sent && (
            <>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground" htmlFor="fullName">
                  Full name <span className="text-xs">(new customers)</span>
                </label>
                <input
                  id="fullName"
                  value={fullName}
                  onChange={(ev) => setFullName(ev.target.value)}
                  className={inputClass}
                  autoComplete="name"
                />
              </div>

              {channel === "whatsapp" ? (
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground" htmlFor="phone">
                    Mobile number
                  </label>
                  <div className="flex items-stretch gap-2">
                    <span className="flex items-center rounded-lg border border-border bg-muted/40 px-3 text-sm">
                      +91
                    </span>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder="98765 43210"
                      value={phone}
                      onChange={(ev) => setPhone(ev.target.value)}
                      required
                      className={inputClass}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground" htmlFor="email">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
              )}
            </>
          )}

          {sent && (
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="code">
                Enter the 6-digit OTP sent to your {channel === "whatsapp" ? "WhatsApp" : "email"} —{" "}
                <span className="text-foreground">{destination}</span>
              </label>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(ev) => setCode(ev.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                maxLength={6}
                className="w-full rounded-lg border border-border bg-background px-3 py-3 text-center text-lg tracking-[0.5em]"
              />
              <div className="mt-2 flex items-center justify-between text-xs">
                <button type="button" onClick={reset} className="text-muted-foreground underline">
                  Change {channel === "whatsapp" ? "number" : "email"}
                </button>
                <button
                  type="button"
                  disabled={cooldown > 0 || busy}
                  onClick={() => sendCode()}
                  className="text-muted-foreground underline disabled:no-underline disabled:opacity-60"
                >
                  {cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
                </button>
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy
              ? "Please wait…"
              : sent
                ? "Verify OTP"
                : channel === "whatsapp"
                  ? "Send OTP on WhatsApp"
                  : "Send Email OTP"}
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
