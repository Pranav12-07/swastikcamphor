import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";

export const Route = createFileRoute("/admin/products/add")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Add Product — Swastik Camphor Admin" },
      { name: "description", content: "Add a new camphor product with pricing, stock, images and SEO details." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Add Product — Swastik Camphor Admin" },
      { property: "og:description", content: "Add a new product to the Swastik Camphor storefront." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AddProductPage,
});

function AddProductPage() {
  return (
    <AdminShell title="Add product" description="Publish a new item to the storefront" area="products">
      <ProductForm />
    </AdminShell>
  );
}
