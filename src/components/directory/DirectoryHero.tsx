"use client";

import { useState } from "react";
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
  "Marketing",
] as const;

interface DirectoryHeroProps {
  /** Controlled input value. */
  query: string;
  /** Called on every keystroke. */
  onQueryChange: (next: string) => void;
  /** Called when the user clicks a suggestion chip. */
  onSuggestionClick: (text: string) => void;
  /** Show the spinner inside the field while a search is in flight. */
  isSearching?: boolean;
}

export function DirectoryHero({
  query,
  onQueryChange,
  onSuggestionClick,
  isSearching = false,
}: DirectoryHeroProps) {
  const [focused, setFocused] = useState(false);

  return (
    <section className="mx-auto max-w-5xl px-6 lg:px-8 pt-f89 pb-f55">
      <div className="text-center">
        <p className="text-overline text-cambridge mb-f8">Member Directory</p>
        <h1 className="text-display leading-none">
          <span className="block">Find what you need</span>
          <span className="block text-accent">in Medina</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl mx-auto">
          Ask in plain English. Smart search matches your need to the right chamber member.
        </p>
      </div>

      <div className="mt-f34 max-w-3xl mx-auto">
        <RotatingPlaceholder prompts={EXAMPLE_PROMPTS} paused={focused || !!query}>
          {(current) => (
            <div className="relative">
              <svg
                className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary pointer-events-none"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.099zm-5.242 1.156a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={current}
                aria-label="Search chamber members"
                className="
                  w-full pl-14 pr-14 py-f21
                  bg-bg-primary border-2 border-border-primary
                  rounded-[var(--radius-lg)]
                  text-body text-text-primary placeholder:text-text-tertiary
                  focus:outline-none focus:border-cambridge focus:ring-4 focus:ring-cambridge/15
                  transition-colors
                "
              />
              {isSearching && (
                <div className="absolute right-5 top-1/2 -translate-y-1/2">
                  <span
                    role="status"
                    aria-label="Searching"
                    className="block w-5 h-5 border-2 border-border-primary border-t-cambridge rounded-full animate-spin"
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
            className="mt-f13 flex flex-wrap items-center justify-center gap-f8"
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
    </section>
  );
}
