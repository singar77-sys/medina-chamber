"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { searchablePages } from "@/lib/navigation";

export function SearchOverlay({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      // Small delay to let the DOM render
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Filter results
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return searchablePages.slice(0, 8); // Show popular pages when empty
    return searchablePages.filter(
      (page) =>
        page.label.toLowerCase().includes(q) ||
        page.keywords.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div
      className={`
        fixed inset-0 z-50
        transition-opacity duration-200
        ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
      `}
    >
      {/* Backdrop — button for native keyboard support */}
      <button
        type="button"
        aria-label="Close search"
        className="absolute inset-0 bg-oxford/60 backdrop-blur-sm cursor-default"
        onClick={onClose}
      />

      {/* Search panel */}
      <div
        className={`
          relative mx-auto mt-[10vh] w-full max-w-xl px-6
          transition-all duration-200 ease-out
          ${isOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}
        `}
      >
        <div className="bg-bg-primary border border-border-primary rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] overflow-hidden">
          {/* Input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border-secondary">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className="text-text-tertiary flex-shrink-0"
            >
              <path
                d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16ZM19 19l-4.35-4.35"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages, programs, events..."
              aria-label="Search"
              className="
                w-full bg-transparent
                text-body text-text-primary
                placeholder:text-text-tertiary
                outline-none
                focus-visible:ring-2 focus-visible:ring-cambridge/60
                focus-visible:rounded-sm
              "
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-text-tertiary hover:text-text-primary transition-colors flex-shrink-0"
                aria-label="Clear search"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M4 4l8 8M12 4l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-[50vh] overflow-y-auto py-2">
            {results.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-body-sm text-text-tertiary">
                  No results for &ldquo;{query}&rdquo;
                </p>
                <p className="text-caption mt-1">
                  Try &ldquo;events&rdquo;, &ldquo;directory&rdquo;, or
                  &ldquo;join&rdquo;
                </p>
              </div>
            ) : (
              <>
                {!query && (
                  <p className="px-5 py-2 text-overline">Popular Pages</p>
                )}
                {results.map((page) => (
                  <Link
                    key={page.href}
                    href={page.href}
                    onClick={onClose}
                    className="
                      flex items-center gap-3 px-5 py-3
                      hover:bg-bg-secondary
                      transition-colors
                    "
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="text-text-tertiary flex-shrink-0"
                    >
                      <path
                        d="M6 3l5 5-5 5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="text-body-sm text-text-primary font-bold">
                      {page.label}
                    </span>
                  </Link>
                ))}
              </>
            )}
          </div>

          {/* Footer hint */}
          <div className="px-5 py-3 border-t border-border-secondary">
            <p className="text-caption text-center">
              <kbd className="px-1.5 py-0.5 bg-bg-tertiary rounded text-[0.7rem] font-bold">
                ESC
              </kbd>{" "}
              to close
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
