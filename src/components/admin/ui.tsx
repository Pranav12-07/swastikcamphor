import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inr = (n: number) => `₹${Number(n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-xl border border-border bg-card p-4 shadow-sm", className)}>{children}</div>;
}

export function StatCard({ label, value, hint, tone = "default" }: { label: string; value: string | number; hint?: string; tone?: "default" | "warn" | "good" }) {
  return (
    <Card className={cn(tone === "warn" && "border-amber-500/40", tone === "good" && "border-emerald-500/40")}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

const TONES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700",
  cod_pending: "bg-amber-500/15 text-amber-700",
  awaiting_verification: "bg-amber-500/15 text-amber-700",
  low_stock: "bg-amber-500/15 text-amber-700",
  confirmed: "bg-sky-500/15 text-sky-700",
  processing: "bg-sky-500/15 text-sky-700",
  packed: "bg-indigo-500/15 text-indigo-700",
  shipped: "bg-indigo-500/15 text-indigo-700",
  out_for_delivery: "bg-indigo-500/15 text-indigo-700",
  delivered: "bg-emerald-500/15 text-emerald-700",
  paid: "bg-emerald-500/15 text-emerald-700",
  active: "bg-emerald-500/15 text-emerald-700",
  in_stock: "bg-emerald-500/15 text-emerald-700",
  cancelled: "bg-destructive/15 text-destructive",
  failed: "bg-destructive/15 text-destructive",
  out_of_stock: "bg-destructive/15 text-destructive",
  returned: "bg-destructive/15 text-destructive",
  refunded: "bg-muted text-muted-foreground",
  draft: "bg-muted text-muted-foreground",
  disabled: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide", TONES[status] ?? "bg-muted text-muted-foreground")}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
      <p className="font-medium">{title}</p>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{message}</div>;
}
