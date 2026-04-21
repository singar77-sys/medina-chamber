"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { AnimatedMascotHead } from "@/components/holographic/AnimatedMascotHead";
import { renderMarkdown } from "@/lib/markdown";

/**
 * Page-context → quick-prompts mapping. Jackie reads the current
 * pathname on mount and offers the most-useful 4 questions for that
 * surface instead of the generic set.
 */
interface PageContext {
  greeting: string;
  subtitle: string;
  prompts: string[];
}

function contextForPath(pathname: string): PageContext {
  // Directory — member search
  if (pathname.startsWith("/membership/directory")) {
    return {
      greeting: "Looking for something specific?",
      subtitle:
        "I can shortcut the directory — tell me a trade, a neighborhood, or a name.",
      prompts: [
        "Find a local plumber",
        "Who does commercial printing?",
        "Restaurants in Medina",
        "Show me landscapers",
      ],
    };
  }

  // Events — list or detail
  if (pathname.startsWith("/events")) {
    return {
      greeting: "Planning ahead?",
      subtitle: "I can help you find the right event or explain what's involved.",
      prompts: [
        "What's the next networking event?",
        "Tell me about the Golf Outing",
        "How do I sponsor an event?",
        "Are events members-only?",
      ],
    };
  }

  // Safety Council — savings estimator vibe
  if (pathname.startsWith("/programs/safety-council")) {
    return {
      greeting: "Thinking about workers' comp savings?",
      subtitle: "I can explain how the rebate works and what membership requires.",
      prompts: [
        "How much could my business save?",
        "What's the BWC rebate?",
        "How do I join Safety Council?",
        "Meeting schedule?",
      ],
    };
  }

  // Compass
  if (pathname.startsWith("/programs/compass")) {
    return {
      greeting: "Curious if Compass fits?",
      subtitle: "I can explain the program and who it's built for.",
      prompts: [
        "What is Compass?",
        "Who should apply?",
        "When does the next cohort start?",
        "What does Compass cost?",
      ],
    };
  }

  // Rental Space
  if (pathname.startsWith("/programs/rental-space")) {
    return {
      greeting: "Need a room?",
      subtitle: "I can walk you through the Vault and Main Room.",
      prompts: [
        "The Vault vs the Main Room?",
        "What's included in a booking?",
        "How do I book a room?",
        "What's the cost?",
      ],
    };
  }

  // Join / Pricing / Benefits — active conversion paths
  if (
    pathname.startsWith("/membership/join") ||
    pathname.startsWith("/membership/pricing") ||
    pathname.startsWith("/membership/benefits")
  ) {
    return {
      greeting: "Questions before you apply?",
      subtitle: "I can explain the tiers and what fits your business.",
      prompts: [
        "What's included at each tier?",
        "Who should I talk to first?",
        "How long does membership take to pay off?",
        "What are the savings programs?",
      ],
    };
  }

  // Advocacy
  if (pathname.startsWith("/about/advocacy")) {
    return {
      greeting: "Want to plug in?",
      subtitle: "I can explain the Chamber's advocacy work and how to get involved.",
      prompts: [
        "What policy priorities matter now?",
        "Who do I meet with?",
        "How do I attend a legislator meeting?",
        "Tell me about candidate forums",
      ],
    };
  }

  // Default — homepage / everything else
  return {
    greeting: "Hi! I'm the ChamberBot.",
    subtitle:
      "Ask me about member businesses, events, membership, or anything about the chamber.",
    prompts: [
      "Find a local dentist",
      "How do I join?",
      "Upcoming events",
      "What is Visibility Plus?",
    ],
  };
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

  // Server-owned session. The server keeps the real transcript in Upstash
  // keyed by this ID; we only ever send the newest user message. The
  // local `messages` state above is for UI display only — the server
  // doesn't trust it (and therefore doesn't let anyone forge assistant
  // turns to jailbreak the system prompt).
  //
  // Null until the first request completes — the server mints the ID
  // and echoes it back in the x-session-id response header, at which
  // point we adopt it for subsequent turns.
  const sessionIdRef = useRef<string | null>(null);

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

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // On the first turn, sessionIdRef.current is null and the
          // server mints a fresh UUID. On subsequent turns we echo
          // back whatever the server gave us.
          sessionId: sessionIdRef.current,
          message: userMsg.content,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error("No response body");

      // Adopt the server-issued session ID for future turns. Same-
      // origin fetch exposes response headers to JS without any
      // CORS expose-headers configuration.
      const serverSid = res.headers.get("x-session-id");
      if (serverSid) sessionIdRef.current = serverSid;

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
  const pathname = usePathname();

  const { messages, input, setInput, isLoading, error, sendMessage } = useStreamChat();

  // Context-aware greeting + quick prompts based on current route
  const ctx = useMemo(() => contextForPath(pathname || "/"), [pathname]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Listen for `jackie:open` events from the Command Palette fallback.
  // Payload: { query: string } — we open and auto-send the question.
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ query?: string }>;
      setOpen(true);
      const q = ce.detail?.query?.trim();
      if (q) {
        // Small delay so the panel mounts before firing the message
        setTimeout(() => sendMessage(q), 80);
      }
    };
    window.addEventListener("jackie:open", handler);
    return () => window.removeEventListener("jackie:open", handler);
  }, [sendMessage]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleQuickPrompt(prompt: string) {
    sendMessage(prompt);
  }

  const hasMessages = messages.length > 0;

  // The homepage has its own full-screen ChamberBot portal experience
  // (see HolographicChamber + ChamberBotPortal). The floating widget
  // would compete with it, so we hide it on "/" only. Placed after all
  // hooks so hook count stays stable across renders/navigation.
  if (pathname === "/") return null;

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
                <p className="text-body-sm font-bold text-white leading-none">ChamberBot</p>
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
                  {ctx.greeting}
                </p>
                <p className="text-caption text-text-tertiary mt-1 max-w-xs mx-auto">
                  {ctx.subtitle}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {ctx.prompts.map((prompt) => (
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
              ariaLabel="Open the ChamberBot"
            />
          </div>
        )}
      </button>
    </>
  );
}
