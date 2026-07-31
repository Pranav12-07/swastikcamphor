import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { createThread, listThreads, type ThreadRow } from "@/lib/api.functions";
import { getSessionId } from "@/lib/session";

export const Route = createFileRoute("/chat/")({
  head: () => ({
    meta: [
      { title: "Chat with Swastik Assistant — Swastik Camphor" },
      { name: "description", content: "Ask the Swastik Camphor AI assistant about products, pooja guidance, orders and delivery." },
      { property: "og:title", content: "Chat with Swastik Assistant" },
      { property: "og:description", content: "Your saved conversations with the Swastik Camphor assistant." },
    ],
  }),
  component: ChatIndex,
});

function ChatIndex() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<ThreadRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listThreads({ data: { sessionId: getSessionId() } })
      .then((rows) => !cancelled && setThreads(rows))
      .catch(() => !cancelled && setThreads([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const start = async () => {
    const thread = await createThread({ data: { sessionId: getSessionId() } });
    localStorage.setItem("swastik-active-thread", thread.id);
    void navigate({ to: "/chat/$threadId", params: { threadId: thread.id } });
  };

  return (
    <>
      <PageHeader eyebrow="Assistant" title="Your conversations" subtitle="Pick up where you left off, or start a new chat." />
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-8">
        <button
          type="button"
          onClick={() => void start()}
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          New conversation
        </button>
        <ul className="mt-8 space-y-3">
          {(threads ?? []).map((t) => (
            <li key={t.id} className="card-premium p-4">
              <button
                type="button"
                onClick={() => void navigate({ to: "/chat/$threadId", params: { threadId: t.id } })}
                className="w-full text-left"
              >
                <span className="block truncate font-display text-lg">{t.title}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(t.updated_at).toLocaleString("en-IN")}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {threads?.length === 0 && (
          <p className="mt-8 text-sm text-muted-foreground">No conversations yet.</p>
        )}
      </div>
    </>
  );
}