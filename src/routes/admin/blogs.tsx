import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/admin/ui";
import { MainImageUpload } from "@/components/admin/ImageUploader";
import { adminListBlogs, adminSaveBlog, adminDeleteBlog } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/blogs")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Blog Manager — Swastik Camphor Admin" },
      { name: "description", content: "Write, edit and publish camphor blog articles with images and SEO settings." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Blog Manager — Swastik Camphor Admin" },
      { property: "og:description", content: "Manage the Swastik Camphor blog content." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BlogsAdmin,
});

type Row = Record<string, unknown>;

const input = "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const empty = {
  id: "",
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image: "",
  cover_alt: "",
  category: "",
  tags: "",
  related_links: "",
  read_time: "",
  status: "draft",
  seo_title: "",
  seo_description: "",
  seo_keywords: "",
};

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function BlogsAdmin() {
  const qc = useQueryClient();
  const list = useServerFn(adminListBlogs);
  const save = useServerFn(adminSaveBlog);
  const remove = useServerFn(adminDeleteBlog);
  const { data, isLoading } = useQuery({ queryKey: ["admin-blogs"], queryFn: () => list(undefined as never) });
  const [form, setForm] = useState({ ...empty });
  const rows = useMemo(() => (data ?? []) as Row[], [data]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const csv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
      return save({
        data: {
          ...(form.id ? { id: form.id } : {}),
          title: form.title.trim(),
          slug: (form.slug || slugify(form.title)).trim(),
          excerpt: form.excerpt || null,
          content: form.content,
          cover_image: form.cover_image || null,
          cover_alt: form.cover_alt || null,
          category: form.category || null,
          tags: csv(form.tags),
          related_links: csv(form.related_links),
          read_time: form.read_time || null,
          status: form.status as "draft" | "published",
          seo_title: form.seo_title || null,
          seo_description: form.seo_description || null,
          seo_keywords: form.seo_keywords || null,
        },
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-blogs"] });
      toast.success(form.id ? "Article updated" : "Article created");
      setForm({ ...empty });
    },
    onError: () => toast.error("Could not save the article. Check the title and slug."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-blogs"] });
      toast.success("Article deleted");
    },
    onError: () => toast.error("Could not delete the article"),
  });

  function edit(row: Row) {
    setForm({
      id: String(row["id"] ?? ""),
      title: String(row["title"] ?? ""),
      slug: String(row["slug"] ?? ""),
      excerpt: String(row["excerpt"] ?? ""),
      content: String(row["content"] ?? ""),
      cover_image: String(row["cover_image"] ?? ""),
      cover_alt: String(row["cover_alt"] ?? ""),
      category: String(row["category"] ?? ""),
      tags: ((row["tags"] as string[] | null) ?? []).join(", "),
      related_links: ((row["related_links"] as string[] | null) ?? []).join(", "),
      read_time: String(row["read_time"] ?? ""),
      status: String(row["status"] ?? "draft"),
      seo_title: String(row["seo_title"] ?? ""),
      seo_description: String(row["seo_description"] ?? ""),
      seo_keywords: String(row["seo_keywords"] ?? ""),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <AdminShell title="Blog manager" description="Write and publish camphor articles" area="marketing">
      <div className="space-y-4">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{form.id ? "Edit article" : "New article"}</h2>
            {form.id && (
              <button type="button" onClick={() => setForm({ ...empty })} className="text-sm text-muted-foreground hover:underline">
                Start a new article
              </button>
            )}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Title *"><input className={input} value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={200} /></Field>
            <Field label="URL slug" hint="Leave blank to generate from the title"><input className={input} value={form.slug} onChange={(e) => set("slug", e.target.value)} maxLength={120} /></Field>
            <Field label="Category"><input className={input} value={form.category} onChange={(e) => set("category", e.target.value)} maxLength={80} /></Field>
            <Field label="Read time" hint="e.g. 5 min read"><input className={input} value={form.read_time} onChange={(e) => set("read_time", e.target.value)} maxLength={30} /></Field>
            <Field label="Tags" hint="Comma separated"><input className={input} value={form.tags} onChange={(e) => set("tags", e.target.value)} /></Field>
            <Field label="Internal links" hint="Comma separated paths, e.g. /shop, /products"><input className={input} value={form.related_links} onChange={(e) => set("related_links", e.target.value)} /></Field>
          </div>
          <Field label="Excerpt"><textarea className={`${input} min-h-20`} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} maxLength={500} /></Field>
          <Field label="Content" hint="Markdown-style text — blank lines separate paragraphs, lines starting with ## become headings">
            <textarea className={`${input} min-h-72 font-mono text-xs`} value={form.content} onChange={(e) => set("content", e.target.value)} maxLength={60000} />
          </Field>
          <div className="mt-4">
            <MainImageUpload value={form.cover_image} onChange={(url) => set("cover_image", url)} />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Cover image ALT text"><input className={input} value={form.cover_alt} onChange={(e) => set("cover_alt", e.target.value)} maxLength={200} /></Field>
              <Field label="Status">
                <select className={input} value={form.status} onChange={(e) => set("status", e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </Field>
            </div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field label="SEO title"><input className={input} value={form.seo_title} onChange={(e) => set("seo_title", e.target.value)} maxLength={200} /></Field>
            <Field label="SEO description"><input className={input} value={form.seo_description} onChange={(e) => set("seo_description", e.target.value)} maxLength={400} /></Field>
            <Field label="SEO keywords"><input className={input} value={form.seo_keywords} onChange={(e) => set("seo_keywords", e.target.value)} maxLength={400} /></Field>
          </div>
          <button
            type="button"
            disabled={saveMutation.isPending || !form.title.trim()}
            onClick={() => saveMutation.mutate()}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {form.id ? "Update article" : "Create article"}
          </button>
        </Card>

        <Card>
          <h2 className="font-semibold">All articles</h2>
          {isLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No articles yet.</p>
          ) : (
            <div className="mt-3 divide-y divide-border">
              {rows.map((row) => (
                <div key={String(row["id"])} className="flex flex-wrap items-center gap-3 py-3">
                  {row["cover_image"] ? (
                    <img src={String(row["cover_image"])} alt="" className="h-12 w-16 rounded object-cover" />
                  ) : (
                    <div className="h-12 w-16 rounded bg-muted" />
                  )}
                  <div className="min-w-40 flex-1">
                    <p className="text-sm font-medium">{String(row["title"])}</p>
                    <p className="text-xs text-muted-foreground">/blogs/{String(row["slug"])}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${row["status"] === "published" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {String(row["status"])}
                  </span>
                  <button type="button" onClick={() => edit(row)} className="rounded-md border border-input px-3 py-1.5 text-sm">Edit</button>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(String(row["id"]))}
                    className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-sm text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}
