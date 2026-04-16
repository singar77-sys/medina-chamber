"use client";

import { useState, useRef, useCallback } from "react";
import { ChamberBotMascot } from "./ChamberBotMascot";
import { renderMarkdown } from "@/lib/markdown";

type SceneState = "idle" | "listening" | "thinking" | "responding";

const SUGGESTIONS = [
  "Find a local plumber",
  "When is the next event?",
  "How much does membership cost?",
  "Who does commercial printing?",
];

/**
 * ChamberBot intro section for the homepage.
 * Side-by-side: robot character + chat input.
 * The robot reacts to chat state (idle/thinking/responding) via
 * pulse speed on its chest core and antenna.
 */
export function HolographicChamber() {
  const [sceneState, setSceneState] = useState<SceneState>("idle");
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [inputValue, setInputValue] = useState("");
  const abortRef = useRef<AbortController | null>(null);

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

  return (
    <section className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24 overflow-x-clip">
      <div className="grid lg:grid-cols-[1fr_auto] gap-10 lg:gap-16 items-center">
        {/* ── Left: Heading + input + response ── */}
        <div className="max-w-2xl order-2 lg:order-1">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cambridge/10 border border-cambridge/20 rounded-full mb-5">
            <span className="w-2 h-2 bg-cambridge rounded-full animate-pulse" />
            <span className="text-caption font-bold text-cambridge uppercase tracking-wider">
              AI · Powered
            </span>
          </div>
          <h2 className="text-h2">
            Meet Jackie,
            <br />
            <span className="text-cambridge">the ChamberBot.</span>
          </h2>
          <p className="text-body-lg text-text-secondary mt-4 leading-relaxed">
            Ask anything about Medina County businesses, chamber events,
            membership, or programs. Jackie knows about every member and
            can help answer questions.
          </p>

          {/* Input */}
          <form onSubmit={handleSubmit} className="relative mt-8">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask Jackie anything…"
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
              aria-label="Ask Jackie"
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

          {/* Suggestion chips */}
          {!answer && !isThinking && (
            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="
                    px-3 py-1.5 text-caption font-bold
                    bg-bg-primary border border-border-secondary
                    text-text-tertiary hover:text-text-primary hover:border-border-primary
                    rounded-full transition-colors
                  "
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Response display */}
          {(answer || isThinking) && (
            <div className="mt-6 p-5 bg-bg-primary border border-border-primary rounded-[var(--radius-lg)] shadow-sm">
              {query && (
                <p className="text-caption text-cambridge font-bold mb-2">
                  &ldquo;{query}&rdquo;
                </p>
              )}
              {answer ? (
                <p
                  className="text-body-sm text-text-primary leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(answer) }}
                />
              ) : (
                <span className="flex gap-1 items-center py-1">
                  <span className="w-1.5 h-1.5 bg-cambridge rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-cambridge rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-cambridge rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
              )}
            </div>
          )}

          {/* Reset after response */}
          {answer && (
            <button
              onClick={() => {
                setAnswer("");
                setQuery("");
                setSceneState("idle");
              }}
              className="mt-4 text-caption text-cambridge hover:text-cambridge/80 font-bold transition-colors"
            >
              Ask another question →
            </button>
          )}
        </div>

        {/* ── Right: Mascot character ── */}
        <div className="order-1 lg:order-2 flex justify-center">
          <ChamberBotMascot
            state={sceneState}
            className="w-48 sm:w-56 lg:w-72"
          />
        </div>
      </div>
    </section>
  );
}
