import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { updateMyProfile } from "@/lib/account.functions";
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
          "Sign in to Swastik Camphor with a one-time code sent to your phone or email — no password needed — to check out and track orders.",
      },
      { property: "og:title", content: "Sign In — Swastik Camphor" },
      { property: "og:description", content: "Access your Swastik Camphor account and order history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Tab = "login" | "signup";
type Channel = "phone" | "email";

const emailSchema = z.string().trim().email();
/** Stored and sent to Supabase in E.164 form; India default when no country code given. */
function toE164(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return /^\+\d{8,15}$/.test(digits) ? digits : null;
  if (/^\d{10}$/.test(digits)) return `+91${digits}`;
  return null;
}

function friendlyError(err: unknown, channel: Channel) {
  const msg = err instanceof Error ? err.message : "Something went wrong";
  if (channel === "phone" && /provider|sms|not enabled|unsupported/i.test(msg)) {
    return "SMS sign-in isn't switched on yet for this store. Please continue with email for now.";
  }
  return msg;
}

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { session } = useAuth();
  const saveProfile = useServerFn(updateMyProfile);

  const [tab, setTab] = useState<Tab>("login");
  const [channel, setChannel] = useState<Channel>("phone");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: redirect ?? "/account", replace: true });
  }, [session, navigate, redirect]);

  function reset() {
    setSent(false);
    setCode("");
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (tab === "signup") {
        if (fullName.trim().length < 2) throw new Error("Please enter your full name");
        if (!toE164(phone)) throw new Error("Enter a valid 10-digit mobile number");
        if (!emailSchema.safeParse(email).success) throw new Error("Enter a valid email address");
      }

      if (channel === "phone") {
        const e164 = toE164(phone);
        if (!e164) throw new Error("Enter a valid 10-digit mobile number");
        const { error } = await supabase.auth.signInWithOtp({
          phone: e164,
          options: { shouldCreateUser: true },
        });
        if (error) throw error;
        toast.success(`Code sent to ${e164}`);
      } else {
        if (!emailSchema.safeParse(email).success) throw new Error("Enter a valid email address");
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("We emailed you a 6-digit code.");
      }
      setSent(true);
    } catch (err) {
      toast.error(friendlyError(err, channel));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const token = code.trim();
      const { error } =
        channel === "phone"
          ? await supabase.auth.verifyOtp({ phone: toE164(phone)!, token, type: "sms" })
          : await supabase.auth.verifyOtp({ email: email.trim(), token, type: "email" });
      if (error) throw error;

      // Persist the verified details on the customer profile.
      const e164 = toE164(phone);
      if (fullName.trim() || e164) {
        try {
          await saveProfile({
            data: {
              ...(fullName.trim() ? { full_name: fullName.trim() } : {}),
              ...(e164 ? { phone: e164 } : {}),
            },
          });
        } catch {
          /* profile is optional — never block sign-in */
        }
      }
      toast.success(tab === "signup" ? "Account created." : "Signed in.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That code did not work");
    } finally {
      setBusy(false);
    }
  }

  const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-70";

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title={tab === "signup" ? "Create your account" : "Sign in"}
        subtitle={
          redirect === "/checkout"
            ? "Sign in to complete your order — your cart is safe and waiting."
            : "No password needed — we'll send a one-time code to your phone or email."
        }
      />
      <section className="mx-auto w-full max-w-md px-4 pb-20 md:px-8">
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-full border border-gold/40 p-1 text-sm">
          {(["login", "signup"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                reset();
              }}
              className={`rounded-full px-3 py-2 transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent/15"
              }`}
            >
              {t === "login" ? "Login" : "Create account"}
            </button>
          ))}
        </div>

        <form onSubmit={sent ? verify : sendCode} className="surface-glass space-y-4 rounded-2xl p-6">
          {!sent && (
            <div className="grid grid-cols-2 gap-2">
              {(["phone", "email"] as Channel[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChannel(c)}
                  className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                    channel === c
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-accent/10"
                  }`}
                >
                  {c === "phone" ? "Phone number" : "Email address"}
                </button>
              ))}
            </div>
          )}

          {!sent && (
            <p className="text-xs text-muted-foreground">
              {tab === "signup"
                ? `We'll verify your ${channel === "phone" ? "mobile number" : "email"} with a one-time code.`
                : `Enter your ${channel === "phone" ? "mobile number" : "email"} and we'll send a one-time code.`}
            </p>
          )}

          {tab === "signup" && !sent && (
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="fullName">
                Full name
              </label>
              <input
                id="fullName"
                value={fullName}
                onChange={(ev) => setFullName(ev.target.value)}
                required
                className={inputClass}
              />
            </div>
          )}

          {(tab === "signup" || channel === "phone") && !sent && (
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="phone">
                Mobile number
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(ev) => setPhone(ev.target.value)}
                required
                className={inputClass}
              />
            </div>
          )}

          {(tab === "signup" || channel === "email") && !sent && (
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

          {sent && (
            <div>
              <label className="mb-1 block text-sm text-muted-foreground" htmlFor="code">
                Enter the 6-digit code sent to{" "}
                <span className="text-foreground">{channel === "phone" ? toE164(phone) : email}</span>
              </label>
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(ev) => setCode(ev.target.value)}
                required
                maxLength={8}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-center text-lg tracking-[0.4em]"
              />
              <button type="button" onClick={reset} className="mt-2 text-xs text-muted-foreground underline">
                Change {channel === "phone" ? "number" : "email"} / resend code
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Please wait…" : sent ? "Verify & continue" : "Send OTP"}
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
