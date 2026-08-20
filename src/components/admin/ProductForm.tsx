import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/admin/ui";
import { adminSaveProduct, adminListCategories } from "@/lib/admin.functions";

export type ProductRow = Record<string, unknown>;

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

const input = "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export function ProductForm({ initial }: { initial?: ProductRow }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const save = useServerFn(adminSaveProduct);
  const listCats = useServerFn(adminListCategories);
  const { data: categories } = useQuery({ queryKey: ["admin-categories"], queryFn: () => listCats(undefined as never) });
  const g = (k: string, d = "") => (initial?.[k] as string | null) ?? d;
  const n = (k: string, d = 0) => Number(initial?.[k] ?? d);
  const b = (k: string, d = false) => Boolean(initial?.[k] ?? d);
  const arr = (k: string) => ((initial?.[k] as string[] | null) ?? []).join(", ");

  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: g("name"),
    slug: g("slug"),
    sku: g("sku"),
    category: g("category"),
    subcategory: g("subcategory"),
    short_description: g("short_description"),
    description: g("description"),
    price: String(n("price")),
    compare_at_price: initial?.["compare_at_price"] != null ? String(n("compare_at_price")) : "",
    cost_price: initial?.["cost_price"] != null ? String(n("cost_price")) : "",
    tax_rate: String(n("tax_rate")),
    weight_grams: initial?.["weight_grams"] != null ? String(n("weight_grams")) : "",
    stock_quantity: String(n("stock_quantity")),
    low_stock_threshold: String(n("low_stock_threshold", 10)),
    status: g("status", "active"),
    image_url: g("image_url"),
    images: ((initial?.["images"] as string[] | null) ?? []).join(", "),
    sizes: arr("sizes"),
    features: arr("features"),
    is_active: b("is_active", true),
    is_featured: b("is_featured"),
    is_bestseller: b("is_bestseller"),
    is_new_arrival: b("is_new_arrival"),
    seo_title: g("seo_title"),
    seo_description: g("seo_description"),
    seo_keywords: g("seo_keywords"),
  });

  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const csv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

  async function submit(e: React.FormEvent, asDraft = false) {
    e.preventDefault();
    if (busy) return;
    if (!form.name.trim() || !form.price) {
      toast.error("Product name and price are required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...(initial?.["id"] ? { id: initial["id"] as string } : {}),
        name: form.name.trim(),
        slug: (form.slug || slugify(form.name)).trim(),
        sku: form.sku || null,
        category: form.category || null,
        subcategory: form.subcategory || null,
        short_description: form.short_description || null,
        description: form.description || null,
        price: Number(form.price),
        compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
        cost_price: form.cost_price ? Number(form.cost_price) : null,
        tax_rate: Number(form.tax_rate || 0),
        weight_grams: form.weight_grams ? Number(form.weight_grams) : null,
        stock_quantity: Number(form.stock_quantity || 0),
        low_stock_threshold: Number(form.low_stock_threshold || 10),
        status: (asDraft ? "draft" : form.status) as "active" | "draft" | "disabled",
        image_url: form.image_url || null,
        images: csv(form.images),
        sizes: csv(form.sizes),
        features: csv(form.features),
        is_active: asDraft ? false : form.is_active,
        is_featured: form.is_featured,
        is_bestseller: form.is_bestseller,
        is_new_arrival: form.is_new_arrival,
        seo_title: form.seo_title || null,
        seo_description: form.seo_description || null,
        seo_keywords: form.seo_keywords || null,
      };
      await save({ data: payload });
      await qc.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success(initial?.["id"] ? "Product updated" : "Product created");
      navigate({ to: "/admin/products" });
    } catch (err) {
      toast.error(err instanceof Error && err.message.includes("Forbidden") ? "You do not have permission to do that" : "Could not save the product. Please check the fields and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => submit(e)} className="space-y-4">
      <Card>
        <h2 className="font-semibold">Basic information</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Product name *"><input className={input} value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={120} required /></Field>
          <Field label="URL slug" hint="Leave blank to generate from the name"><input className={input} value={form.slug} onChange={(e) => set("slug", e.target.value)} maxLength={80} /></Field>
          <Field label="SKU"><input className={input} value={form.sku} onChange={(e) => set("sku", e.target.value)} maxLength={60} /></Field>
          <Field label="Category">
            <select className={input} value={form.category} onChange={(e) => set("category", e.target.value)}>
              <option value="">— none —</option>
              {(categories ?? []).map((c) => (<option key={c.id as string} value={c.slug as string}>{c.name as string}</option>))}
            </select>
          </Field>
          <Field label="Subcategory"><input className={input} value={form.subcategory} onChange={(e) => set("subcategory", e.target.value)} maxLength={80} /></Field>
          <Field label="Short description"><input className={input} value={form.short_description} onChange={(e) => set("short_description", e.target.value)} maxLength={300} /></Field>
        </div>
        <Field label="Full description"><textarea className={`${input} min-h-28`} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={4000} /></Field>
      </Card>

      <Card>
        <h2 className="font-semibold">Pricing</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <Field label="Selling price (₹) *"><input className={input} type="number" min={0} step="0.01" value={form.price} onChange={(e) => set("price", e.target.value)} required /></Field>
          <Field label="MRP / compare at (₹)"><input className={input} type="number" min={0} step="0.01" value={form.compare_at_price} onChange={(e) => set("compare_at_price", e.target.value)} /></Field>
          <Field label="Cost price (₹)"><input className={input} type="number" min={0} step="0.01" value={form.cost_price} onChange={(e) => set("cost_price", e.target.value)} /></Field>
          <Field label="GST / tax (%)"><input className={input} type="number" min={0} max={100} step="0.01" value={form.tax_rate} onChange={(e) => set("tax_rate", e.target.value)} /></Field>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Inventory & details</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label="Stock quantity"><input className={input} type="number" min={0} value={form.stock_quantity} onChange={(e) => set("stock_quantity", e.target.value)} /></Field>
          <Field label="Low stock threshold"><input className={input} type="number" min={0} value={form.low_stock_threshold} onChange={(e) => set("low_stock_threshold", e.target.value)} /></Field>
          <Field label="Weight (grams)"><input className={input} type="number" min={0} value={form.weight_grams} onChange={(e) => set("weight_grams", e.target.value)} /></Field>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Pack sizes" hint="Comma separated, e.g. 50g, 100g, 250g"><input className={input} value={form.sizes} onChange={(e) => set("sizes", e.target.value)} /></Field>
          <Field label="Key features" hint="Comma separated"><input className={input} value={form.features} onChange={(e) => set("features", e.target.value)} /></Field>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">Images</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Main image URL" hint="e.g. /products/camphor-tablets.jpg"><input className={input} value={form.image_url} onChange={(e) => set("image_url", e.target.value)} maxLength={500} /></Field>
          <Field label="Additional image URLs" hint="Comma separated"><input className={input} value={form.images} onChange={(e) => set("images", e.target.value)} /></Field>
        </div>
        {form.image_url && <img src={form.image_url} alt="Product preview" className="mt-3 h-28 w-28 rounded-md border border-border object-cover" />}
      </Card>

      <Card>
        <h2 className="font-semibold">Visibility</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Status">
            <select className={input} value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="disabled">Disabled</option>
            </select>
          </Field>
          <div className="flex flex-wrap items-end gap-4 text-sm">
            {([["is_active", "Visible in shop"], ["is_featured", "Featured"], ["is_bestseller", "Bestseller"], ["is_new_arrival", "New arrival"]] as const).map(([k, label]) => (
              <label key={k} className="flex items-center gap-2">
                <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked)} />
                {label}
              </label>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold">SEO</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label="SEO title"><input className={input} value={form.seo_title} onChange={(e) => set("seo_title", e.target.value)} maxLength={150} /></Field>
          <Field label="SEO description"><input className={input} value={form.seo_description} onChange={(e) => set("seo_description", e.target.value)} maxLength={300} /></Field>
          <Field label="SEO keywords"><input className={input} value={form.seo_keywords} onChange={(e) => set("seo_keywords", e.target.value)} maxLength={300} /></Field>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save product
        </button>
        <button type="button" disabled={busy} onClick={(e) => submit(e, true)} className="rounded-md border border-input px-4 py-2 text-sm disabled:opacity-60">Save as draft</button>
        <button type="button" onClick={() => navigate({ to: "/admin/products" })} className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-accent">Cancel</button>
      </div>
    </form>
  );
}
