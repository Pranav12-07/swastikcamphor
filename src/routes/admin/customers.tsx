import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, EmptyState, ErrorState, StatusBadge, TableSkeleton, fmtDate, inr } from "@/components/admin/ui";
import { adminListCustomers, adminSetCustomerDisabled, adminListContacts } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/customers")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Customers — Swastik Camphor Admin" },
      { name: "description", content: "See every Swastik Camphor customer, their order history, spend and account status." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Customers — Swastik Camphor Admin" },
      { property: "og:description", content: "Customer accounts and enquiries for Swastik Camphor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const qc = useQueryClient();
  const list = useServerFn(adminListCustomers);
  const setDisabled = useServerFn(adminSetCustomerDisabled);
  const contacts = useServerFn(adminListContacts);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-customers"], queryFn: () => list(undefined as never) });
  const { data: messages } = useQuery({ queryKey: ["admin-contacts"], queryFn: () => contacts(undefined as never) });
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const all = (data ?? []) as Array<Record<string, unknown>>;
    return term ? all.filter((c) => `${c["full_name"] ?? ""} ${c["email"] ?? ""} ${c["phone"] ?? ""}`.toLowerCase().includes(term)) : all;
  }, [data, q]);

  async function toggle(id: string, disabled: boolean) {
    try {
      await setDisabled({ data: { id, disabled } });
      await qc.invalidateQueries({ queryKey: ["admin-customers"] });
      toast.success(disabled ? "Account disabled" : "Account re-enabled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change that account.");
    }
  }

  return (
    <AdminShell title="Customers" description="Accounts, spend and enquiries" area="customers">
      {error && <ErrorState message="Failed to load customers." />}
      {isLoading && <TableSkeleton />}
      {data && (
        <div className="space-y-4">
          <Card className="flex flex-wrap gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or phone" className="min-w-56 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </Card>

          {!rows.length ? (
            <EmptyState title="No customers found" hint="Customers appear here after they create an account." />
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="py-2">Customer</th><th>Phone</th><th>Orders</th><th>Total spent</th><th>Last order</th><th>Status</th><th className="text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c["id"] as string} className="border-t border-border">
                      <td className="py-2">
                        <p className="font-medium">{(c["full_name"] as string) || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground">{c["email"] as string}</p>
                      </td>
                      <td className="text-muted-foreground">{(c["phone"] as string) || "—"}</td>
                      <td className="tabular-nums">{Number(c["orderCount"] ?? 0)}</td>
                      <td className="tabular-nums">{inr(Number(c["totalSpent"] ?? 0))}</td>
                      <td className="text-muted-foreground">{c["lastOrder"] ? fmtDate(c["lastOrder"] as string) : "—"}</td>
                      <td><StatusBadge status={c["is_disabled"] ? "disabled" : "active"} /></td>
                      <td className="text-right">
                        <button onClick={() => toggle(c["id"] as string, !c["is_disabled"])} className="rounded border border-input px-2 py-1 text-xs">
                          {c["is_disabled"] ? "Enable" : "Disable"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          <Card>
            <h2 className="font-semibold">Contact enquiries</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {((messages ?? []) as Array<Record<string, unknown>>).map((m) => (
                <li key={m["id"] as string} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-medium">{m["name"] as string} <span className="font-normal text-muted-foreground">{m["email"] as string}</span></p>
                    <span className="text-xs text-muted-foreground">{fmtDate(m["created_at"] as string)}</span>
                  </div>
                  {m["subject"] ? <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{m["subject"] as string}</p> : null}
                  <p className="mt-1 text-muted-foreground">{m["message"] as string}</p>
                </li>
              ))}
              {!messages?.length && <li className="text-muted-foreground">No enquiries yet.</li>}
            </ul>
          </Card>
        </div>
      )}
    </AdminShell>
  );
}
