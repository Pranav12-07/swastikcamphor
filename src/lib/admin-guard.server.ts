import type { SupabaseClient } from "@supabase/supabase-js";

export type Area =
  | "dashboard"
  | "products"
  | "orders"
  | "customers"
  | "reviews"
  | "marketing"
  | "settings"
  | "admins";

const ROLE_AREAS: Record<string, Area[]> = {
  admin: ["dashboard", "products", "orders", "customers", "reviews", "marketing", "settings", "admins"],
  super_admin: ["dashboard", "products", "orders", "customers", "reviews", "marketing", "settings", "admins"],
  product_manager: ["dashboard", "products"],
  order_manager: ["dashboard", "orders", "customers"],
  support_staff: ["dashboard", "customers", "reviews"],
};

type AnySupabase = SupabaseClient<never>;

export async function getRoles(supabase: AnySupabase, userId: string): Promise<string[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return ((data ?? []) as { role: string }[]).map((r) => r.role);
}

export function areasFor(roles: string[]): Area[] {
  const set = new Set<Area>();
  for (const r of roles) for (const a of ROLE_AREAS[r] ?? []) set.add(a);
  return [...set];
}

export function isSuper(roles: string[]) {
  return roles.includes("admin") || roles.includes("super_admin");
}

/** Throws unless the caller holds a role that grants the area. */
export async function assertPerm(supabase: AnySupabase, userId: string, area: Area) {
  const roles = await getRoles(supabase, userId);
  const areas = areasFor(roles);
  if (!areas.includes(area)) throw new Error("Forbidden");
  return roles;
}

export async function logAudit(entry: {
  actorId: string;
  action: string;
  entity?: string;
  entityId?: string;
  details?: Record<string, unknown>;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("audit_log").insert({
      actor_id: entry.actorId,
      action: entry.action,
      entity: entry.entity ?? null,
      entity_id: entry.entityId ?? null,
      details: entry.details ?? {},
    });
  } catch (err) {
    console.error("audit log failed", err);
  }
}

export async function notify(type: string, title: string, body?: string, link?: string) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("admin_notifications").insert({ type, title, body: body ?? null, link: link ?? null });
  } catch (err) {
    console.error("notification failed", err);
  }
}
