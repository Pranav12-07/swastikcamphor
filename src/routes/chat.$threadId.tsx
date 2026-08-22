import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { UIMessage } from "ai";
import { PageHeader } from "@/components/PageHeader";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { getThreadMessages } from "@/lib/api.functions";
import { getSessionId } from "@/lib/session";

export const Route = createFileRoute("/chat/$threadId")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Swastik Assistant — Conversation" },
      { name: "description", content: "Chat with the Swastik Camphor assistant about products, pooja and orders." },
      { property: "og:title", content: "Swastik Assistant" },
      { property: "og:description", content: "Ask about camphor products, pooja guidance and orders." },
    ],
  }),
  component: ChatThread,
});

function ChatThread() {
  const { threadId } = Route.useParams();
  const [initial, setInitial] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setInitial(null);
    localStorage.setItem("swastik-active-thread", threadId);
    void getThreadMessages({ data: { sessionId: getSessionId(), threadId } })
      .then(
        (rows) =>
          !cancelled &&
          setInitial(rows.map((r) => ({ id: r.id, role: r.role, parts: JSON.parse(r.parts) })) as UIMessage[]),
      )
      .catch(() => !cancelled && setInitial([]));
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  return (
    <>
      <PageHeader eyebrow="Assistant" title="Swastik Assistant" />
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
        <Link to="/chat" className="text-sm text-primary underline-offset-4 hover:underline">
          ← All conversations
        </Link>
        <div className="card-premium mt-4 flex h-[70vh] flex-col p-5">
          {initial ? (
            <ChatWindow
              key={threadId}
              threadId={threadId}
              initialMessages={initial}
              className="flex min-h-0 flex-1 flex-col"
            />
          ) : (
            <p className="text-sm text-muted-foreground">Loading conversation…</p>
          )}
        </div>
      </div>
    </>
  );
}