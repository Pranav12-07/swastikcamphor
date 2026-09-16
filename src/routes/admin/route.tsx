import { Outlet, createFileRoute, redirect, isRedirect, useRouter } from "@tanstack/react-router";
import { noindexMeta } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { adminMe } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  // Session lives in browser storage, so the whole admin tree is client-rendered.
  ssr: false,
  head: () => ({ meta: [...noindexMeta, { title: "Swastik Camphor Admin" }] }),
  beforeLoad: async ({ location }) => {
    // The staff sign-in screen must stay reachable without a session.
    if (location.pathname === "/admin/login") return;

    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/admin/login", replace: true });
    }

    // Authoritative role check: the server reads user_roles for the bearer token.
    // Nothing here trusts localStorage or client state.
    let isStaff = false;
    try {
      const me = await adminMe(undefined as never);
      isStaff = me.isStaff;
    } catch (err) {
      // A redirect thrown deeper must keep bubbling; anything else means "not staff".
      if (isRedirect(err)) throw err;
      isStaff = false;
    }
    // A signed-in customer is not unauthenticated — send them to their own account.
    if (!isStaff) throw redirect({ to: "/account", replace: true });
  },
  component: () => <Outlet />,
  errorComponent: AdminError,
});

function AdminError({ error, reset }: { error: unknown; reset: () => void }) {
  const router = useRouter();
  const message =
    error instanceof Error
      ? error.message
      : error instanceof Response
        ? `Request failed (${error.status})`
        : "Something interrupted the admin area.";
  console.error("[admin]", error);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-6 text-center">
      <div className="max-w-md">
        <h1 className="text-xl font-semibold">Admin didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
          <a href="/admin/login" className="rounded-md border border-border px-4 py-2 text-sm">
            Sign in again
          </a>
        </div>
      </div>
    </div>
  );
}

