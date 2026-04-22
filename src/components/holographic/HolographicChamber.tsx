"use client";

import { useState } from "react";
import { ChamberBotMascot } from "./ChamberBotMascot";
import { ChamberBotPortal } from "./ChamberBotPortal";
import { useVisitState, type TimeOfDay } from "@/lib/useVisitState";

const SUGGESTIONS = [
  "Find a local plumber",
  "When is the next event?",
  "How much does membership cost?",
  "Who does commercial printing?",
  "Tell me about the Safety Council",
];

/**
 * Build the living-homepage greeting based on visit state + time.
 * Returns two strings: an eyebrow badge label and the subhead body.
 */
function livingGreeting(
  isReturning: boolean,
  timeOfDay: TimeOfDay | null,
  ready: boolean,
): { badge: string; subhead: string } {
  // SSR / pre-hydration — neutral default to avoid flash
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

/**
 * ChamberBot intro section for the homepage.
 *
 * Hero-only: badge, headline, subhead, mascot, input, suggestion chips.
 * The moment a question lands (form submit OR chip click) we open the
 * full-viewport ChamberBotPortal and let it own the conversation. This
 * section never shows a streaming response inline — it's purely the
 * on-ramp into the portal experience.
 */
export function HolographicChamber() {
  const [inputValue, setInputValue] = useState("");
  const [portalQuery, setPortalQuery] = useState<string | null>(null);
  const { isReturning, timeOfDay, ready } = useVisitState();
  const greeting = livingGreeting(isReturning, timeOfDay, ready);

  function ask(text: string) {
    const q = text.trim();
    if (!q) return;
    setPortalQuery(q);
    // Keep the typed text around in case the user closes the portal —
    // they'll see their last question still in the input, ready to edit.
    setInputValue(q);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    ask(inputValue);
  }

  function handleClose() {
    setPortalQuery(null);
  }

  return (
    <>
      {/* Hidden on phones — the floating ChatWidget in the bottom-right
          corner covers the mobile chat surface. This inline section is
          the tablet+ "meet the bot" hero moment. */}
      <section className="hidden md:block mx-auto max-w-5xl px-6 lg:px-8 py-20 lg:py-28 overflow-x-clip">
        <div className="flex flex-col items-center text-center">
          {/* Badge — Mistrully script accent above the headline.
              Script fonts place their baseline above the UPM center
              of the box, so a naive flex-center leaves the text
              riding high in the pill. Nudging the span down ~3px via
              translateY lands the visual x-height on the pill's
              optical center without changing layout height. */}
          <div className="inline-flex items-center gap-2.5 px-5 py-1.5 bg-cambridge/10 border border-cambridge/20 rounded-full mb-6">
            <span className="w-2 h-2 bg-cambridge rounded-full animate-pulse" />
            <span
              className="font-script text-cambridge text-[1.4rem] leading-none inline-block"
              style={{ transform: "translateY(3px)" }}
            >
              {greeting.badge}
            </span>
          </div>

          {/* Headline */}
          <h2
            className="
              font-display font-bold
              leading-[0.92] tracking-tight
              text-[clamp(2.75rem,6.2vw,5.5rem)]
            "
          >
            Meet the
            <br />
            <span className="text-cambridge">ChamberBot.</span>
          </h2>

          {/* Subhead */}
          <p className="text-body-lg text-text-secondary mt-6 max-w-2xl leading-relaxed">
            {greeting.subhead}
          </p>

          {/* Mascot — always idle on the page; the portal owns the active state */}
          <div className="jkc-mascot-wrap mt-10 lg:mt-12">
            <ChamberBotMascot state="idle" className="w-full" />
          </div>

          {/* Input + suggestion chips */}
          <div className="w-full max-w-2xl mt-10 lg:mt-12 text-left">
            <form onSubmit={handleSubmit} className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask the ChamberBot anything…"
                aria-label="Ask the ChamberBot — opens a full-screen conversation"
                className="
                  w-full px-6 py-4 pr-14
                  bg-bg-primary border border-border-primary
                  rounded-[var(--radius-lg)]
                  text-text-primary placeholder:text-text-tertiary
                  text-body focus:outline-none
                  focus:ring-2 focus:ring-cambridge/40 focus:border-cambridge
                  shadow-sm transition-all
                "
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                aria-label="Open the ChamberBot portal and ask this question"
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

            {/* Suggestion chips — always visible on the hero; clicking
                opens the portal with that question. */}
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <span className="text-caption text-text-tertiary font-bold uppercase tracking-wider mr-1 self-center">
                Try:
              </span>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="jkc-chip"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* The full-viewport experience — only renders (via createPortal to
          document.body) while portalQuery is non-null. */}
      <ChamberBotPortal
        open={portalQuery !== null}
        initialQuery={portalQuery}
        onClose={handleClose}
      />
    </>
  );
}
