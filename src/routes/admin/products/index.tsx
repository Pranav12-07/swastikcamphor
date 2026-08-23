import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, EmptyState, ErrorState, StatusBadge, TableSkeleton, inr } from "@/components/admin/ui";
import { adminListProducts, adminDeleteProduct, adminDuplicateProduct, adminSaveProduct } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/products/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Products — Swastik Camphor Admin" },
      { name: "description", content: "Create, edit and publish the camphor products sold on the Swastik Camphor storefront." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Products — Swastik Camphor Admin" },
      { property: "og:description", content: "Manage the Swastik Camphor product catalogue." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductsPage,
});

const PAGE_SIZE = 12;

function ProductsPage() {
  const qc = useQueryClient();
  const list = useServerFn(adminListProducts);
  const del = useServerFn(adminDeleteProduct);
  const dup = useServerFn(adminDuplicateProduct);
  const save = useServerFn(adminSaveProduct);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-products"], queryFn: () => list(undefined as never) });

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    let out = (data ?? []) as Array<Record<string, unknown>>;
    const term = q.trim().toLowerCase();
    if (term) out = out.filter((p) => `${p["name"]} ${p["sku"] ?? ""} ${p["category"] ?? ""}`.toLowerCase().includes(term));
    if (status !== "all") out = out.filter((p) => (p["status"] as string) === status);
    const sorted = [...out];
    if (sort === "price") sorted.sort((a, b) => Number(a["price"]) - Number(b["price"]));
    if (sort === "stock") sorted.sort((a, b) => Number(a["stock_quantity"]) - Number(b["stock_quantity"]));
    if (sort === "name") sorted.sort((a, b) => String(a["name"]).localeCompare(String(b["name"])));
    return sorted;
  }, [data, q, status, sort]);

  const paged = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  async function run(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success(ok);
    } catch (err) {
      toast.error(err instanceof Error && err.message.includes("super admin") ? err.message : "That action could not be completed.");
    }
  }

  return (
    <AdminShell
      title="Products"
      description="Everything the storefront sells"
      area="products"
      actions={
        <Link to="/admin/products/add" className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
          <Plus className="h-4 w-4" /> Add product
        </Link>
      }
    >
      {error && <ErrorState message="Failed to load products." />}
      {isLoading && <TableSkeleton />}
      {data && (
        <div className="space-y-4">
          <Card className="flex flex-wrap gap-2">
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search name, SKU or category" className="min-w-48 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="disabled">Disabled</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="newest">Newest first</option>
              <option value="name">Name A–Z</option>
              <option value="price">Price</option>
              <option value="stock">Stock</option>
            </select>
          </Card>

          {!rows.length ? (
            <EmptyState title="No products match your filters" hint="Try clearing the search or add a new product." />
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="py-2">Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th className="text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {paged.map((p) => {
                    const stock = Number(p["stock_quantity"] ?? 0);
                    const low = Number(p["low_stock_threshold"] ?? 10);
                    return (
                      <tr key={p["id"] as string} className="border-t border-border">
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            {typeof p["image_url"] === "string" && /^(https?:\/\/|\/)/.test(p["image_url"] as string) ? (
                              <img src={p["image_url"] as string} alt="" loading="lazy" className="h-9 w-9 rounded object-cover" />
                            ) : (
                              <div className="h-9 w-9 rounded bg-muted" />
                            )}
                            <div>
                              <p className="font-medium">{p["name"] as string}</p>
                              <p className="text-xs text-muted-foreground">/{p["slug"] as string}</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-muted-foreground">{(p["sku"] as string) || "—"}</td>
                        <td className="text-muted-foreground">{(p["category"] as string) || "—"}</td>
                        <td className="tabular-nums">{inr(Number(p["price"]))}</td>
                        <td>
                          <span className="tabular-nums">{stock}</span>{" "}
                          {stock === 0 ? <StatusBadge status="out_of_stock" /> : stock <= low ? <StatusBadge status="low_stock" /> : null}
                        </td>
                        <td><StatusBadge status={(p["status"] as string) ?? "active"} /></td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <Link to="/admin/products/edit/$id" params={{ id: p["id"] as string }} className="rounded border border-input p-1.5" title="Edit"><Pencil className="h-3.5 w-3.5" /></Link>
                            <button onClick={() => run(() => dup({ data: { id: p["id"] as string } }), "Product duplicated")} className="rounded border border-input p-1.5" title="Duplicate"><Copy className="h-3.5 w-3.5" /></button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete "${p["name"]}"?\n\nThis cannot be easily undone.`)) void run(() => del({ data: { id: p["id"] as string } }), "Product deleted");
                              }}
                              className="rounded border border-destructive/40 p-1.5 text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {rows.length > PAGE_SIZE && (
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{rows.length} products</span>
                  <div className="flex gap-2">
                    <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded border border-input px-3 py-1 disabled:opacity-40">Previous</button>
                    <button disabled={(page + 1) * PAGE_SIZE >= rows.length} onClick={() => setPage((p) => p + 1)} className="rounded border border-input px-3 py-1 disabled:opacity-40">Next</button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </AdminShell>
  );
}
