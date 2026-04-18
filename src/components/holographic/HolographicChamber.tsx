"use client";

import { useState, useRef, useCallback } from "react";
import { ChamberBotMascot } from "./ChamberBotMascot";
import { renderMarkdown } from "@/lib/markdown";
import { useVisitState, type TimeOfDay } from "@/lib/useVisitState";

type SceneState = "idle" | "listening" | "thinking" | "responding";

const SUGGESTIONS = [
  "Find a local plumber",
  "When is the next event?",
  "How much does membership cost?",
  "Who does commercial printing?",
  "Tell me about the Safety Council",
];

/**
 * Given the last user question, return 2-3 contextual follow-up
 * suggestions. Pure string-matching — no API call, zero latency.
 */
function getFollowUps(query: string): string[] {
  const q = query.toLowerCase();

  if (
    q.includes("event") ||
    q.includes("networking") ||
    q.includes("upcoming") ||
    q.includes("happening")
  ) {
    return [
      "Tell me about the Annual Golf Outing",
      "What about the Athena Awards?",
      "How do I sponsor an event?",
    ];
  }

  if (
    q.includes("join") ||
    q.includes("membership") ||
    q.includes("cost") ||
    q.includes("price") ||
    q.includes("tier") ||
    q.includes("dues")
  ) {
    return [
      "What's included at each tier?",
      "Who should I talk to first?",
      "What are the savings programs?",
    ];
  }

  if (
    q.includes("find") ||
    q.includes("member") ||
    q.includes("business") ||
    q.includes("directory") ||
    q.includes("who does") ||
    q.includes("looking for")
  ) {
    return [
      "Show me restaurants in Medina",
      "Who does commercial printing?",
      "Find a landscaper",
    ];
  }

  if (
    q.includes("safety") ||
    q.includes("compass") ||
    q.includes("program") ||
    q.includes("mentor")
  ) {
    return [
      "Tell me about Compass",
      "What's the Safety Council?",
      "Are programs members-only?",
    ];
  }

  if (
    q.includes("advocacy") ||
    q.includes("policy") ||
    q.includes("legislator") ||
    q.includes("voice")
  ) {
    return [
      "Who can I meet with?",
      "How do I get involved?",
      "When's the next policy meeting?",
    ];
  }

  if (
    q.includes("rental") ||
    q.includes("room") ||
    q.includes("meeting space") ||
    q.includes("vault")
  ) {
    return [
      "How do I book a room?",
      "What's the cost?",
      "Tell me about the Main Room",
    ];
  }

  // Default fallback
  return [
    "Tell me more",
    "What else can you help with?",
    "Who should I contact?",
  ];
}

/**
 * ChamberBot intro section for the homepage.
 *
 * Side-by-side: Jackie the mascot + chat input. Initial prompt chips
 * lower activation energy; after an answer, contextual follow-up chips
 * keep the conversation moving. Response area is structured as a
 * proper Q&A exchange (user quote → divider → Jackie avatar + reply)
 * so the "who is saying what" is visually obvious.
 */
/**
 * Build the living-homepage greeting based on visit state + time.
 * Returns three strings: an eyebrow badge label, the headline prefix
 * (or null to fall through to the default), and the subhead body.
 */
function livingGreeting(
  isReturning: boolean,
  timeOfDay: TimeOfDay | null,
  ready: boolean,
): { badge: string; subhead: string } {
  // SSR / pre-hydration — show the neutral default to avoid flash
  if (!ready) {
    return {
      badge: "AI · Powered",
      subhead:
        "Ask anything about Medina County businesses, chamber events, membership, or programs.",
    };
  }

  if (isReturning) {
    return {
      badge: "Welcome back",
      subhead:
        "Pick up where you left off — or ask the ChamberBot something new. It remembers the chamber; it doesn't track you.",
    };
  }

  switch (timeOfDay) {
    case "morning":
      return {
        badge: "Good morning",
        subhead:
          "Start the day with the chamber. Ask the ChamberBot about today's events, members, or programs.",
      };
    case "afternoon":
      return {
        badge: "Good afternoon",
        subhead:
          "Ask anything about Medina County businesses, chamber events, membership, or programs.",
      };
    case "evening":
      return {
        badge: "Good evening",
        subhead:
          "The office is quieting down — the ChamberBot is still up. Ask it anything about the chamber.",
      };
    case "night":
      return {
        badge: "Working late?",
        subhead:
          "The office is closed, but the ChamberBot is awake. Ask anything about the chamber.",
      };
    default:
      return {
        badge: "AI · Powered",
        subhead:
          "Ask anything about Medina County businesses, chamber events, membership, or programs.",
      };
  }
}

export function HolographicChamber() {
  const [sceneState, setSceneState] = useState<SceneState>("idle");
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [inputValue, setInputValue] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const { isReturning, timeOfDay, ready } = useVisitState();
  const greeting = livingGreeting(isReturning, timeOfDay, ready);

  const sendMessage = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || sceneState === "thinking") return;

      setQuery(q);
      setAnswer("");
      setSceneState("thinking");
      setInputValue("");

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: q }],
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) throw new Error("Failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let first = true;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (first) {
            setSceneState("responding");
            first = false;
          }
          const chunk = decoder.decode(value, { stream: true });
          setAnswer((prev) => prev + chunk);
        }

        setSceneState("idle");
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
        setAnswer(
          "Connection disrupted. Try the chat widget in the corner instead.",
        );
        setSceneState("idle");
      }
    },
    [sceneState],
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(inputValue);
  }

  const isThinking = sceneState === "thinking";
  const hasAnswer = Boolean(answer);
  const isAnswering = sceneState === "responding";
  const answerComplete = hasAnswer && !isThinking && !isAnswering;
  const followUps = query ? getFollowUps(query) : [];

  return (
    <section className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24 overflow-x-clip">
      <div className="grid lg:grid-cols-[1fr_auto] gap-10 lg:gap-16 items-center lg:items-start">
        {/* ── Left: Heading + input + response ── */}
        <div className="max-w-2xl order-2 lg:order-1">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cambridge/10 border border-cambridge/20 rounded-full mb-5">
            <span className="w-2 h-2 bg-cambridge rounded-full animate-pulse" />
            <span className="text-caption font-bold text-cambridge uppercase tracking-wider">
              {greeting.badge}
            </span>
          </div>
          <h2 className="text-h2">
            Meet the
            <br />
            <span className="text-cambridge">ChamberBot.</span>
          </h2>
          <p className="text-body-lg text-text-secondary mt-4 leading-relaxed">
            {greeting.subhead}
          </p>

          {/* Input */}
          <form onSubmit={handleSubmit} className="relative mt-8">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask the ChamberBot anything…"
              disabled={isThinking}
              className="
                w-full px-6 py-4 pr-14
                bg-bg-primary border border-border-primary
                rounded-[var(--radius-lg)]
                text-text-primary placeholder:text-text-tertiary
                text-body focus:outline-none
                focus:ring-2 focus:ring-cambridge/40 focus:border-cambridge
                shadow-sm transition-all
                disabled:opacity-60
              "
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isThinking}
              aria-label="Ask the ChamberBot"
              className="
                absolute right-3 top-1/2 -translate-y-1/2
                w-10 h-10 flex items-center justify-center
                bg-oxford hover:bg-oxford/80 disabled:opacity-40
                text-white rounded-[var(--radius-md)]
                transition-colors
              "
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </form>

          {/* Initial prompt chips — only visible before first question */}
          {!hasAnswer && !isThinking && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-caption text-text-tertiary font-bold uppercase tracking-wider mr-1 self-center">
                Try:
              </span>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="jkc-chip"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Response display */}
          {(hasAnswer || isThinking) && (
            <div className="mt-6 p-5 bg-bg-primary border border-border-primary rounded-[var(--radius-lg)] shadow-sm">
              {/* User's question */}
              {query && (
                <div className="flex items-start gap-3 pb-4 border-b border-border-secondary">
                  <div className="jkc-avatar jkc-avatar--user" aria-hidden="true">
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-7 9a7 7 0 1 1 14 0H3z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-caption text-text-tertiary font-bold uppercase tracking-wider">
                      You asked
                    </p>
                    <p className="text-body-sm text-text-primary mt-1 italic">
                      &ldquo;{query}&rdquo;
                    </p>
                  </div>
                </div>
              )}

              {/* ChamberBot's reply */}
              <div className="flex items-start gap-3 pt-4">
                <div className="jkc-avatar jkc-avatar--jackie" aria-hidden="true">
                  <span className="text-[11px] font-bold">CB</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-caption text-cambridge font-bold uppercase tracking-wider">
                    ChamberBot
                  </p>
                  {hasAnswer ? (
                    <p
                      className="text-body-sm text-text-primary mt-1 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(answer),
                      }}
                    />
                  ) : (
                    <span
                      className="mt-2 inline-flex gap-1 items-center py-1"
                      aria-label="ChamberBot is thinking"
                      role="status"
                    >
                      <span className="w-1.5 h-1.5 bg-cambridge rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-cambridge rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-cambridge rounded-full animate-bounce [animation-delay:300ms]" />
                    </span>
                  )}
                </div>
              </div>

              {/* Follow-up chips — only when answer is fully delivered */}
              {answerComplete && followUps.length > 0 && (
                <div className="mt-5 pt-4 border-t border-border-secondary">
                  <p className="text-caption text-text-tertiary font-bold uppercase tracking-wider mb-2">
                    Keep going
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {followUps.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="jkc-chip jkc-chip--follow"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reset after response */}
          {answerComplete && (
            <button
              onClick={() => {
                setAnswer("");
                setQuery("");
                setSceneState("idle");
              }}
              className="mt-4 text-caption text-text-tertiary hover:text-text-primary font-bold transition-colors"
            >
              ← Start over
            </button>
          )}
        </div>

        {/* ── Right: Mascot character ── */}
        <div className="jkc-jackie-col order-1 lg:order-2 flex justify-center">
          <div className="jkc-stage">
            <ChamberBotMascot
              state={sceneState}
              className="w-48 sm:w-56 lg:w-72"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
