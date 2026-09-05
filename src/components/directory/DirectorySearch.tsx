"use client";

import { useState, type RefObject } from "react";
import { RotatingPlaceholder } from "./RotatingPlaceholder";

const EXAMPLE_PROMPTS = [
  "leaky roof, accept insurance",
  "B2B marketing agency that does video",
  "caterer for a 50-person event",
  "commercial HVAC contractor",
  "physical therapist near Brunswick",
  "lawn care for a rental property",
] as const;

const SUGGESTION_CHIPS = [
  "Roofers",
  "Insurance",
  "Restaurants",
] as const;

interface DirectorySearchProps {
  /** Controlled input value. */
  query: string;
  /** Called on every keystroke. */
  onQueryChange: (next: string) => void;
  /** Called when the user clicks a suggestion chip. */
  onSuggestionClick: (text: string) => void;
  /** Show the spinner inside the field while a search is in flight. */
  isSearching?: boolean;
  /** Forwarded to the <input>. The directory swaps between two instances of
   *  this component (browse band vs results view), which unmounts the field
   *  mid-keystroke; DirectoryClient uses this ref to restore focus. */
  inputRef?: RefObject<HTMLInputElement | null>;
}

/**
 * DirectorySearch — the "describe what you need" semantic search field with
 * its rotating example placeholder and suggestion chips.
 *
 * Lives outside the hero (in the Browse band on the landing, and at the top
 * of the results view) so search sits alongside the browsing tools and stays
 * reachable in every directory state, including after a search has been run.
 */
export function DirectorySearch({
  query,
  onQueryChange,
  onSuggestionClick,
  isSearching = false,
  inputRef,
}: DirectorySearchProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="max-w-2xl">
      <RotatingPlaceholder prompts={EXAMPLE_PROMPTS} paused={focused || !!query}>
        {(current) => (
          <div className="relative">
            <svg
              className="absolute left-f21 top-1/2 -translate-y-1/2 w-f21 h-f21 text-text-tertiary pointer-events-none"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.099zm-5.242 1.156a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={current}
              aria-label="Search chamber members"
              className="
                w-full pl-f55 pr-f55 py-f21
                bg-bg-primary border-2 border-border-primary
                rounded-[var(--radius-lg)]
                text-body text-text-primary placeholder:text-text-tertiary
                focus:outline-none focus:border-cambridge focus:ring-4 focus:ring-cambridge/15
                transition-colors
              "
            />
            {isSearching && (
              <div className="absolute right-f21 top-1/2 -translate-y-1/2">
                <span
                  role="status"
                  aria-label="Searching"
                  className="block w-f21 h-f21 border-2 border-border-primary border-t-cambridge rounded-full animate-spin"
                />
              </div>
            )}
          </div>
        )}
      </RotatingPlaceholder>

      {!query.trim() && (
        <div
          role="group"
          aria-label="Suggested searches"
          className="mt-f13 flex flex-wrap items-center gap-f8"
        >
          <span className="text-caption text-text-tertiary">Try:</span>
          {SUGGESTION_CHIPS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSuggestionClick(s)}
              className="
                text-caption px-f13 py-f5
                bg-bg-secondary border border-border-secondary
                rounded-full
                text-text-secondary hover:text-text-primary hover:border-border-primary
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cambridge focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary
                transition-colors duration-200
              "
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
