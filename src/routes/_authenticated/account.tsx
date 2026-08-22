import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { AddressBook } from "@/components/account/AddressBook";
import { NotificationList } from "@/components/account/NotificationList";
import { getMyOrders, getMyProfile, updateMyProfile } from "@/lib/account.functions";
import { formatINR } from "@/data/products";


export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My Account — Swastik Camphor" },
      { name: "description", content: "View your Swastik Camphor orders and manage your profile details." },
      { property: "og:title", content: "My Account — Swastik Camphor" },
      { property: "og:description", content: "Your Swastik Camphor orders and profile." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const profileFn = useServerFn(getMyProfile);
  const ordersFn = useServerFn(getMyOrders);
  const saveFn = useServerFn(updateMyProfile);

  const profile = useQuery({ queryKey: ["my-profile"], queryFn: () => profileFn({ data: undefined }) });
  const orders = useQuery({ queryKey: ["my-orders"], queryFn: () => ordersFn({ data: undefined }) });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile.data) {
      setFullName(profile.data.full_name ?? "");
      setPhone(profile.data.phone ?? "");
    }
  }, [profile.data]);

  async function save() {
    setBusy(true);
    try {
      await saveFn({ data: { full_name: fullName, phone } });
      toast.success("Profile updated");
    } catch {
      toast.error("Could not update your profile");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Account" title="My account" subtitle="Your profile and order history." />
      <section className="mx-auto grid w-full max-w-5xl gap-8 px-4 pb-20 md:grid-cols-[320px_1fr] md:px-8">
        <div className="space-y-8">
        <div className="surface-glass h-fit space-y-4 rounded-2xl p-6">

          <h2 className="font-display text-lg">Profile</h2>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="name">Full name</label>
            <input
              id="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground" htmlFor="phone">Phone</label>
            <input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={save}
            disabled={busy}
            className="w-full rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground disabled:opacity-60"
          >
            Save changes
          </button>
        </div>

        <div className="space-y-4">
          <h2 className="font-display text-lg">Orders</h2>
          {orders.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading your orders…</p>
          ) : (orders.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">You haven't placed any orders yet.</p>
          ) : (
            <ul className="space-y-3">
              {orders.data?.map((o) => (
                <li key={o.id} className="surface-glass rounded-xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{o.order_number}</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                    <span className="rounded-full bg-secondary px-3 py-1 capitalize">{o.status}</span>
                    <span className="text-muted-foreground capitalize">payment: {o.payment_status}</span>
                    <span className="ml-auto font-medium">{formatINR(Number(o.total))}</span>
                  </div>
                  <Link
                    to="/orders/$orderNumber"
                    params={{ orderNumber: o.order_number }}
                    className="mt-3 inline-flex text-sm font-medium text-primary underline"
                  >
                    Track this order
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}