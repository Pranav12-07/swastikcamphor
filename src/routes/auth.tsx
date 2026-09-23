import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
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
        content: "Sign in to Swastik Camphor securely with your Google account.",
      },
      { property: "og:title", content: "Login — Swastik Camphor" },
      { property: "og:description", content: "Access your Swastik Camphor account and order history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function GoogleLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);

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

  async function onGoogle() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Google sign-in failed. Please try again.");
        setBusy(false);
        return;
      }
      if (result.redirected) return;
      toast.success("Signed in.");
    } catch {
      toast.error("Google sign-in failed. Please try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="Login / Sign Up"
        subtitle={
          redirect === "/checkout"
            ? "Please login to continue — your cart is safe and waiting."
            : "Welcome to Swastik Camphor. Sign in securely with your Google account."
        }
      />
      <section className="mx-auto w-full max-w-md px-4 pb-20 md:px-8">
        <div className="surface-glass space-y-5 rounded-2xl p-6">
          <Button
            type="button"
            onClick={onGoogle}
            disabled={busy}
            size="lg"
            className="flex w-full items-center justify-center gap-3 rounded-full"
          >
            <GoogleLogo />
            {busy ? "Opening Google…" : "Continue with Google"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Your account is created automatically the first time you sign in. We never post anything on your behalf.
          </p>
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
