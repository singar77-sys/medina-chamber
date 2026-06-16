"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { MemberCard } from "@/components/MemberCard";
import { DirectoryHero } from "@/components/directory/DirectoryHero";
import { IndustryChipStrip } from "@/components/directory/IndustryChipStrip";
import { BrowseBand } from "@/components/directory/BrowseBand";
import { type Member } from "@/data/members";

interface DirectoryClientProps {
  members: Member[];
  /** Full category list sorted by member count (descending). */
  industries: ReadonlyArray<{ category: string; count: number }>;
}

/** How many industry chips show before the visitor expands to all. */
const TOP_INDUSTRIES = 15;

// ── Client-side keyword fallback (used if /api/search errors out) ───
function keywordFilter(members: Member[], q: string): Member[] {
  const query = q.toLowerCase().trim();
  if (!query) return members;
  return members.filter(
    (m) =>
      m.name.toLowerCase().includes(query) ||
      m.address.toLowerCase().includes(query) ||
      m.categories.some((c) => c.toLowerCase().includes(query)) ||
      m.description.toLowerCase().includes(query),
  );
}

function DirectoryClientInner({ members, industries }: DirectoryClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [activeCategory, setActiveCategory] = useState<string | null>(
    searchParams.get("category") ?? null,
  );
  const [showAll, setShowAll] = useState(searchParams.get("all") === "1");

  const [semanticSlugs, setSemanticSlugs] = useState<string[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const topIndustries = industries.slice(0, TOP_INDUSTRIES);
  const browseIndustries = showAllCategories ? industries : topIndustries;

  // Refine bar stays compact (top 10), but if the active category is a
  // rare one (picked from the expanded list or a deep link), prepend it
  // so its chip is visible and deselectable.
  const refineIndustries =
    activeCategory && !topIndustries.some((i) => i.category === activeCategory)
      ? [
          industries.find((i) => i.category === activeCategory) ?? {
            category: activeCategory,
            count: 0,
          },
          ...topIndustries,
        ]
      : topIndustries;

  // Last query string this component wrote (or adopted). Lets the
  // URL→state effect tell our own router.replace echoes apart from real
  // navigations (nav link, back/forward, command palette).
  const lastSyncedQs = useRef(searchParams.toString());
  const urlWriteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // State → URL, debounced. Typing doesn't spam router.replace per
  // keystroke; the URL settles 250ms after the last change. Debouncing
  // also guarantees any searchParams change that differs from
  // lastSyncedQs is a real navigation, not a stale echo of our own write.
  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (activeCategory) params.set("category", activeCategory);
    if (showAll && !search.trim() && !activeCategory) params.set("all", "1");
    const qs = params.toString();
    if (qs === lastSyncedQs.current) return;
    urlWriteTimer.current = setTimeout(() => {
      lastSyncedQs.current = qs;
      router.replace(pathname + (qs ? `?${qs}` : ""), { scroll: false });
    }, 250);
    return () => {
      if (urlWriteTimer.current) clearTimeout(urlWriteTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeCategory, showAll]);

  // URL → state. Without this, state only reads the URL at mount: clicking
  // a nav/footer link to the bare directory while filtered left the old
  // search stuck in the box with the results still filtered (and the next
  // keystroke wrote the stale filter back into the URL). Adopting the
  // params on real navigations keeps the URL authoritative both ways.
  useEffect(() => {
    const qs = searchParams.toString();
    if (qs === lastSyncedQs.current) return; // our own echo
    if (urlWriteTimer.current) clearTimeout(urlWriteTimer.current);
    lastSyncedQs.current = qs;
    /* eslint-disable react-hooks/set-state-in-effect */
    setSearch(searchParams.get("q") ?? "");
    setActiveCategory(searchParams.get("category") ?? null);
    setShowAll(searchParams.get("all") === "1");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [searchParams]);

  // Debounced semantic search
  useEffect(() => {
    const q = search.trim();
    if (!q) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSemanticSlugs(null);
      setIsSearching(false);
      setSearchError(false);
      abortRef.current?.abort();
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(false);
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q, topK: 20, categoryFilter: activeCategory }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`${res.status}`);
        const data: { results: { slug: string }[] } = await res.json();
        setSemanticSlugs(data.results.map((r) => r.slug));
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        setSemanticSlugs(null);
        setSearchError(true);
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, activeCategory]);

  const filtered = useMemo(() => {
    if (semanticSlugs && search.trim()) {
      const bySlug = new Map(members.map((m) => [m.chamberSlug, m]));
      return semanticSlugs
        .map((slug) => bySlug.get(slug))
        .filter((m): m is Member => !!m);
    }
    let result = members;
    if (activeCategory) {
      result = result.filter((m) => m.categories.includes(activeCategory));
    }
    if (search.trim()) {
      result = keywordFilter(result, search);
    }
    if (!search.trim() && !activeCategory) {
      return [...result].sort((a, b) => a.membershipTier - b.membershipTier);
    }
    return result;
  }, [members, search, activeCategory, semanticSlugs]);

  const isFiltered = !!search.trim() || !!activeCategory || showAll;

  function reset() {
    setSearch("");
    setActiveCategory(null);
    setSemanticSlugs(null);
    setShowAll(false);
  }

  /**
   * Search and category are mutually exclusive intents: picking one
   * clears the other. Without this they silently AND together and
   * return zero results (e.g. category "Employee Benefits" lingering
   * under a new "Roofers" search, or q="roofers" under a fresh
   * "Insurance" chip click). Deselecting a chip (category=null) keeps
   * the search as-is.
   */
  function selectCategory(category: string | null) {
    setActiveCategory(category);
    if (category) setSearch("");
  }

  /** New search input (typing or a suggestion chip) drops any category. */
  function startSearch(next: string) {
    setSearch(next);
    if (next.trim() && activeCategory) setActiveCategory(null);
  }

  return (
    <>
      <DirectoryHero
        query={search}
        onQueryChange={startSearch}
        onSuggestionClick={startSearch}
        isSearching={isSearching}
      />

      {!isFiltered ? (
        // ── BROWSE MODE ──────────────────────────────
        <BrowseBand
          industries={industries}
          visibleIndustries={browseIndustries}
          memberCount={members.length}
          active={activeCategory}
          onSelect={selectCategory}
          onSeeAll={() => setShowAll(true)}
          expanded={showAllCategories}
          onToggleExpand={() => setShowAllCategories((v) => !v)}
        />
      ) : (
        // ── RESULTS MODE ─────────────────────────────
        <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f34">
          <IndustryChipStrip
            industries={refineIndustries}
            totalCount={industries.length}
            active={activeCategory}
            onSelect={selectCategory}
            variant="refine"
          />

          {/* Active filters — every applied filter is visible and
              individually removable, so nothing can get invisibly stuck. */}
          <div className="mt-f21 flex flex-wrap items-center gap-x-f13 gap-y-f8">
            <p className="text-caption text-text-tertiary shrink-0">
              <span className="font-bold text-text-primary">{filtered.length}</span>{" "}
              of {members.length} members
              {search.trim() && !searchError && semanticSlugs && (
                <span className="ml-2 text-cambridge">· smart match</span>
              )}
              {searchError && (
                <span className="ml-2 text-text-tertiary">· keyword match</span>
              )}
            </p>

            {search.trim() && (
              <FilterPill
                label={`“${search.trim()}”`}
                onRemove={() => setSearch("")}
              />
            )}
            {activeCategory && (
              <FilterPill
                label={activeCategory}
                onRemove={() => setActiveCategory(null)}
              />
            )}
            {showAll && !search.trim() && !activeCategory && (
              <FilterPill label="All members" onRemove={() => setShowAll(false)} />
            )}

            <button
              onClick={reset}
              type="button"
              className="ml-auto text-caption text-text-tertiary hover:text-accent focus-visible:outline-none focus-visible:text-accent focus-visible:ring-2 focus-visible:ring-cambridge/40 focus-visible:rounded underline underline-offset-2 transition-colors duration-200"
            >
              Clear all
            </button>
          </div>

          {filtered.length > 0 ? (
            <div className="mt-f13 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-f13">
              {filtered.map((member) => (
                <MemberCard key={member.chamberSlug} member={member} />
              ))}
            </div>
          ) : (
            <div className="mt-f55 text-center">
              <p className="text-h4 text-text-secondary">No members found</p>
              <p className="text-body-sm text-text-tertiary mt-f8">
                Try rephrasing — describe the service you need.
              </p>
              <button
                onClick={() => {
                  // Honest label: actually land on the full member list,
                  // not back on the browse landing.
                  setSearch("");
                  setActiveCategory(null);
                  setSemanticSlugs(null);
                  setShowAll(true);
                }}
                type="button"
                className="
                  mt-f21 inline-flex items-center px-f21 py-f13
                  bg-bg-secondary border border-border-primary
                  text-text-primary text-body-sm font-bold
                  rounded-[var(--radius-md)] hover:border-cambridge
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cambridge focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary
                  transition-colors duration-200
                "
              >
                Show all members
              </button>
            </div>
          )}
        </section>
      )}
    </>
  );
}

/** Removable pill showing one active filter (query, category, or all). */
function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className="
        inline-flex items-center gap-f5
        pl-f13 pr-f5 py-f5 rounded-full
        bg-cambridge/10 border border-cambridge/40
        text-body-sm text-text-primary
      "
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="
          flex items-center justify-center w-f21 h-f21 rounded-full
          text-text-secondary hover:text-text-primary hover:bg-cambridge/20
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cambridge
          transition-colors duration-200
        "
      >
        <span aria-hidden="true">×</span>
      </button>
    </span>
  );
}

export function DirectoryClient(props: DirectoryClientProps) {
  return (
    <Suspense>
      <DirectoryClientInner {...props} />
    </Suspense>
  );
}
