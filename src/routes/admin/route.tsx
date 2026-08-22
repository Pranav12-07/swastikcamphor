import { Outlet, createFileRoute } from "@tanstack/react-router";
import { noindexMeta } from "@/lib/seo";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [...noindexMeta, { title: "Swastik Camphor Admin" }] }),
  component: () => <Outlet />,
});
