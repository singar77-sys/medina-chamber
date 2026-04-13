"use client";

import { useState, useRef } from "react";

const suggestions = [
  "Find a local plumber",
  "When is the next networking event?",
  "How much does membership cost?",
  "Who does commercial printing?",
];

/**
 * Inline AI prompt for the homepage — not a chatbot widget,
 * a first-class content section. Sends one question and shows
 * the streamed response inline.
 */
export function HomeAIPrompt() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function handleSubmit(text: string) {
    const q = text.trim();
    if (!q || isLoading) return;

    setQuery(q);
    setAnswer("");
    setIsLoading(true);

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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setAnswer((prev) => prev + chunk);
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      setAnswer("Something went wrong. Try the chat widget in the corner.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = (e.target as HTMLFormElement).querySelector("input") as HTMLInputElement;
    handleSubmit(input.value);
    input.value = "";
  }

  return (
    <div>
      {/* Input */}
      <form onSubmit={handleFormSubmit} className="relative">
        <input
          type="text"
          placeholder="Ask ChamberBot anything…"
          className="
            w-full px-6 py-4 pr-14
            bg-white/10 border border-white/20
            backdrop-blur-sm
            rounded-[var(--radius-lg)]
            text-white placeholder:text-white/40
            text-body focus:outline-none
            focus:ring-2 focus:ring-cambridge/50 focus:border-cambridge/50
            transition-all
          "
        />
        <button
          type="submit"
          aria-label="Ask"
          className="
            absolute right-3 top-1/2 -translate-y-1/2
            w-9 h-9 flex items-center justify-center
            bg-cambridge hover:bg-cambridge/80
            text-white rounded-[var(--radius-md)]
            transition-colors
          "
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </form>

      {/* Quick suggestions */}
      {!answer && !isLoading && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => handleSubmit(s)}
              className="
                px-3 py-1.5 text-caption font-bold
                bg-white/5 border border-white/10
                text-white/60 hover:text-white hover:border-white/30
                rounded-full transition-colors
              "
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Answer */}
      {(answer || isLoading) && (
        <div className="mt-4 p-5 bg-white/5 border border-white/10 backdrop-blur-sm rounded-[var(--radius-lg)]">
          {query && (
            <p className="text-caption text-cambridge font-bold mb-2">
              &ldquo;{query}&rdquo;
            </p>
          )}
          {answer ? (
            <p className="text-body-sm text-white/80 leading-relaxed whitespace-pre-wrap">
              {answer}
            </p>
          ) : (
            <span className="flex gap-1 items-center py-1">
              <span className="w-1.5 h-1.5 bg-cambridge rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-cambridge rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-cambridge rounded-full animate-bounce [animation-delay:300ms]" />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
