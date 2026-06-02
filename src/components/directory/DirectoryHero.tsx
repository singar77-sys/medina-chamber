"use client";

import { useState } from "react";
import Image from "next/image";
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
    <section className="site-hero relative min-h-[60dvh] flex items-end overflow-hidden">
      {/* Background photos — theme-aware */}
      <Image
        src="/images/photos/directory-hero-light.png"
        alt="Downtown Medina historic storefronts"
        fill
        sizes="100vw"
        className="object-cover object-center hero-ken-burns [[data-theme=dark]_&]:hidden"
        priority
        quality={85}
      />
      <Image
        src="/images/photos/directory-hero-dark.png"
        alt="Downtown Medina at twilight"
        fill
        sizes="100vw"
        className="object-cover object-center hero-ken-burns hidden [[data-theme=dark]_&]:block"
        priority
        quality={85}
      />
      {/* Gradient overlay — bottom-up oxford wash */}
      <div className="absolute inset-0 bg-gradient-to-t from-oxford via-oxford/60 to-oxford/15" />
      {/* Top-down cap — darkens upper third */}
      <div className="absolute inset-0 bg-gradient-to-b from-oxford/50 via-oxford/10 to-transparent" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 pb-f89 pt-f144 w-full">
        <div className="max-w-3xl">
          <p className="text-overline text-cambridge mb-f8 tracking-widest">Member Directory</p>
          <h1 className="text-display text-white">
            <span className="block">Find a Local</span>
            <span className="block text-accent">Medina Business</span>
          </h1>
          <p className="text-body-lg text-white/80 mt-f13 max-w-2xl">
            Ask in plain English. Smart search matches your need to the right chamber member.
          </p>

          <div className="mt-f34 max-w-2xl">
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
                    type="text"
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder={current}
                    aria-label="Search chamber members"
                    className="
                      w-full pl-f55 pr-f55 py-f21
                      bg-oxford/60 backdrop-blur-sm border-2 border-white/20
                      rounded-[var(--radius-lg)]
                      text-body text-white placeholder:text-white/50
                      focus:outline-none focus:border-cambridge focus:ring-4 focus:ring-cambridge/25
                      transition-colors
                    "
                  />
                  {isSearching && (
                    <div className="absolute right-f21 top-1/2 -translate-y-1/2">
                      <span
                        role="status"
                        aria-label="Searching"
                        className="block w-f21 h-f21 border-2 border-white/30 border-t-cambridge rounded-full animate-spin"
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
                <span className="text-caption text-white/60">Try:</span>
                {SUGGESTION_CHIPS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onSuggestionClick(s)}
                    className="
                      text-caption px-f13 py-f5
                      bg-white/10 border border-white/20
                      rounded-full
                      text-white/80 hover:text-white hover:border-white/40
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cambridge focus-visible:ring-offset-2 focus-visible:ring-offset-oxford
                      transition-colors duration-200
                    "
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
