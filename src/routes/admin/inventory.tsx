import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, ErrorState, StatusBadge, TableSkeleton, fmtDate } from "@/components/admin/ui";
import { adminListProducts, adminAdjustStock, adminStockHistory } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/inventory")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Inventory — Swastik Camphor Admin" },
      { name: "description", content: "Track camphor stock levels, adjust quantities and review every inventory movement." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Inventory — Swastik Camphor Admin" },
      { property: "og:description", content: "Track and adjust Swastik Camphor stock levels." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  const qc = useQueryClient();
  const list = useServerFn(adminListProducts);
  const adjust = useServerFn(adminAdjustStock);
  const history = useServerFn(adminStockHistory);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-products"], queryFn: () => list(undefined as never) });
  const { data: log } = useQuery({ queryKey: ["admin-stock-log"], queryFn: () => history({ data: {} }) });
  const [drafts, setDrafts] = useState<Record<string, { mode: "add" | "remove" | "set"; amount: string }>>({});

  async function apply(id: string) {
    const d = drafts[id];
    if (!d || !d.amount) return;
    try {
      await adjust({ data: { id, mode: d.mode, amount: Math.abs(Number(d.amount)), reason: `${d.mode} via inventory page` } });
      setDrafts((prev) => ({ ...prev, [id]: { mode: d.mode, amount: "" } }));
      await Promise.all([qc.invalidateQueries({ queryKey: ["admin-products"] }), qc.invalidateQueries({ queryKey: ["admin-stock-log"] })]);
      toast.success("Stock updated");
    } catch {
      toast.error("Stock could not be updated.");
    }
  }

  return (
    <AdminShell title="Inventory" description="Stock levels and movement history" area="products">
      {error && <ErrorState message="Failed to load inventory." />}
      {isLoading && <TableSkeleton />}
      {data && (
        <div className="space-y-4">
          <Card className="overflow-x-auto">
            <h2 className="font-semibold">Stock levels</h2>
            <table className="mt-3 w-full min-w-[700px] text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr><th className="py-2">Product</th><th>SKU</th><th>Stock</th><th>Status</th><th>Adjust</th></tr>
              </thead>
              <tbody>
                {(data as Array<Record<string, unknown>>).map((p) => {
                  const id = p["id"] as string;
                  const stock = Number(p["stock_quantity"] ?? 0);
                  const low = Number(p["low_stock_threshold"] ?? 10);
                  const d = drafts[id] ?? { mode: "add" as const, amount: "" };
                  return (
                    <tr key={id} className="border-t border-border">
                      <td className="py-2 font-medium">{p["name"] as string}</td>
                      <td className="text-muted-foreground">{(p["sku"] as string) || "—"}</td>
                      <td className="tabular-nums">{stock}</td>
                      <td><StatusBadge status={stock === 0 ? "out_of_stock" : stock <= low ? "low_stock" : "in_stock"} /></td>
                      <td>
                        <div className="flex gap-1">
                          <select value={d.mode} onChange={(e) => setDrafts({ ...drafts, [id]: { ...d, mode: e.target.value as "add" } })} className="rounded border border-input bg-background px-2 py-1 text-xs">
                            <option value="add">Add</option>
                            <option value="remove">Remove</option>
                            <option value="set">Set to</option>
                          </select>
                          <input value={d.amount} onChange={(e) => setDrafts({ ...drafts, [id]: { ...d, amount: e.target.value } })} inputMode="numeric" placeholder="0" className="w-20 rounded border border-input bg-background px-2 py-1 text-xs" />
                          <button onClick={() => apply(id)} className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">Apply</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <Card className="overflow-x-auto">
            <h2 className="font-semibold">Recent movements</h2>
            <table className="mt-3 w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr><th className="py-2">When</th><th>Change</th><th>Resulting stock</th><th>Reason</th></tr>
              </thead>
              <tbody>
                {((log ?? []) as Array<Record<string, unknown>>).map((t) => (
                  <tr key={t["id"] as string} className="border-t border-border">
                    <td className="py-2 text-muted-foreground">{fmtDate(t["created_at"] as string)}</td>
                    <td className={Number(t["change"]) < 0 ? "text-destructive" : "text-emerald-600"}>{Number(t["change"]) > 0 ? "+" : ""}{Number(t["change"])}</td>
                    <td className="tabular-nums">{Number(t["resulting_stock"] ?? 0)}</td>
                    <td className="text-muted-foreground">{(t["reason"] as string) || "—"}</td>
                  </tr>
                ))}
                {!log?.length && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No stock movements recorded yet.</td></tr>}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </AdminShell>
  );
}
