"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ClaudeChatPanelProps {
  sessionId: string;
  onClaudeCode?: (code: string, timestamp: number) => void;
}

export function ClaudeChatPanel({
  sessionId,
  onClaudeCode,
}: ClaudeChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastFailedMessageRef = useRef<string | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 96)}px`;
    }
  }, [input]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };

      // Log prompt_sent event to server (fire-and-forget)
      fetch("/api/assess/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          eventType: "prompt_sent",
          payload: {
            prompt_text: userMessage.content,
            timestamp: userMessage.timestamp.toISOString(),
          },
        }),
      }).catch(() => {});

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput("");
      setIsStreaming(true);

      // Create placeholder for assistant message
      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        },
      ]);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            sessionId,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get response");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader available");

        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: fullText } : m
            )
          );
        }

        // Extract code blocks from Claude's response for tracking
        const codeBlockMatch = fullText.match(/```[\w]*\n([\s\S]*?)```/);
        if (codeBlockMatch) {
          onClaudeCode?.(codeBlockMatch[1], Date.now());
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    "Something went wrong. Click the retry button or send your message again.",
                }
              : m
          )
        );
        // Store last failed message for retry
        lastFailedMessageRef.current = text;
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, isStreaming, sessionId, onClaudeCode]
  );

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse-warm rounded-full bg-success" />
          <h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
            Claude Assistant
          </h3>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <svg
                className="h-5 w-5 text-primary"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-muted-foreground text-sm">
              Ask me anything about the challenge. I can help with React
              concepts, debugging, or code suggestions.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            className={cn(
              "flex gap-2.5",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
            key={message.id}
          >
            {message.role === "assistant" && (
              <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-primary/15">
                <span className="font-bold text-primary text-xs">C</span>
              </div>
            )}
            <div
              className={cn(
                "max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary"
              )}
            >
              {message.role === "assistant" ? (
                <div
                  className="prose prose-sm prose-invert prose-headings:my-2 prose-li:my-0.5 prose-ol:my-1.5 prose-p:my-1.5 prose-pre:my-2 prose-ul:my-1.5 max-w-none prose-code:rounded prose-pre:rounded-lg prose-pre:border prose-pre:border-border prose-code:bg-primary/10 prose-pre:bg-[#0d1117] prose-code:px-1 prose-code:py-0.5 prose-code:text-primary prose-code:text-xs"
                  // biome-ignore lint: rendering markdown from Claude API
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(message.content),
                  }}
                />
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}
              {message.role === "assistant" &&
                message.content === "" &&
                isStreaming && (
                  <div className="flex items-center gap-1 py-1">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground delay-100" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground delay-200" />
                  </div>
                )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form
        className="flex-shrink-0 border-t px-3 py-2.5"
        onSubmit={handleSubmit}
      >
        <div className="flex items-end gap-2">
          <textarea
            className="max-h-24 flex-1 resize-none rounded-lg bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            disabled={isStreaming}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Claude for help..."
            ref={textareaRef}
            rows={1}
            value={input}
          />
          <Button
            className="h-9 w-9 flex-shrink-0"
            disabled={!input.trim() || isStreaming}
            size="icon"
            type="submit"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
        </div>
        {lastFailedMessageRef.current && !isStreaming && (
          <button
            className="mt-1 px-1 text-primary text-xs hover:underline"
            onClick={() => {
              const msg = lastFailedMessageRef.current;
              lastFailedMessageRef.current = null;
              // Remove the error message
              setMessages((prev) => prev.slice(0, -2));
              if (msg) sendMessage(msg);
            }}
            type="button"
          >
            Retry last message
          </button>
        )}
        <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">
          Enter to send, Shift+Enter for newline
        </p>
      </form>
    </div>
  );
}

/**
 * Simple markdown-to-HTML converter for chat messages.
 * Handles code blocks, inline code, bold, italic, and line breaks.
 */
function formatMarkdown(text: string): string {
  if (!text) return "";

  let html = text
    // Escape HTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Code blocks
    .replace(
      /```(\w*)\n([\s\S]*?)```/g,
      '<pre><code class="language-$1">$2</code></pre>'
    )
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Line breaks (but not inside pre tags)
    .replace(/\n/g, "<br />");

  // Fix line breaks inside pre blocks
  html = html.replace(
    /<pre><code(.*?)>([\s\S]*?)<\/code><\/pre>/g,
    (_, attrs, code) => {
      return `<pre><code${attrs}>${code.replace(/<br \/>/g, "\n")}</code></pre>`;
    }
  );

  return html;
}
