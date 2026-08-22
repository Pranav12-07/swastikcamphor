import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, ErrorState, TableSkeleton, fmtDate } from "@/components/admin/ui";
import { adminListStaff, adminGrantRole, adminRevokeRole, adminListAudit } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/admin-users")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin Users — Swastik Camphor Admin" },
      { name: "description", content: "Grant and revoke staff roles and review the full activity log of admin actions." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Admin Users — Swastik Camphor Admin" },
      { property: "og:description", content: "Manage Swastik Camphor staff access." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminUsersPage,
});

const ROLES = ["super_admin", "product_manager", "order_manager", "support_staff"] as const;

function AdminUsersPage() {
  const qc = useQueryClient();
  const list = useServerFn(adminListStaff);
  const grant = useServerFn(adminGrantRole);
  const revoke = useServerFn(adminRevokeRole);
  const audit = useServerFn(adminListAudit);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-staff"], queryFn: () => list(undefined as never) });
  const { data: log } = useQuery({ queryKey: ["admin-audit"], queryFn: () => audit(undefined as never) });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("order_manager");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await grant({ data: { email, role } });
      setEmail("");
      await qc.invalidateQueries({ queryKey: ["admin-staff"] });
      toast.success("Access granted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not grant that role.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title="Admin users" description="Staff access and activity log" area="admins">
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {error && <ErrorState message="Failed to load staff." />}
          {isLoading && <TableSkeleton rows={4} />}
          {data && (
            <Card className="overflow-x-auto">
              <h2 className="font-semibold">Staff</h2>
              <table className="mt-3 w-full min-w-[520px] text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="py-2">Person</th><th>Role</th><th>Since</th><th className="text-right">Remove</th></tr>
                </thead>
                <tbody>
                  {(data as Array<Record<string, unknown>>).map((s) => (
                    <tr key={s["id"] as string} className="border-t border-border">
                      <td className="py-2">
                        <p className="font-medium">{(s["full_name"] as string) || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground">{(s["email"] as string) || "—"}</p>
                      </td>
                      <td className="capitalize">{String(s["role"]).replaceAll("_", " ")}</td>
                      <td className="text-muted-foreground">{fmtDate(s["created_at"] as string)}</td>
                      <td className="text-right">
                        <button
                          onClick={async () => {
                            if (!confirm("Remove this access?")) return;
                            try { await revoke({ data: { id: s["id"] as string } }); await qc.invalidateQueries({ queryKey: ["admin-staff"] }); toast.success("Access removed"); }
                            catch (err) { toast.error(err instanceof Error ? err.message : "Could not remove that access."); }
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

          <Card className="overflow-x-auto">
            <h2 className="font-semibold">Activity log</h2>
            <table className="mt-3 w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr><th className="py-2">When</th><th>Who</th><th>Action</th><th>Entity</th></tr>
              </thead>
              <tbody>
                {((log ?? []) as Array<Record<string, unknown>>).map((a) => (
                  <tr key={a["id"] as string} className="border-t border-border">
                    <td className="py-2 text-muted-foreground">{fmtDate(a["created_at"] as string)}</td>
                    <td>{a["actor_email"] as string}</td>
                    <td>{a["action"] as string}</td>
                    <td className="text-muted-foreground">{(a["entity"] as string) || "—"}</td>
                  </tr>
                ))}
                {!log?.length && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No activity recorded yet.</td></tr>}
              </tbody>
            </table>
          </Card>
        </div>

        <Card>
          <h2 className="font-semibold">Grant access</h2>
          <p className="mt-1 text-xs text-muted-foreground">The person must already have an account on the store.</p>
          <form onSubmit={submit} className="mt-3 space-y-3 text-sm">
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@example.com" className="w-full rounded-md border border-input bg-background px-3 py-2" />
            <select value={role} onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])} className="w-full rounded-md border border-input bg-background px-3 py-2">
              {ROLES.map((r) => <option key={r} value={r}>{r.replaceAll("_", " ")}</option>)}
            </select>
            <button disabled={busy} className="w-full rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground disabled:opacity-60">{busy ? "Granting…" : "Grant access"}</button>
          </form>
        </Card>
      </div>
    </AdminShell>
  );
}
