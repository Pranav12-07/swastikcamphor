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
      { title: "Login with Mobile Number — Swastik Camphor" },
      {
        name: "description",
        content:
          "Log in to Swastik Camphor with a 6-digit verification code sent to your mobile number — no password needed — to check out and track orders.",
      },
      { property: "og:title", content: "Login — Swastik Camphor" },
      { property: "og:description", content: "Access your Swastik Camphor account and order history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Channel = "phone" | "email";
/** Which transport actually carried the code for the current phone attempt. */
type PhoneMode = "sms" | "whatsapp";

const emailSchema = z.string().trim().email();
const RESEND_SECONDS = 60;

/** Indian mobile number normalised to E.164 (+91XXXXXXXXXX). */
function toE164(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (/^\+91[6-9]\d{9}$/.test(digits)) return digits;
  if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  return null;
}

function prettyPhone(e164: string): string {
  const local = e164.replace("+91", "");
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}

/** Six separate code boxes that behave like one input. */
function CodeBoxes({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function setDigit(index: number, digit: string) {
    const chars = value.padEnd(6, " ").split("");
    chars[index] = digit || " ";
    onChange(chars.join("").replace(/\s/g, "").slice(0, 6));
    if (digit && index < 5) refs.current[index + 1]?.focus();
  }

  return (
    <div className="flex justify-between gap-2" role="group" aria-label="6-digit verification code">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          disabled={disabled}
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          value={value[i] ?? ""}
          onChange={(ev) => setDigit(i, ev.target.value.replace(/\D/g, "").slice(-1))}
          onKeyDown={(ev) => {
            if (ev.key === "Backspace" && !value[i] && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(ev) => {
            ev.preventDefault();
            const pasted = ev.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            if (pasted) {
              onChange(pasted);
              refs.current[Math.min(pasted.length, 5)]?.focus();
            }
          }}
          className="h-14 w-full rounded-xl border border-border bg-background text-center text-xl font-medium tracking-normal outline-none transition-colors focus:border-primary disabled:opacity-60"
        />
      ))}
    </div>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { session } = useAuth();

  const sendWhatsapp = useServerFn(requestWhatsappOtp);
  const checkWhatsapp = useServerFn(verifyWhatsappOtp);
  const noteLogin = useServerFn(recordEmailLogin);

  const [channel, setChannel] = useState<Channel>("phone");
  const [phoneMode, setPhoneMode] = useState<PhoneMode>("sms");
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

  /** True when the backend has no working SMS sender wired up. */
  function isProviderOutage(message: string): boolean {
    return /provider|not enabled|unsupported|disabled|configur/i.test(message);
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (channel === "phone") {
        const e164 = toE164(phone);
        if (!e164) throw new Error("Please enter a valid 10-digit Indian mobile number.");

        const { error: smsError } = await supabase.auth.signInWithOtp({ phone: e164 });

        if (!smsError) {
          setPhoneMode("sms");
          setSent(true);
          setCooldown(RESEND_SECONDS);
          toast.success(`OTP sent to ${prettyPhone(e164)}`);
          return;
        }

        if (/rate|too many|limit/i.test(smsError.message)) {
          throw new Error("Too many OTP requests. Please wait a moment before trying again.");
        }

        // SMS sender unavailable — try the WhatsApp sender before failing.
        if (isProviderOutage(smsError.message)) {
          const wa = await sendWhatsapp({
            data: { phone: e164, ...(fullName.trim() ? { full_name: fullName.trim() } : {}) },
          });
          if (wa.ok) {
            setPhoneMode("whatsapp");
            setSent(true);
            setCooldown(RESEND_SECONDS);
            toast.success(`OTP sent to ${prettyPhone(e164)}`);
            return;
          }
          throw new Error("Mobile OTP login is temporarily unavailable. Please try again later.");
        }

        throw new Error("We couldn't send the verification code. Please check the number and try again.");
      }

      if (!emailSchema.safeParse(email).success) throw new Error("Please enter a valid email address.");
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
      });
      if (otpError) {
        throw new Error(
          /rate|too many|limit/i.test(otpError.message)
            ? "Too many attempts. Please wait before trying again."
            : "We couldn't send the verification email. Please check your email address and try again.",
        );
      }
      setSent(true);
      setCooldown(RESEND_SECONDS);
      toast.success("We've sent a verification code to your email.");
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
      if (!/^\d{6}$/.test(token)) throw new Error("Incorrect verification code. Please try again.");

      let userId: string | undefined;

      if (channel === "phone") {
        const e164 = toE164(phone)!;

        if (phoneMode === "whatsapp") {
          const result = await checkWhatsapp({
            data: { phone: e164, code: token, ...(fullName.trim() ? { full_name: fullName.trim() } : {}) },
          });
          if (!result.ok) {
            setError(result.message);
            toast.error(result.message);
            return;
          }
          const { data: waSession, error: sessionError } = await supabase.auth.verifyOtp({
            token_hash: result.tokenHash,
            type: "email",
          });
          if (sessionError) throw sessionError;
          userId = waSession.user?.id;
        } else {
          const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({
            phone: e164,
            token,
            type: "sms",
          });
          if (verifyError) throw new Error(verificationMessage(verifyError.message));
          userId = verified.user?.id;
        }
      } else {
        const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token,
          type: "email",
        });
        if (verifyError) throw new Error(verificationMessage(verifyError.message));
        userId = verified.user?.id;
      }

      if (userId) {
        try {
          await noteLogin({
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
      toast.success("Signed in.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Incorrect verification code. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  function verificationMessage(raw: string): string {
    if (/expired/i.test(raw)) return "This verification code has expired. Please request a new code.";
    if (/rate|too many|limit/i.test(raw)) return "Too many attempts. Please wait before trying again.";
    return "Incorrect verification code. Please try again.";
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-70";
  const e164 = toE164(phone);
  const destination = channel === "phone" ? (e164 ? prettyPhone(e164) : phone) : email.trim();

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title={channel === "phone" ? "Login with Mobile Number" : "Login with Email"}
        subtitle={
          redirect === "/checkout"
            ? "Verify your mobile number to complete your order — your cart is safe and waiting."
            : "Enter your mobile number to receive a verification code."
        }
      />
      <section className="mx-auto w-full max-w-md px-4 pb-20 md:px-8">
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

              {channel === "phone" ? (
                <div>
                  <label className="mb-1 block text-sm text-muted-foreground" htmlFor="phone">
                    Mobile number
                  </label>
                  <div className="flex items-stretch gap-2">
                    <select
                      aria-label="Country code"
                      defaultValue="+91"
                      className="rounded-lg border border-border bg-muted/40 px-2 text-sm"
                    >
                      <option value="+91">🇮🇳 +91</option>
                    </select>
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
              <p className="mb-1 text-sm font-medium text-foreground">Enter verification code</p>
              <p className="mb-3 text-sm text-muted-foreground">
                OTP sent to <span className="text-foreground">{destination}</span>. Enter the 6-digit
                verification code.
              </p>
              <CodeBoxes value={code} onChange={setCode} disabled={busy} />
              <div className="mt-3 flex items-center justify-between text-xs">
                <button type="button" onClick={reset} className="text-muted-foreground underline">
                  Change {channel === "phone" ? "mobile number" : "email"}
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
            {busy ? "Please wait…" : sent ? "Verify OTP" : "Send OTP"}
          </button>
        </form>

        {!sent && (
          <div className="mt-6 border-t border-border pt-5 text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Or</p>
            <button
              type="button"
              onClick={() => {
                setChannel(channel === "phone" ? "email" : "phone");
                reset();
              }}
              className="mt-2 text-sm text-muted-foreground underline"
            >
              {channel === "phone" ? "Continue with email instead" : "Back to mobile number login"}
            </button>
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
