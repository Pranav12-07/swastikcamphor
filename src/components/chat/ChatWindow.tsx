import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import logoAsset from "@/assets/swastik-logo.png.asset.json";
import { getSessionId } from "@/lib/session";

const SUGGESTIONS = [
  "Which camphor is best for daily pooja?",
  "Do you ship across India?",
  "Bulk order for our temple",
  "मुझे भीमसेनी कपूर के बारे में बताइए",
];

export function ChatWindow({
  threadId,
  initialMessages,
  className,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  className?: string;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const sessionId = useMemo(() => getSessionId(), []);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", body: { threadId, sessionId } }),
    [threadId, sessionId],
  );

  const { messages, sendMessage, status } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (e) =>
      setError(
        e.message.includes("429")
          ? "Too many messages right now — please try again in a moment."
          : "Sorry, the assistant is unavailable right now. Please email info@swastikcamphor.in.",
      ),
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy, threadId]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setError(null);
    setInput("");
    void sendMessage({ text: trimmed });
  };

  return (
    <div className={className}>
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-4">
          {messages.length === 0 && (
            <div className="animate-rise-in px-2 py-6 text-center">
              <img
                src={logoAsset.url}
                alt=""
                className="mx-auto h-14 w-14 rounded-full object-cover ring-1 ring-gold/50"
                width={56}
                height={56}
              />
              <p className="mt-3 font-display text-lg">Namaste 🙏 I'm the Swastik Assistant</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ask me about our camphor products, pooja guidance, orders or delivery — in English, हिंदी or
                తెలుగు.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-gold/40 px-3 py-1.5 text-xs transition-colors hover:bg-accent/15"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <Message from={message.role} key={message.id}>
              <MessageContent
                className={message.role === "assistant" ? "bg-transparent p-0 text-foreground" : undefined}
              >
                {message.parts.map((part, i) =>
                  part.type === "text" ? (
                    <MessageResponse key={`${message.id}-${i}`}>{part.text}</MessageResponse>
                  ) : null,
                )}
              </MessageContent>
            </Message>
          ))}

          {status === "submitted" && (
            <Shimmer className="px-1 text-sm">Swastik Assistant is thinking…</Shimmer>
          )}
          {error && <p className="px-1 text-sm text-destructive">{error}</p>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput
        className="mt-3"
        onSubmit={(_message, event) => {
          event.preventDefault();
          send(input);
        }}
      >
        <PromptInputTextarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about camphor, pooja, orders…"
        />
        <PromptInputFooter className="justify-end">
          <PromptInputSubmit status={status} disabled={busy || !input.trim()} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}