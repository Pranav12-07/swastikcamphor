import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, EmptyState, ErrorState, TableSkeleton, fmtDate } from "@/components/admin/ui";
import { adminListNotifications, adminMarkNotifications } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/notifications")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Notifications — Swastik Camphor Admin" },
      { name: "description", content: "New orders, low stock warnings and review alerts for the Swastik Camphor team." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Notifications — Swastik Camphor Admin" },
      { property: "og:description", content: "Store alerts for the Swastik Camphor team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const list = useServerFn(adminListNotifications);
  const mark = useServerFn(adminMarkNotifications);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-notifications"], queryFn: () => list(undefined as never) });
  const rows = (data ?? []) as Array<Record<string, unknown>>;

  async function markAll() {
    try { await mark({ data: { all: true } }); await qc.invalidateQueries({ queryKey: ["admin-notifications"] }); toast.success("All caught up"); }
    catch { toast.error("Could not mark those as read."); }
  }

  return (
    <AdminShell
      title="Notifications"
      description="Alerts from across the store"
      area="dashboard"
      actions={<button onClick={markAll} className="rounded-md border border-input px-3 py-1.5 text-sm">Mark all read</button>}
    >
      {error && <ErrorState message="Failed to load notifications." />}
      {isLoading && <TableSkeleton rows={4} />}
      {data && (rows.length ? (
        <div className="space-y-2">
          {rows.map((n) => (
            <Card key={n["id"] as string} className={n["is_read"] ? "opacity-70" : "border-primary/40"}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{n["title"] as string}</p>
                  {n["body"] ? <p className="text-sm text-muted-foreground">{n["body"] as string}</p> : null}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{fmtDate(n["created_at"] as string)}</span>
                  {!n["is_read"] && (
                    <button
                      onClick={async () => { try { await mark({ data: { id: n["id"] as string } }); await qc.invalidateQueries({ queryKey: ["admin-notifications"] }); } catch { toast.error("Could not update that alert."); } }}
                      className="rounded border border-input px-2 py-1 text-xs"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No notifications" hint="Alerts about new orders, low stock and reviews appear here." />
      ))}
    </AdminShell>
  );
}
