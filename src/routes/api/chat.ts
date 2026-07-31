import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { CHAT_SYSTEM_PROMPT } from "@/lib/knowledge";

type Body = { messages?: unknown; threadId?: unknown; sessionId?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as Body;
        const messages = body.messages;
        const threadId = typeof body.threadId === "string" ? body.threadId : null;
        const sessionId = typeof body.sessionId === "string" ? body.sessionId : null;

        if (!Array.isArray(messages)) return new Response("Messages are required", { status: 400 });

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("AI is not configured", { status: 500 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let ownsThread = false;
        if (threadId && sessionId) {
          const { data: thread } = await supabaseAdmin
            .from("chat_threads")
            .select("id, title")
            .eq("id", threadId)
            .eq("session_id", sessionId)
            .maybeSingle();
          ownsThread = Boolean(thread);

          if (ownsThread) {
            const last = messages[messages.length - 1] as UIMessage | undefined;
            if (last?.role === "user") {
              const { error } = await supabaseAdmin.from("chat_messages").insert({
                thread_id: threadId,
                message_id: last.id ?? null,
                role: "user",
                parts: JSON.parse(JSON.stringify(last.parts ?? [])),
              });
              if (error) console.error("Failed to save user message", error.message);

              const text = (last.parts ?? [])
                .map((p) => (p.type === "text" ? p.text : ""))
                .join(" ")
                .trim();
              await supabaseAdmin
                .from("chat_threads")
                .update({
                  updated_at: new Date().toISOString(),
                  ...(thread?.title === "New conversation" && text ? { title: text.slice(0, 60) } : {}),
                })
                .eq("id", threadId);
            }
          }
        }

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("openai/gpt-5.6-sol"),
          system: CHAT_SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages as UIMessage[]),
          providerOptions: { lovable: { reasoningEffort: "none" } },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
          onFinish: async ({ responseMessage }) => {
            if (!threadId || !ownsThread || !responseMessage) return;
            const { error } = await supabaseAdmin.from("chat_messages").insert({
              thread_id: threadId,
              message_id: responseMessage.id ?? null,
              role: "assistant",
              parts: JSON.parse(JSON.stringify(responseMessage.parts ?? [])),
            });
            if (error) console.error("Failed to save assistant message", error.message);
          },
        });
      },
    },
  },
});