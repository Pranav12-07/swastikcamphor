import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell, useAdminMe } from "@/components/admin/AdminShell";
import { Card } from "@/components/admin/ui";
import { adminSaveProfile } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/profile")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin Profile — Swastik Camphor Admin" },
      { name: "description", content: "Update your staff profile details and change your admin account password." },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Admin Profile — Swastik Camphor Admin" },
      { property: "og:description", content: "Manage your Swastik Camphor staff account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const qc = useQueryClient();
  const { data: me } = useAdminMe();
  const save = useServerFn(adminSaveProfile);
  const [form, setForm] = useState({ full_name: "", phone: "" });
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await save({ data: { full_name: form.full_name, phone: form.phone || null, avatar_url: null } });
      await qc.invalidateQueries({ queryKey: ["admin-me"] });
      toast.success("Profile updated");
    } catch {
      toast.error("Profile could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Use at least 8 characters.");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return toast.error("Password could not be changed.");
    setPassword("");
    toast.success("Password changed");
  }

  return (
    <AdminShell title="Admin profile" description="Your staff account" area="dashboard">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Your details</h2>
          <p className="mt-1 text-sm text-muted-foreground">{me?.email} · {me?.roles.join(", ")}</p>
          <form onSubmit={saveProfile} className="mt-3 space-y-3 text-sm">
            <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder={me?.fullName ?? "Full name"} required className="w-full rounded-md border border-input bg-background px-3 py-2" />
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="w-full rounded-md border border-input bg-background px-3 py-2" />
            <button disabled={busy} className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-60">{busy ? "Saving…" : "Save profile"}</button>
          </form>
        </Card>

        <Card>
          <h2 className="font-semibold">Change password</h2>
          <form onSubmit={changePassword} className="mt-3 space-y-3 text-sm">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" className="w-full rounded-md border border-input bg-background px-3 py-2" />
            <button className="rounded-md border border-input px-4 py-2 font-medium">Update password</button>
          </form>
        </Card>
      </div>
    </AdminShell>
  );
}
