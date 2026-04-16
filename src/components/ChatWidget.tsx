"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatedMascotHead } from "@/components/holographic/AnimatedMascotHead";

/** Lightweight markdown → HTML for assistant messages.
 *  Handles: **bold**, [text](url), bare https:// URLs, newlines.
 *  HTML-escapes all raw text first so no injection is possible. */
function renderMarkdown(text: string): string {
  // 1. Escape raw HTML so the model can't inject tags
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 2. Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // 3. Markdown links [label](url)
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline decoration-cambridge/60 text-cambridge hover:text-cambridge/80 transition-colors">$1</a>'
  );

  // 4. Bare https:// URLs not already inside an <a>
  html = html.replace(
    /(?<!href=")(https?:\/\/[^\s<"]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="underline decoration-cambridge/60 text-cambridge hover:text-cambridge/80 transition-colors break-all">$1</a>'
  );

  // 5. Newlines → <br>
  html = html.replace(/\n/g, "<br>");

  return html;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function useStreamChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
    };

    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "" };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsLoading(true);
    setError(null);

    // Build messages array for API — cap at last 16 messages (8 turns) to bound token cost
    const apiMessages = [...messages, userMsg]
      .slice(-16)
      .map(({ role, content }) => ({ role, content }));

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m
          )
        );
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      setError("Something went wrong. Please try again.");
      // Remove the empty assistant message on error
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  return { messages, input, setInput, isLoading, error, sendMessage };
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, input, setInput, isLoading, error, sendMessage } = useStreamChat();

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleQuickPrompt(prompt: string) {
    sendMessage(prompt);
  }

  const hasMessages = messages.length > 0;

  return (
    <>
      {/* ── Chat Panel ── */}
      {open && (
        <div className="
          fixed bottom-24 right-4 sm:right-6 z-50
          w-[calc(100vw-2rem)] sm:w-[420px]
          flex flex-col
          bg-bg-primary border border-border-secondary
          rounded-[var(--radius-lg)]
          shadow-[0_8px_40px_rgba(0,0,0,0.18)]
          overflow-hidden
        ">
          {/* Header */}
          <div className="
            flex items-center justify-between
            px-5 py-4
            bg-oxford border-b border-border-secondary
          ">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 shrink-0 rounded-full bg-white/90 overflow-hidden shadow-sm">
                <AnimatedMascotHead
                  speaking={isLoading}
                  className="w-full h-full"
                  ariaLabel=""
                />
              </div>
              <div>
                <p className="text-body-sm font-bold text-white leading-none">Jackie</p>
                <p className="text-[11px] text-cambridge mt-0.5">ChamberBot · Medina Chamber</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="text-white/60 hover:text-white transition-colors p-1"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="overflow-y-auto px-4 py-4 space-y-4 min-h-[200px] max-h-[400px]">
            {!hasMessages && (
              <div className="text-center py-6">
                <p className="text-body-sm font-bold text-text-primary">
                  Hi! I&apos;m Jackie.
                </p>
                <p className="text-caption text-text-tertiary mt-1 max-w-xs mx-auto">
                  Ask me about member businesses, events, membership, or anything about the chamber.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {[
                    "Find a local dentist",
                    "How do I join?",
                    "Upcoming events",
                    "What is Visibility Plus?",
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleQuickPrompt(prompt)}
                      className="
                        px-3 py-1.5 text-[11px] font-bold
                        bg-bg-secondary border border-border-secondary
                        text-text-secondary hover:text-text-primary hover:border-border-primary
                        rounded-full transition-colors
                      "
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`
                  max-w-[85%] px-4 py-2.5 rounded-[var(--radius-md)]
                  text-body-sm leading-relaxed
                  ${m.role === "user"
                    ? "bg-oxford text-white rounded-br-sm whitespace-pre-wrap"
                    : "bg-bg-secondary text-text-primary border border-border-secondary rounded-bl-sm"
                  }
                `}>
                  {m.role === "user" ? (
                    m.content
                  ) : m.content ? (
                    <span dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                  ) : isLoading ? (
                    <span className="flex gap-1 items-center py-0.5">
                      <span className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-text-tertiary rounded-full animate-bounce [animation-delay:300ms]" />
                    </span>
                  ) : ""}
                </div>
              </div>
            ))}

            {error && (
              <p className="text-center text-caption text-red-500">{error}</p>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 px-4 py-3 border-t border-border-secondary bg-bg-primary"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about members, events, or the chamber…"
              disabled={isLoading}
              className="
                flex-1 px-4 py-2.5
                bg-bg-secondary border border-border-secondary
                rounded-[var(--radius-md)]
                text-body-sm text-text-primary placeholder:text-text-tertiary
                focus:outline-none focus:ring-2 focus:ring-cambridge/40 focus:border-cambridge
                disabled:opacity-50 transition-colors
              "
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              aria-label="Send"
              className="
                w-10 h-10 shrink-0 flex items-center justify-center
                bg-oxford hover:bg-oxford/80 disabled:opacity-40
                text-white rounded-[var(--radius-md)] transition-colors
              "
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* ── Floating Button ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chamber assistant"}
        className="
          fixed bottom-5 right-4 sm:right-6 z-50
          w-16 h-16
          bg-bg-primary border-2 border-border-secondary
          rounded-full
          shadow-[0_4px_20px_rgba(0,0,0,0.12)]
          flex items-center justify-center
          transition-all duration-200
          hover:scale-110 active:scale-95
          hover:shadow-[0_6px_24px_rgba(0,0,0,0.18)]
          hover:border-cambridge/40
        "
      >
        {open ? (
          <svg className="w-5 h-5 text-text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        ) : (
          <div className="w-11 h-11 rounded-full overflow-hidden">
            <AnimatedMascotHead
              className="w-full h-full"
              ariaLabel="Open Jackie the ChamberBot"
            />
          </div>
        )}
      </button>
    </>
  );
}
