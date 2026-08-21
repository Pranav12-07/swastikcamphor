import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, ErrorState, StatusBadge, TableSkeleton } from "@/components/admin/ui";
import { adminListBanners, adminSaveBanner, adminDeleteBanner } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/homepage")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Homepage — Swastik Camphor Admin" },
      { name: "description", content: "Control hero banners and promotional strips shown on the Swastik Camphor homepage." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Homepage — Swastik Camphor Admin" },
      { property: "og:description", content: "Manage homepage banners and promotions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomepagePage,
});

function HomepagePage() {
  const qc = useQueryClient();
  const list = useServerFn(adminListBanners);
  const save = useServerFn(adminSaveBanner);
  const del = useServerFn(adminDeleteBanner);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-banners"], queryFn: () => list(undefined as never) });
  const [form, setForm] = useState({ title: "", subtitle: "", image_url: "", button_text: "", link_url: "", placement: "hero", sort_order: 0 });
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await save({
        data: {
          title: form.title,
          subtitle: form.subtitle || null,
          image_url: form.image_url || null,
          button_text: form.button_text || null,
          link_url: form.link_url || null,
          placement: form.placement as "hero",
          sort_order: Number(form.sort_order) || 0,
          starts_at: null,
          ends_at: null,
          is_active: true,
        },
      });
      setForm({ title: "", subtitle: "", image_url: "", button_text: "", link_url: "", placement: "hero", sort_order: 0 });
      await qc.invalidateQueries({ queryKey: ["admin-banners"] });
      toast.success("Banner saved");
    } catch {
      toast.error("Could not save that banner.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title="Homepage" description="Banners and promotional content" area="marketing">
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {error && <ErrorState message="Failed to load banners." />}
          {isLoading && <TableSkeleton rows={3} />}
          {(data as Array<Record<string, unknown>> | undefined)?.map((b) => (
            <Card key={b["id"] as string} className="flex flex-wrap items-center gap-3">
              {b["image_url"] ? <img src={b["image_url"] as string} alt="" className="h-14 w-24 rounded object-cover" /> : <div className="h-14 w-24 rounded bg-muted" />}
              <div className="min-w-40 flex-1">
                <p className="font-medium">{b["title"] as string}</p>
                <p className="text-xs text-muted-foreground">{(b["subtitle"] as string) || "No subtitle"} · {b["placement"] as string}</p>
              </div>
              <StatusBadge status={b["is_active"] ? "active" : "disabled"} />
              <button onClick={async () => { try { await save({ data: { ...(b as never), id: b["id"] as string, is_active: !b["is_active"] } }); await qc.invalidateQueries({ queryKey: ["admin-banners"] }); } catch { toast.error("Could not update that banner."); } }} className="rounded border border-input px-2 py-1 text-xs">
                {b["is_active"] ? "Disable" : "Enable"}
              </button>
              <button onClick={async () => { if (!confirm("Delete this banner?")) return; try { await del({ data: { id: b["id"] as string } }); await qc.invalidateQueries({ queryKey: ["admin-banners"] }); toast.success("Banner deleted"); } catch { toast.error("Could not delete that banner."); } }} className="rounded border border-destructive/40 p-1.5 text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </Card>
          ))}
          {data && !data.length && <Card><p className="text-sm text-muted-foreground">No banners yet — add your first one.</p></Card>}
        </div>

        <Card>
          <h2 className="font-semibold">New banner</h2>
          <form onSubmit={submit} className="mt-3 space-y-3 text-sm">
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full rounded-md border border-input bg-background px-3 py-2" />
            <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Subtitle" className="w-full rounded-md border border-input bg-background px-3 py-2" />
            <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="Image URL" className="w-full rounded-md border border-input bg-background px-3 py-2" />
            <input value={form.button_text} onChange={(e) => setForm({ ...form, button_text: e.target.value })} placeholder="Button text" className="w-full rounded-md border border-input bg-background px-3 py-2" />
            <input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="Link URL (e.g. /shop)" className="w-full rounded-md border border-input bg-background px-3 py-2" />
            <select value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2">
              <option value="hero">Hero</option>
              <option value="promo">Promo strip</option>
            </select>
            <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} placeholder="Sort order" className="w-full rounded-md border border-input bg-background px-3 py-2" />
            <button disabled={busy} className="w-full rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground disabled:opacity-60">{busy ? "Saving…" : "Add banner"}</button>
          </form>
        </Card>
      </div>
    </AdminShell>
  );
}
