import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { formatINR } from "@/data/products";
import {
  adminDeleteProduct,
  adminDeleteReview,
  adminDashboardStats,
  adminListContacts,
  adminListOrders,
  adminListProducts,
  adminListReviews,
  adminSaveProduct,
  adminSetReviewApproval,
  adminUpdateOrderStatus,
  adminUpdatePaymentStatus,
  adminUpdateStock,
  amIAdmin,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Swastik Camphor" },
      { name: "description", content: "Private admin dashboard for Swastik Camphor orders, products and stock." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin — Swastik Camphor" },
      { property: "og:description", content: "Internal dashboard." },
    ],
  }),
  component: AdminPage,
});

const STATUSES = ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"] as const;
const PAYMENT_STATUSES = [
  "pending",
  "awaiting_verification",
  "paid",
  "failed",
  "refunded",
  "cod_pending",
] as const;

function AdminPage() {
  const check = useServerFn(amIAdmin);
  const gate = useQuery({ queryKey: ["am-i-admin"], queryFn: () => check({ data: undefined }) });
  const [tab, setTab] = useState<"overview" | "orders" | "products" | "reviews" | "messages">("overview");

  if (gate.isLoading) {
    return <p className="p-16 text-center text-sm text-muted-foreground">Checking access…</p>;
  }

  if (!gate.data?.isAdmin) {
    return (
      <>
        <PageHeader eyebrow="Admin" title="Access denied" subtitle="This area is restricted to Swastik Camphor staff." />
        <div className="mx-auto max-w-lg px-4 pb-24 text-center">
          <Link to="/" className="inline-flex rounded-full bg-primary px-6 py-2.5 text-sm text-primary-foreground">
            Back to home
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Admin" title="Dashboard" subtitle="Orders, catalogue, stock and customer messages." />
      <section className="mx-auto w-full max-w-6xl px-4 pb-24 md:px-8">
        <div className="mb-6 flex flex-wrap gap-2">
          {(["overview", "orders", "products", "reviews", "messages"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-5 py-2 text-sm capitalize transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === "overview" ? (
          <OverviewTab />
        ) : tab === "orders" ? (
          <OrdersTab />
        ) : tab === "products" ? (
          <ProductsTab />
        ) : tab === "reviews" ? (
          <ReviewsTab />
        ) : (
          <MessagesTab />
        )}
      </section>
    </>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card-premium p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-primary">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function OverviewTab() {
  const load = useServerFn(adminDashboardStats);
  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: () => load({ data: undefined }) });

  if (stats.isLoading) return <p className="text-sm text-muted-foreground">Loading dashboard…</p>;
  if (stats.error) return <p className="text-sm text-destructive">{(stats.error as Error).message}</p>;
  const s = stats.data!;

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue (paid)" value={formatINR(s.revenuePaid)} hint={`${formatINR(s.revenueAll)} incl. unpaid`} />
        <StatCard label="Orders" value={String(s.totalOrders)} hint={`${s.ordersToday} in last 24h`} />
        <StatCard label="Needs action" value={String(s.pendingOrders + s.awaitingPayment)} hint={`${s.pendingOrders} pending • ${s.awaitingPayment} payment checks`} />
        <StatCard label="Live products" value={String(s.activeProducts)} hint={`${s.pendingReviews} reviews to moderate`} />
      </div>
      <div className="card-premium p-6">
        <h2 className="text-lg font-semibold">Low stock alerts</h2>
        {s.lowStock.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">All products are well stocked.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {s.lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-xl border border-gold/40 px-4 py-2.5 text-sm">
                <span>{p.name}</span>
                <span className={p.stock === 0 ? "font-semibold text-destructive" : "font-semibold text-primary"}>
                  {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {s.totalMessages} customer message{s.totalMessages === 1 ? "" : "s"} received.
      </p>
    </div>
  );
}

function ReviewsTab() {
  const qc = useQueryClient();
  const list = useServerFn(adminListReviews);
  const approve = useServerFn(adminSetReviewApproval);
  const remove = useServerFn(adminDeleteReview);
  const reviews = useQuery({ queryKey: ["admin-reviews"], queryFn: () => list({ data: undefined }) });

  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin-reviews"] });
  const setApproval = useMutation({
    mutationFn: (v: { id: string; approved: boolean }) => approve({ data: v }),
    onSuccess: () => {
      toast.success("Review updated");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Review deleted");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (reviews.isLoading) return <p className="text-sm text-muted-foreground">Loading reviews…</p>;
  const rows = reviews.data ?? [];
  if (!rows.length) return <p className="text-sm text-muted-foreground">No reviews yet.</p>;

  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.id} className="rounded-2xl border border-gold/25 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">
                {r.name} · {"★".repeat(r.rating)}
                <span className="ml-2 text-xs text-muted-foreground">{r.product_slug}</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setApproval.mutate({ id: r.id, approved: !r.approved })}
                className="rounded-full bg-primary px-4 py-1.5 text-xs text-primary-foreground"
              >
                {r.approved ? "Unpublish" : "Approve"}
              </button>
              <button
                type="button"
                onClick={() => del.mutate(r.id)}
                className="rounded-full border border-destructive/50 px-4 py-1.5 text-xs text-destructive"
              >
                Delete
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function OrdersTab() {
  const qc = useQueryClient();
  const list = useServerFn(adminListOrders);
  const update = useServerFn(adminUpdateOrderStatus);
  const updatePayment = useServerFn(adminUpdatePaymentStatus);
  const orders = useQuery({ queryKey: ["admin-orders"], queryFn: () => list({ data: undefined }) });
  const mutate = useMutation({
    mutationFn: (vars: { id: string; status: (typeof STATUSES)[number] }) => update({ data: vars }),
    onSuccess: () => {
      toast.success("Order updated");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: () => toast.error("Could not update the order"),
  });
  const payMutate = useMutation({
    mutationFn: (vars: { id: string; payment_status: (typeof PAYMENT_STATUSES)[number] }) =>
      updatePayment({ data: vars }),
    onSuccess: () => {
      toast.success("Payment status updated");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: () => toast.error("Could not update the payment status"),
  });

  if (orders.isLoading) return <p className="text-sm text-muted-foreground">Loading orders…</p>;
  if (!orders.data?.length) return <p className="text-sm text-muted-foreground">No orders yet.</p>;

  return (
    <div className="space-y-3">
      {orders.data.map((o) => (
        <div key={o.id} className="surface-glass rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium">{o.order_number}</span>
            <span className="text-sm text-muted-foreground">{o.customer_name} • {o.phone}</span>
            <span className="ml-auto font-medium">{formatINR(Number(o.total))}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {o.address}, {o.city}, {o.state} — {o.pincode}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {(o.payment_provider ?? "—").toUpperCase()}
              {o.payment_id ? ` • UTR ${o.payment_id}` : ""}
            </span>
            <select
              value={o.payment_status}
              onChange={(e) =>
                payMutate.mutate({
                  id: o.id,
                  payment_status: e.target.value as (typeof PAYMENT_STATUSES)[number],
                })
              }
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            >
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
            <select
              value={o.status}
              onChange={(e) => mutate.mutate({ id: o.id, status: e.target.value as (typeof STATUSES)[number] })}
              className="ml-auto rounded-lg border border-border bg-background px-3 py-1.5 text-sm capitalize"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}

const emptyProduct = {
  slug: "",
  name: "",
  short_description: "",
  description: "",
  price: 0,
  compare_at_price: null as number | null,
  image_url: "",
  category: "",
  sizes: "",
  stock_quantity: 0,
  is_active: true,
  is_featured: false,
};

function ProductsTab() {
  const qc = useQueryClient();
  const list = useServerFn(adminListProducts);
  const save = useServerFn(adminSaveProduct);
  const setStock = useServerFn(adminUpdateStock);
  const remove = useServerFn(adminDeleteProduct);
  const products = useQuery({ queryKey: ["admin-products"], queryFn: () => list({ data: undefined }) });
  const [draft, setDraft] = useState({ ...emptyProduct });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-products"] });

  async function onSave() {
    try {
      await save({
        data: {
          ...draft,
          short_description: draft.short_description || null,
          description: draft.description || null,
          image_url: draft.image_url || null,
          category: draft.category || null,
          sizes: draft.sizes
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        },
      });
      setDraft({ ...emptyProduct });
      toast.success("Product saved");
      refresh();
    } catch {
      toast.error("Could not save product");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
      <div className="surface-glass h-fit space-y-3 rounded-2xl p-6">
        <h3 className="font-display text-lg">Add product</h3>
        {([
          ["slug", "Slug"],
          ["name", "Name"],
          ["short_description", "Short description"],
          ["category", "Category"],
          ["image_url", "Image URL"],
          ["sizes", "Sizes (comma separated)"],
        ] as const).map(([key, label]) => (
          <div key={key}>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor={key}>{label}</label>
            <input
              id={key}
              value={String(draft[key] ?? "")}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="price">Price (₹)</label>
            <input
              id="price"
              type="number"
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="mrp">MRP (₹)</label>
            <input
              id="mrp"
              type="number"
              value={draft.compare_at_price ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, compare_at_price: e.target.value === "" ? null : Number(e.target.value) })
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="stock">Stock</label>
            <input
              id="stock"
              type="number"
              value={draft.stock_quantity}
              onChange={(e) => setDraft({ ...draft, stock_quantity: Number(e.target.value) })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.is_active}
            onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
          />
          Active
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.is_featured}
            onChange={(e) => setDraft({ ...draft, is_featured: e.target.checked })}
          />
          Featured
        </label>
        <button onClick={onSave} className="w-full rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground">
          Save product
        </button>
      </div>

      <div className="space-y-3">
        {products.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading catalogue…</p>
        ) : !products.data?.length ? (
          <p className="text-sm text-muted-foreground">No products in the database yet.</p>
        ) : (
          products.data.map((p) => (
            <div key={p.id} className="surface-glass flex flex-wrap items-center gap-3 rounded-xl p-4">
              <span className="font-medium">{p.name}</span>
              <span className="text-sm text-muted-foreground">{formatINR(Number(p.price))}</span>
              {!p.is_active && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">hidden</span>}
              <label className="ml-auto flex items-center gap-2 text-sm">
                Stock
                <input
                  type="number"
                  defaultValue={p.stock_quantity}
                  onBlur={async (e) => {
                    const value = Number(e.target.value);
                    if (value === p.stock_quantity) return;
                    try {
                      await setStock({ data: { id: p.id, stock_quantity: value } });
                      toast.success("Stock updated");
                      refresh();
                    } catch {
                      toast.error("Could not update stock");
                    }
                  }}
                  className="w-24 rounded-lg border border-border bg-background px-2 py-1 text-sm"
                />
              </label>
              <button
                onClick={async () => {
                  try {
                    await remove({ data: { id: p.id } });
                    toast.success("Product removed");
                    refresh();
                  } catch {
                    toast.error("Could not delete product");
                  }
                }}
                className="rounded-full border border-border px-3 py-1 text-xs text-destructive"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MessagesTab() {
  const list = useServerFn(adminListContacts);
  const messages = useQuery({ queryKey: ["admin-contacts"], queryFn: () => list({ data: undefined }) });

  if (messages.isLoading) return <p className="text-sm text-muted-foreground">Loading messages…</p>;
  if (!messages.data?.length) return <p className="text-sm text-muted-foreground">No messages yet.</p>;

  return (
    <div className="space-y-3">
      {messages.data.map((m) => (
        <div key={m.id} className="surface-glass rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{m.subject}</span>
            <span className="text-sm text-muted-foreground">{m.name} • {m.email}{m.phone ? ` • ${m.phone}` : ""}</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {new Date(m.created_at).toLocaleString()}
            </span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{m.message}</p>
        </div>
      ))}
    </div>
  );
}