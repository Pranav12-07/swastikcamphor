import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, Phone } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/admin/ui";
import { adminListMessages, adminSetMessageStatus } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/messages")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Contact Messages — Swastik Camphor Admin" },
      { name: "description", content: "Read and manage enquiries submitted through the Swastik Camphor contact form." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Contact Messages — Swastik Camphor Admin" },
      { property: "og:description", content: "Track customer enquiries from new to resolved." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MessagesAdmin,
});

const STATUSES = ["new", "read", "replied", "resolved"] as const;
type Status = (typeof STATUSES)[number];
type Row = Record<string, unknown>;

function MessagesAdmin() {
  const qc = useQueryClient();
  const list = useServerFn(adminListMessages);
  const setStatus = useServerFn(adminSetMessageStatus);
  const [filter, setFilter] = useState<"all" | Status>("all");
  const { data, isLoading } = useQuery({ queryKey: ["admin-messages"], queryFn: () => list(undefined as never) });

  const rows = useMemo(() => {
    const all = (data ?? []) as Row[];
    return filter === "all" ? all : all.filter((r) => (r["status"] ?? "new") === filter);
  }, [data, filter]);

  const mutate = useMutation({
    mutationFn: (vars: { id: string; status: Status }) => setStatus({ data: vars }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin-messages"] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Could not update the message"),
  });

  return (
    <AdminShell title="Contact messages" description="Every enquiry from the website contact form" area="customers">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(["all", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1.5 text-sm capitalize ${filter === s ? "bg-primary text-primary-foreground" : "border border-input"}`}
            >
              {s}
            </button>
          ))}
        </div>

        {isLoading ? (
          <Card><p className="text-sm text-muted-foreground">Loading messages…</p></Card>
        ) : rows.length === 0 ? (
          <Card><p className="text-sm text-muted-foreground">No messages here yet.</p></Card>
        ) : (
          rows.map((row) => {
            const id = String(row["id"]);
            const status = String(row["status"] ?? "new") as Status;
            return (
              <Card key={id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{String(row["subject"])}</p>
                    <p className="text-sm text-muted-foreground">
                      {String(row["name"])} • {new Date(String(row["created_at"])).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <select
                    value={status}
                    onChange={(e) => mutate.mutate({ id, status: e.target.value as Status })}
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-sm capitalize"
                  >
                    {STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm">{String(row["message"])}</p>
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <a href={`mailto:${String(row["email"])}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                    <Mail className="h-4 w-4" /> {String(row["email"])}
                  </a>
                  {Boolean(row["phone"]) && (
                    <a href={`tel:${String(row["phone"])}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                      <Phone className="h-4 w-4" /> {String(row["phone"])}
                    </a>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </AdminShell>
  );
}
