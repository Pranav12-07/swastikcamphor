import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";
import { ErrorState, TableSkeleton } from "@/components/admin/ui";
import { adminGetProduct } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/products/edit/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Edit Product — Swastik Camphor Admin" },
      { name: "description", content: "Update pricing, stock, images and visibility for a Swastik Camphor product." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Edit Product — Swastik Camphor Admin" },
      { property: "og:description", content: "Update a Swastik Camphor product." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EditProductPage,
});

function EditProductPage() {
  const { id } = Route.useParams();
  const get = useServerFn(adminGetProduct);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-product", id], queryFn: () => get({ data: { id } }) });

  return (
    <AdminShell title="Edit product" description="Changes go live on the storefront immediately" area="products">
      {isLoading && <TableSkeleton rows={4} />}
      {error && <ErrorState message="We could not load this product." />}
      {data && <ProductForm initial={data as Record<string, unknown>} />}
    </AdminShell>
  );
}
