"use client";

/**
 * NAMING NOTE — "Jackie" vs "ChamberBot"
 *
 * The bot's user-facing name is **ChamberBot** (canonical — see the
 * system prompt in api/chat/route.ts). All UI copy says "ChamberBot."
 *
 * Internal identifiers — the `jackie:open` CustomEvent, the
 * `cmdk-group--jackie` / `jkc-jackie-col` CSS classes, the
 * `askJackie()` function in CommandPalette — were named when the
 * mascot was called "Jackie" and have not been mass-renamed because
 * doing so would touch CSS class names tracked across globals.css
 * (~10 selectors). The two naming systems are stable: copy ↔ user,
 * Jackie ↔ wire. Don't mix. If you rename one side, rename both.
 */

import { useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatedMascotHead } from "@/components/holographic/AnimatedMascotHead";
import { HandoffForm } from "@/components/chat/HandoffForm";
import { renderMarkdown } from "@/lib/markdown";
import { DEFAULT_PROMPTS } from "@/lib/chamberbot-prompts";

/**
 * Delay before the proactive preview bubble pops on a content-specific
 * route (pricing, programs, events, etc). Long enough that a user who's
 * clearly leaving or skimming isn't interrupted, short enough that a
 * user actually considering membership gets a nudge.
 */
const PROACTIVE_DELAY_MS = 20000;
/** How long the bubble stays visible before auto-fading if ignored. */
const PROACTIVE_AUTOFADE_MS = 25000;
/** SessionStorage key prefix — per-path dismissal scoped to this tab. */
const DISMISS_KEY = "chamber-proactive-dismissed";

/**
 * Page-context → quick-prompts mapping. Jackie reads the current
 * pathname on mount and offers the most-useful 4 questions for that
 * surface instead of the generic set.
 */
interface PageContext {
  greeting: string;
  subtitle: ReactNode;
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

  // Default — homepage / everything else.
  // Subtitle leans into what differentiates ChamberBot from generic AI:
  // it's trained on the chamber's actual member directory + live event
  // calendar, not the open internet. That's the one thing ChatGPT can't do.
  // Generic-default prompts come from the shared module so the portal and
  // the bubble panel show the same starter set on first open.
  return {
    greeting: "Not the average chatbot.",
    subtitle: (
      <>
        I know all 511 chamber members by name and the whole event calendar by
        heart.{" "}
        <Link href="/chamberbot" className="underline underline-offset-2 hover:text-text-primary transition-colors">
          Try me on full screen
        </Link>{" "}
        or keep chatting here.
      </>
    ),
    prompts: [...DEFAULT_PROMPTS].slice(0, 4),
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

  /** Expose a getter for the current session ID so the handoff form
   *  can attach it to its POST. Not a setter — the server is
   *  authoritative on session identity. */
  const getSessionId = useCallback(() => sessionIdRef.current, []);

  return { messages, input, setInput, isLoading, error, sendMessage, getSessionId };
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [previewText, setPreviewText] = useState<ReactNode | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  const { messages, input, setInput, isLoading, error, sendMessage, getSessionId } = useStreamChat();

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

  // Suppress the proactive preview-bubble nag on:
  //  • /chamberbot — the page IS the bot; proactive nudges would be
  //    redundant. The `return null` early bail below also hides the
  //    bubble itself there, so this is belt-and-suspenders.
  //  • /         — the homepage. Landing-page visitors are still
  //    orienting; nagging them in the first 20 seconds reads as desperate.
  //    The bubble is fully visible on home now (was previously hidden
  //    behind a HolographicChamber hero), so users can self-initiate.
  //
  // Every other route is a content-specific surface where a tailored
  // prompt is genuinely helpful and gets the proactive treatment.
  const suppressProactive = pathname === "/" || pathname.startsWith("/chamberbot");

  // Proactive popup — after PROACTIVE_DELAY_MS on a content-specific
  // route, a small preview bubble pops next to the chat button with a
  // page-tailored prompt. Gets dismissed once per path per tab (via
  // sessionStorage) so users who already said no don't get re-nagged
  // on the same page. Never fires if chat is already open or if
  // contextForPath() fell through to the generic default.
  useEffect(() => {
    if (open || suppressProactive) return;
    if (typeof window === "undefined") return;

    const dismissKey = `${DISMISS_KEY}:${pathname}`;
    if (sessionStorage.getItem(dismissKey)) return;

    // Only fire on routes where contextForPath returned a non-generic
    // greeting — those are the ones with tailored prompts worth
    // surfacing. Default fall-through stays quiet.
    const isGenericContext = ctx.greeting === "Not the average chatbot.";
    if (isGenericContext) return;

    const showTimer = window.setTimeout(() => {
      setPreviewText(ctx.subtitle);
    }, PROACTIVE_DELAY_MS);

    return () => window.clearTimeout(showTimer);
  }, [pathname, open, suppressProactive, ctx]);

  // Auto-fade the bubble if it's been sitting ignored
  useEffect(() => {
    if (!previewText) return;
    const fadeTimer = window.setTimeout(
      () => setPreviewText(null),
      PROACTIVE_AUTOFADE_MS,
    );
    return () => window.clearTimeout(fadeTimer);
  }, [previewText]);

  // Dismiss the preview as soon as chat opens (whether via click,
  // proactive accept, or any other path).
  useEffect(() => {
    if (open && previewText) setPreviewText(null);
  }, [open, previewText]);

  function dismissPreview(persist: boolean) {
    setPreviewText(null);
    if (persist && typeof window !== "undefined") {
      sessionStorage.setItem(`${DISMISS_KEY}:${pathname}`, "1");
    }
  }

  function acceptPreview() {
    dismissPreview(true);
    setOpen(true);
  }

  // Hide the floating bubble on /chamberbot itself — that page IS the
  // ChamberBot experience, no need for a redundant floating mascot
  // fighting the immersive surface for attention.
  if (pathname.startsWith("/chamberbot")) return null;

  return (
    <div>
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
                <p className="text-[11px] text-cambridge mt-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-cambridge mr-1.5 align-middle" />
                  Live · Medina Chamber
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Open in fullscreen — routes to /chamberbot which
                  auto-opens the immersive ChamberBotPortal. Always
                  visible (not just empty state) so a user mid-chat
                  can still escalate to the bigger surface.

                  Tap-target sizing: explicit w-11 h-11 (44×44) meets
                  WCAG 2.5.5 AAA + Apple HIG floor on mobile. Was p-1
                  (~28×28) which thumbs miss on phones. */}
              {!handoffOpen && (
                <Link
                  href="/chamberbot"
                  aria-label="Open ChamberBot fullscreen"
                  title="Open fullscreen"
                  className="w-11 h-11 inline-flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h6v6" />
                    <path d="M9 21H3v-6" />
                    <path d="M21 3l-7 7" />
                    <path d="M3 21l7-7" />
                  </svg>
                </Link>
              )}
              {/* Talk-to-a-human escalation. Hidden while the handoff
                  form is already showing (can't escalate what's already
                  escalated). */}
              {!handoffOpen && (
                <button
                  onClick={() => setHandoffOpen(true)}
                  aria-label="Talk to a chamber team member"
                  title="Talk to a chamber team member"
                  className="w-11 h-11 inline-flex items-center justify-center text-white/70 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87" />
                    <path d="M16 3.13a4 4 0 010 7.75" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="w-11 h-11 inline-flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Handoff form replaces messages+input when active. Keeps the
              user in-panel so they don't lose their place in the chat. */}
          {handoffOpen ? (
            <HandoffForm
              sessionId={getSessionId()}
              onBack={() => setHandoffOpen(false)}
            />
          ) : (
            <>
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
                {/* Note: the "Open fullscreen" escape hatch lives in
                    the panel header (always visible), not duplicated
                    here in the empty state. */}
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
              name="chamberbot-message"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="sentences"
              spellCheck={true}
              /* font-size 16px+ kills iOS Safari's zoom-on-focus jerk.
                 text-body-sm (14px) was triggering it on every tap.
                 lg: pulls back to text-body-sm to keep the desktop
                 panel feeling tight. */
              className="
                flex-1 px-4 py-2.5
                bg-bg-secondary border border-border-secondary
                rounded-[var(--radius-md)]
                text-base lg:text-body-sm text-text-primary placeholder:text-text-tertiary
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
            </>
          )}
        </div>
      )}

      {/* ── Proactive preview bubble ── */}
      {previewText && !open && (
        <div
          className="
            fixed bottom-24 right-4 sm:right-6 z-50
            max-w-[300px]
            bg-bg-primary border border-border-secondary
            rounded-[var(--radius-md)]
            shadow-[0_6px_24px_rgba(0,0,0,0.16)]
            p-4
            animate-in fade-in slide-in-from-bottom-2 duration-300
          "
          role="dialog"
          aria-label="Suggestion from ChamberBot"
        >
          <button
            onClick={() => dismissPreview(true)}
            aria-label="Dismiss"
            className="absolute top-2 right-2 text-text-tertiary hover:text-text-secondary transition-colors p-1"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <div className="flex gap-3 items-start pr-4">
            <div className="w-8 h-8 shrink-0 rounded-full bg-bg-secondary overflow-hidden">
              <AnimatedMascotHead className="w-full h-full" ariaLabel="" />
            </div>
            <div>
              <p className="text-body-sm text-text-primary leading-snug">
                {previewText}
              </p>
              <button
                onClick={acceptPreview}
                className="
                  mt-3 inline-flex items-center px-3 py-1.5 text-[11px] font-bold
                  bg-oxford hover:bg-oxford/80
                  text-white rounded-full transition-colors
                "
              >
                Let&apos;s chat →
              </button>
            </div>
          </div>
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
    </div>
  );
}
