import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
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
    } catch {
      isStaff = false;
    }
    // A signed-in customer is not unauthenticated — send them to their own account.
    if (!isStaff) throw redirect({ to: "/account", replace: true });
  },
  component: () => <Outlet />,
});
