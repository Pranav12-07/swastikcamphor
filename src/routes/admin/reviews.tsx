import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, EmptyState, ErrorState, StatusBadge, TableSkeleton, fmtDate } from "@/components/admin/ui";
import { adminListReviews, adminSetReviewApproval, adminDeleteReview } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/reviews")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reviews — Swastik Camphor Admin" },
      { name: "description", content: "Moderate customer reviews before they appear on Swastik Camphor product pages." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Reviews — Swastik Camphor Admin" },
      { property: "og:description", content: "Moderate Swastik Camphor customer reviews." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReviewsPage,
});

function ReviewsPage() {
  const qc = useQueryClient();
  const list = useServerFn(adminListReviews);
  const setApproval = useServerFn(adminSetReviewApproval);
  const del = useServerFn(adminDeleteReview);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-reviews"], queryFn: () => list(undefined as never) });
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");

  const rows = ((data ?? []) as Array<Record<string, unknown>>).filter((r) => (filter === "all" ? true : filter === "approved" ? r["approved"] : !r["approved"]));

  async function run(fn: () => Promise<unknown>, ok: string) {
    try { await fn(); await qc.invalidateQueries({ queryKey: ["admin-reviews"] }); toast.success(ok); }
    catch { toast.error("That action could not be completed."); }
  }

  return (
    <AdminShell title="Reviews" description="Approve what customers see" area="reviews">
      {error && <ErrorState message="Failed to load reviews." />}
      {isLoading && <TableSkeleton />}
      {data && (
        <div className="space-y-4">
          <Card className="flex gap-2">
            {(["pending", "approved", "all"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-full border px-3 py-1 text-xs capitalize ${filter === f ? "border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground"}`}>{f}</button>
            ))}
          </Card>
          {!rows.length ? (
            <EmptyState title="Nothing to moderate" hint="New reviews land here for approval before going live." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {rows.map((r) => (
                <Card key={r["id"] as string}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{"★".repeat(Number(r["rating"] ?? 0))}<span className="text-muted-foreground">{"★".repeat(5 - Number(r["rating"] ?? 0))}</span></p>
                      <p className="text-sm font-medium">{r["name"] as string}</p>
                      <p className="text-xs text-muted-foreground">{r["product_slug"] as string} · {fmtDate(r["created_at"] as string)}</p>
                    </div>
                    <StatusBadge status={r["approved"] ? "active" : "pending"} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{r["comment"] as string}</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => run(() => setApproval({ data: { id: r["id"] as string, approved: !r["approved"] } }), r["approved"] ? "Review hidden" : "Review published")} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                      {r["approved"] ? "Unpublish" : "Approve"}
                    </button>
                    <button onClick={() => { if (confirm("Delete this review?")) void run(() => del({ data: { id: r["id"] as string } }), "Review deleted"); }} className="rounded-md border border-destructive/40 px-2 py-1.5 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </AdminShell>
  );
}
