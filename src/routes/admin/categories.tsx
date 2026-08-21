import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, EmptyState, ErrorState, StatusBadge, TableSkeleton } from "@/components/admin/ui";
import { adminListCategories, adminSaveCategory, adminDeleteCategory } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/categories")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Categories — Swastik Camphor Admin" },
      { name: "description", content: "Organise camphor products into shop categories with ordering and visibility control." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Categories — Swastik Camphor Admin" },
      { property: "og:description", content: "Organise the Swastik Camphor shop categories." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CategoriesPage,
});

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function CategoriesPage() {
  const qc = useQueryClient();
  const list = useServerFn(adminListCategories);
  const save = useServerFn(adminSaveCategory);
  const del = useServerFn(adminDeleteCategory);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-categories"], queryFn: () => list(undefined as never) });
  const [form, setForm] = useState({ name: "", slug: "", description: "", image_url: "", sort_order: 0 });
  const [busy, setBusy] = useState(false);

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["admin-categories"] });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await save({
        data: {
          name: form.name,
          slug: form.slug || slugify(form.name),
          description: form.description || null,
          image_url: form.image_url || null,
          sort_order: Number(form.sort_order) || 0,
          is_active: true,
        },
      });
      setForm({ name: "", slug: "", description: "", image_url: "", sort_order: 0 });
      await refresh();
      toast.success("Category saved");
    } catch {
      toast.error("Could not save that category. Check the name and slug.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title="Categories" description="Group products for the shop navigation" area="products">
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {error && <ErrorState message="Failed to load categories." />}
          {isLoading && <TableSkeleton rows={4} />}
          {data && !data.length && <EmptyState title="No categories yet" hint="Create your first category on the right." />}
          {data && data.length > 0 && (
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="py-2">Name</th><th>Slug</th><th>Order</th><th>Status</th><th className="text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {(data as Array<Record<string, unknown>>).map((c) => (
                    <tr key={c["id"] as string} className="border-t border-border">
                      <td className="py-2 font-medium">{c["name"] as string}</td>
                      <td className="text-muted-foreground">{c["slug"] as string}</td>
                      <td className="tabular-nums">{Number(c["sort_order"] ?? 0)}</td>
                      <td><StatusBadge status={c["is_active"] ? "active" : "disabled"} /></td>
                      <td className="text-right">
                        <button
                          onClick={async () => {
                            if (!confirm(`Delete category "${c["name"]}"?`)) return;
                            try { await del({ data: { id: c["id"] as string } }); await refresh(); toast.success("Category deleted"); }
                            catch { toast.error("Could not delete that category."); }
                          }}
                          className="rounded border border-destructive/40 p-1.5 text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>

        <Card>
          <h2 className="font-semibold">New category</h2>
          <form onSubmit={submit} className="mt-3 space-y-3 text-sm">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" className="w-full rounded-md border border-input bg-background px-3 py-2" />
            <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder={form.name ? slugify(form.name) : "slug"} className="w-full rounded-md border border-input bg-background px-3 py-2" />
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description" rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2" />
            <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="Image URL" className="w-full rounded-md border border-input bg-background px-3 py-2" />
            <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} placeholder="Sort order" className="w-full rounded-md border border-input bg-background px-3 py-2" />
            <button disabled={busy} className="w-full rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground disabled:opacity-60">{busy ? "Saving…" : "Add category"}</button>
          </form>
        </Card>
      </div>
    </AdminShell>
  );
}
