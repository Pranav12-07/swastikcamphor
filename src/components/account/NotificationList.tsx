import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { listMyNotifications, markNotificationsRead } from "@/lib/account.functions";

export function NotificationList() {
  const listFn = useServerFn(listMyNotifications);
  const markFn = useServerFn(markNotificationsRead);
  const qc = useQueryClient();

  const notifications = useQuery({
    queryKey: ["my-notifications"],
    queryFn: () => listFn({ data: undefined }),
    refetchInterval: 60_000,
  });

  const unread = (notifications.data ?? []).filter((n) => !n.read_at).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg">
          Notifications{unread > 0 && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{unread}</span>}
        </h2>
        {unread > 0 && (
          <button
            onClick={async () => {
              await markFn({ data: undefined });
              await qc.invalidateQueries({ queryKey: ["my-notifications"] });
            }}
            className="text-sm text-primary underline"
          >
            Mark all read
          </button>
        )}
      </div>
      {notifications.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (notifications.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">No notifications yet.</p>
      ) : (
        <ul className="space-y-2">
          {notifications.data?.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border p-3 text-sm ${n.read_at ? "border-border" : "border-primary/40 bg-primary/5"}`}
            >
              <p className="font-medium">{n.title}</p>
              {n.body && <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>}
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(n.created_at).toLocaleString("en-IN")}
              </p>
              {n.link?.startsWith("/orders/") && (
                <Link
                  to="/orders/$orderNumber"
                  params={{ orderNumber: n.link.replace("/orders/", "") }}
                  className="mt-2 inline-flex text-sm font-medium text-primary underline"
                >
                  View order
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
