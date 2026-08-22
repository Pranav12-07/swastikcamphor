import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteMyAddress, listMyAddresses, saveMyAddress } from "@/lib/account.functions";

const empty = {
  label: "Home",
  full_name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
};

const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

export function AddressBook() {
  const listFn = useServerFn(listMyAddresses);
  const saveFn = useServerFn(saveMyAddress);
  const deleteFn = useServerFn(deleteMyAddress);
  const qc = useQueryClient();

  const addresses = useQuery({
    queryKey: ["my-addresses"],
    queryFn: () => listFn({ data: undefined }),
  });

  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  function set(field: keyof typeof empty, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function save() {
    setBusy(true);
    try {
      await saveFn({
        data: {
          ...form,
          line2: form.line2 || null,
          is_default: (addresses.data?.length ?? 0) === 0,
        },
      });
      toast.success("Address saved");
      setForm(empty);
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["my-addresses"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that address");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await deleteFn({ data: { id } });
      await qc.invalidateQueries({ queryKey: ["my-addresses"] });
    } catch {
      toast.error("Could not remove that address");
    }
  }

  return (
    <div className="surface-glass h-fit space-y-4 rounded-2xl p-6">
      <h2 className="font-display text-lg">Saved addresses</h2>
      {addresses.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (addresses.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">No saved addresses yet.</p>
      ) : (
        <ul className="space-y-3">
          {addresses.data?.map((a) => (
            <li key={a.id} className="rounded-xl border border-border p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {a.label} — {a.full_name}
                    {a.is_default && (
                      <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs">Default</span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(", ")}
                  </p>
                  <p className="text-xs text-muted-foreground">{a.phone}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${a.label} address`}
                  onClick={() => remove(a.id)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <input className={inputClass} placeholder="Label (Home, Office)" value={form.label} onChange={(e) => set("label", e.target.value)} />
            <input className={inputClass} placeholder="Full name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
            <input className={inputClass} placeholder="Phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            <input className={inputClass} placeholder="Pincode" value={form.pincode} onChange={(e) => set("pincode", e.target.value)} />
          </div>
          <input className={inputClass} placeholder="Address line 1" value={form.line1} onChange={(e) => set("line1", e.target.value)} />
          <input className={inputClass} placeholder="Address line 2 (optional)" value={form.line2} onChange={(e) => set("line2", e.target.value)} />
          <div className="grid gap-2 sm:grid-cols-2">
            <input className={inputClass} placeholder="City" value={form.city} onChange={(e) => set("city", e.target.value)} />
            <input className={inputClass} placeholder="State" value={form.state} onChange={(e) => set("state", e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={busy}
              className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save address"}
            </button>
            <button onClick={() => setOpen(false)} className="rounded-full border border-border px-5 py-2 text-sm">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="w-full rounded-full border border-border px-5 py-2.5 text-sm">
          Add a new address
        </button>
      )}
    </div>
  );
}
