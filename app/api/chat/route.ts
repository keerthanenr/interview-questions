import type { NextRequest } from "next/server";
import { streamChat } from "@/lib/claude/client";
import { BUILD_PHASE_SYSTEM_PROMPT } from "@/lib/claude/prompts";
import { logEvent } from "@/lib/events/logger";

export async function POST(request: NextRequest) {
  try {
    const { messages, sessionId } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Log prompt_sent server-side for reliability
    const lastMessage = messages[messages.length - 1];
    if (sessionId && lastMessage?.role === "user") {
      logEvent({
        sessionId,
        eventType: "prompt_sent",
        payload: {
          prompt_text: lastMessage.content,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const startTime = Date.now();
    const stream = await streamChat(messages, BUILD_PHASE_SYSTEM_PROMPT);

    const encoder = new TextEncoder();
    let fullResponse = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              fullResponse += event.delta.text;
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();

          // Log claude_response after stream completes (fire-and-forget)
          if (sessionId) {
            const durationMs = Date.now() - startTime;
            logEvent({
              sessionId,
              eventType: "claude_response",
              payload: {
                response_text: fullResponse,
                tokens_used: null,
                model: "claude-sonnet-4-20250514",
                duration_ms: durationMs,
              },
            });
          }
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
