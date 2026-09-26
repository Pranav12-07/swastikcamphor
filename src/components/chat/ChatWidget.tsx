import { Link } from "@tanstack/react-router";
import { MessageCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import logoAsset from "@/assets/swastik-logo.png.asset.json";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { createThread, getThreadMessages } from "@/lib/api.functions";
import { getSessionId } from "@/lib/session";
import type { UIMessage } from "ai";

const ACTIVE_KEY = "swastik-active-thread";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [initial, setInitial] = useState<UIMessage[] | null>(null);

  useEffect(() => {
    if (!open || threadId) return;
    let cancelled = false;
    (async () => {
      const sessionId = getSessionId();
      const stored = localStorage.getItem(ACTIVE_KEY);
      try {
        if (stored) {
          const rows = await getThreadMessages({ data: { sessionId, threadId: stored } });
          if (cancelled) return;
          setThreadId(stored);
          setInitial(
            rows.map((r) => ({ id: r.id, role: r.role, parts: JSON.parse(r.parts) })) as UIMessage[],
          );
          return;
        }
        const thread = await createThread({ data: { sessionId } });
        if (cancelled) return;
        localStorage.setItem(ACTIVE_KEY, thread.id);
        setThreadId(thread.id);
        setInitial([]);
      } catch {
        if (!cancelled) setInitial([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, threadId]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat assistant" : "Open chat assistant"}
        className="float-lift fixed bottom-4 right-4 z-50 grid h-12 w-12 place-items-center rounded-full border border-gold/50 bg-primary text-primary-foreground shadow-[var(--shadow-lift)] transition-transform duration-300 hover:scale-105 md:bottom-5 md:right-5 md:h-14 md:w-14"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5 animate-flicker" />}
      </button>

      {open && (
        <div className="surface-glass animate-rise-in fixed bottom-20 right-4 z-50 flex h-[min(70vh,560px)] w-[min(92vw,25rem)] flex-col rounded-3xl p-4 md:bottom-24">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-gold/25 pb-3">
            <div className="flex min-w-0 items-center gap-2">
              <img src={logoAsset.url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" width={36} height={36} />
              <span className="min-w-0">
                <span className="block truncate font-display text-base">Swastik Assistant</span>
                <span className="block text-[0.7rem] text-muted-foreground">Online • replies instantly</span>
              </span>
            </div>
            <Link
              to="/chat"
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-full border border-gold/40 px-3 py-1 text-xs transition-colors hover:bg-accent/15"
            >
              All chats
            </Link>
          </div>

          {threadId && initial ? (
            <ChatWindow
              key={threadId}
              threadId={threadId}
              initialMessages={initial}
              className="flex min-h-0 flex-1 flex-col pt-3"
            />
          ) : (
            <p className="flex-1 pt-6 text-center text-sm text-muted-foreground">Starting your chat…</p>
          )}
        </div>
      )}
    </>
  );
}