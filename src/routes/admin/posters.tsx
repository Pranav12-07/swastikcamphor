import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { GripVertical, Loader2, Pencil, Trash2, Upload } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, ErrorState, TableSkeleton } from "@/components/admin/ui";
import { optimize } from "@/components/admin/ImageUploader";
import { PromoCarouselView, type PromoBanner } from "@/components/PromoCarousel";
import { useCatalog } from "@/lib/catalog";
import {
  adminDeletePromoBanner,
  adminListPromoBanners,
  adminReorderPromoBanners,
  adminSavePromoBanner,
  adminUploadProductImage,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/posters")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Promotional Posters — Swastik Camphor Admin" },
      { name: "description", content: "Upload, schedule and reorder homepage promotional posters." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Promotional Posters — Swastik Camphor Admin" },
      { property: "og:description", content: "Manage the homepage poster carousel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PostersPage,
});

type Row = PromoBanner & {
  display_order: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
};

type Form = {
  id?: string;
  title: string;
  description: string;
  image_url: string;
  button_text: string;
  destination_type: PromoBanner["destination_type"];
  destination_value: string;
  display_order: number;
  is_active: boolean;
  start_date: string;
  end_date: string;
};

const empty: Form = {
  title: "", description: "", image_url: "", button_text: "", destination_type: "none",
  destination_value: "", display_order: 0, is_active: true, start_date: "", end_date: "",
};

const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

function status(b: Row): { label: string; cls: string } {
  const now = Date.now();
  if (!b.is_active) return { label: "Inactive", cls: "bg-muted text-muted-foreground" };
  if (b.end_date && new Date(b.end_date).getTime() < now) return { label: "Expired", cls: "bg-destructive/15 text-destructive" };
  if (b.start_date && new Date(b.start_date).getTime() > now) return { label: "Scheduled", cls: "bg-accent/20 text-accent-foreground" };
  return { label: "Active", cls: "bg-primary/15 text-primary" };
}

const toLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const input = "w-full rounded-md border border-input bg-background px-3 py-2";

function PostersPage() {
  const qc = useQueryClient();
  const list = useServerFn(adminListPromoBanners);
  const save = useServerFn(adminSavePromoBanner);
  const del = useServerFn(adminDeletePromoBanner);
  const reorder = useServerFn(adminReorderPromoBanners);
  const upload = useServerFn(adminUploadProductImage);
  const { products, categories } = useCatalog();
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-promo-banners"], queryFn: () => list(undefined as never) });
  const rows = (data ?? []) as unknown as Row[];

  const [form, setForm] = useState<Form>(empty);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-promo-banners"] });

  async function uploadFile(file: File): Promise<string> {
    if (!ACCEPT.includes(file.type)) throw new Error(`${file.name}: only JPG, PNG or WebP allowed`);
    if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} is larger than 10 MB`);
    const payload = await optimize(file, 2000);
    const res = await upload({ data: payload });
    return res.url;
  }

  async function onFiles(files: File[]) {
    if (!files.length) return;
    setBusy(true);
    try {
      if (files.length === 1 && !form.image_url) {
        setProgress("Optimising & uploading… 50%");
        const url = await uploadFile(files[0]!);
        setForm((f) => ({ ...f, image_url: url, title: f.title || files[0]!.name.replace(/\.[^.]+$/, "") }));
        toast.success("Poster uploaded — fill details and save");
      } else {
        // Bulk upload: each file becomes an inactive draft poster.
        let done = 0;
        let order = rows.length;
        for (const file of files) {
          setProgress(`Uploading ${done + 1} of ${files.length}… ${Math.round((done / files.length) * 100)}%`);
          try {
            const url = await uploadFile(file);
            await save({ data: {
              title: file.name.replace(/\.[^.]+$/, "").slice(0, 120).padEnd(2, " "),
              description: null, image_url: url, button_text: null, destination_type: "none",
              destination_value: null, display_order: order++, is_active: false, start_date: null, end_date: null,
            } });
          } catch (e) {
            toast.error(e instanceof Error ? e.message : `Could not upload ${file.name}`);
          }
          done++;
        }
        await refresh();
        toast.success(`${done} poster(s) added as inactive drafts`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.image_url) { toast.error("Please upload a poster image"); return; }
    setBusy(true);
    try {
      await save({ data: {
        id: form.id,
        title: form.title,
        description: form.description || null,
        image_url: form.image_url,
        button_text: form.button_text || null,
        destination_type: form.destination_type,
        destination_value: form.destination_value || null,
        display_order: Number(form.display_order) || 0,
        is_active: form.is_active,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
      } });
      toast.success(form.id ? "Poster updated" : "Poster published");
      setForm({ ...empty, display_order: rows.length + (form.id ? 0 : 1) });
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(msg.includes("End date") ? "End date must be after start date" : msg.includes("Destination") ? "Please choose a destination" : "Could not save poster");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(b: Row) {
    try {
      await save({ data: {
        id: b.id, title: b.title, description: b.description, image_url: b.image_url, button_text: b.button_text,
        destination_type: b.destination_type, destination_value: b.destination_value, display_order: b.display_order,
        is_active: !b.is_active, start_date: b.start_date, end_date: b.end_date,
      } });
      await refresh();
    } catch { toast.error("Could not update status"); }
  }

  async function drop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ids = rows.map((r) => r.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(to, 0, ids.splice(from, 1)[0]!);
    qc.setQueryData(["admin-promo-banners"], ids.map((id, i) => ({ ...rows.find((r) => r.id === id)!, display_order: i })));
    try { await reorder({ data: { ids } }); toast.success("Order saved"); } catch { toast.error("Could not save order"); }
    await refresh();
  }

  const live = rows.filter((b) => status(b).label === "Active");
  const previewForm: PromoBanner[] = form.image_url
    ? [{ id: "preview", title: form.title || "Poster title", description: form.description || null, image_url: form.image_url, button_text: form.button_text || null, destination_type: "none", destination_value: null }]
    : [];

  return (
    <AdminShell title="Promotional Posters" description="Homepage banner carousel — upload, schedule, reorder" area="marketing">
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Card>
            <h2 className="mb-2 font-semibold">Homepage preview ({live.length} live)</h2>
            {live.length ? <div className="-mx-4"><PromoCarouselView banners={live} /></div> : <p className="text-sm text-muted-foreground">No live posters — the carousel is hidden on the homepage.</p>}
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">All posters</h2>
              <p className="text-xs text-muted-foreground">Drag rows to reorder</p>
            </div>
            {error && <ErrorState message="Failed to load posters." />}
            {isLoading && <TableSkeleton rows={3} />}
            <ul className="space-y-2">
              {rows.map((b) => {
                const s = status(b);
                return (
                  <li
                    key={b.id}
                    draggable
                    onDragStart={() => setDragId(b.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => drop(b.id)}
                    className={`flex flex-wrap items-center gap-3 rounded-lg border border-border p-2 ${dragId === b.id ? "opacity-50" : ""}`}
                  >
                    <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" aria-hidden />
                    <img src={b.image_url} alt="" className="h-14 w-28 rounded object-cover" />
                    <div className="min-w-40 flex-1">
                      <p className="font-medium">{b.title}</p>
                      <p className="text-xs text-muted-foreground">
                        #{b.display_order} · {b.destination_type === "none" ? "No link" : `${b.destination_type}: ${b.destination_value}`}
                        {(b.start_date || b.end_date) && ` · ${b.start_date ? new Date(b.start_date).toLocaleDateString() : "…"} → ${b.end_date ? new Date(b.end_date).toLocaleDateString() : "…"}`}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>
                    <button onClick={() => toggle(b)} className="rounded border border-input px-2 py-1 text-xs">{b.is_active ? "Deactivate" : "Activate"}</button>
                    <button aria-label="Edit poster" onClick={() => { setForm({ id: b.id, title: b.title, description: b.description ?? "", image_url: b.image_url, button_text: b.button_text ?? "", destination_type: b.destination_type, destination_value: b.destination_value ?? "", display_order: b.display_order, is_active: b.is_active, start_date: toLocal(b.start_date), end_date: toLocal(b.end_date) }); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded border border-input p-1.5"><Pencil className="h-3.5 w-3.5" /></button>
                    <button aria-label="Delete poster" onClick={async () => { if (!confirm("Delete this poster?")) return; try { await del({ data: { id: b.id } }); await refresh(); toast.success("Poster deleted"); } catch { toast.error("Could not delete"); } }} className="rounded border border-destructive/40 p-1.5 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                  </li>
                );
              })}
            </ul>
            {data && !rows.length && <p className="text-sm text-muted-foreground">No posters yet — upload your first one.</p>}
          </Card>
        </div>

        <Card className="h-fit">
          <h2 className="font-semibold">{form.id ? "Edit poster" : "New poster"}</h2>
          <form onSubmit={submit} className="mt-3 space-y-3 text-sm">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); onFiles(Array.from(e.dataTransfer.files)); }}
              className="rounded-lg border-2 border-dashed border-input p-3 text-center"
            >
              {form.image_url ? (
                <div className="space-y-2">
                  <div className="-mx-4"><PromoCarouselView banners={previewForm} /></div>
                  <button type="button" onClick={() => setForm({ ...form, image_url: "" })} className="text-xs text-destructive underline">Replace image</button>
                </div>
              ) : (
                <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center gap-1 py-4 text-muted-foreground">
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                  <span>{progress ?? "Click or drop image(s) — JPG, PNG, WebP. Recommended 2100×800."}</span>
                  <span className="text-xs">Select several files to bulk-add drafts.</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept={ACCEPT.join(",")} multiple hidden onChange={(e) => onFiles(Array.from(e.target.files ?? []))} />
            </div>

            <input required minLength={2} maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Poster title" className={input} />
            <textarea maxLength={300} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description (optional)" rows={2} className={input} />
            <input maxLength={40} value={form.button_text} onChange={(e) => setForm({ ...form, button_text: e.target.value })} placeholder="Button text (optional)" className={input} />

            <label className="block text-xs font-medium">Destination</label>
            <select value={form.destination_type} onChange={(e) => setForm({ ...form, destination_type: e.target.value as Form["destination_type"], destination_value: "" })} className={input}>
              <option value="none">No link</option>
              <option value="product">Product page</option>
              <option value="category">Category page</option>
              <option value="offer">Offer page</option>
              <option value="url">Custom URL</option>
            </select>
            {form.destination_type === "product" && (
              <select required value={form.destination_value} onChange={(e) => setForm({ ...form, destination_value: e.target.value })} className={input}>
                <option value="">Choose product…</option>
                {products.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
              </select>
            )}
            {form.destination_type === "category" && (
              <select required value={form.destination_value} onChange={(e) => setForm({ ...form, destination_value: e.target.value })} className={input}>
                <option value="">Choose category…</option>
                {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            )}
            {(form.destination_type === "offer" || form.destination_type === "url") && (
              <input required value={form.destination_value} onChange={(e) => setForm({ ...form, destination_value: e.target.value })} placeholder={form.destination_type === "offer" ? "/shop or offer page path" : "https://… or /page"} pattern="(https?://.+|/.*)" title="Start with / or https://" className={input} />
            )}

            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs">Start (optional)<input type="datetime-local" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={input} /></label>
              <label className="text-xs">End (optional)<input type="datetime-local" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={input} /></label>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs">Order<input type="number" min={0} value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} className={`${input} w-24`} /></label>
              <label className="mt-4 flex items-center gap-2 text-xs"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
            </div>

            <div className="flex gap-2">
              <button disabled={busy} className="flex-1 rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground disabled:opacity-60">{busy ? "Saving…" : form.id ? "Update poster" : "Publish poster"}</button>
              {form.id && <button type="button" onClick={() => setForm(empty)} className="rounded-md border border-input px-3 py-2">Cancel</button>}
            </div>
          </form>
        </Card>
      </div>
    </AdminShell>
  );
}
