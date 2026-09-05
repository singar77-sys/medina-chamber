"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { MemberCard } from "@/components/MemberCard";
import { DirectoryHero } from "@/components/directory/DirectoryHero";
import { DirectorySearch } from "@/components/directory/DirectorySearch";
import { IndustryChipStrip } from "@/components/directory/IndustryChipStrip";
import { BrowseBand } from "@/components/directory/BrowseBand";
import { type Member, isCommunityInvestor, isVisibilityPlus } from "@/data/members";

// Premium-first ordering for browse/category views: Community Investors (the
// logo-header tier) always lead, then Visibility Plus, then everyone else —
// keyed off the authoritative slug sets that also drive the card treatment, so
// a CI card never sorts below a plain one. (DB membershipTier is unreliable.)
function tierRank(m: Member): number {
  if (isCommunityInvestor(m)) return 0;
  if (isVisibilityPlus(m)) return 1;
  return 2;
}

interface DirectoryClientProps {
  members: Member[];
  /** Full category list sorted by member count (descending). */
  industries: ReadonlyArray<{ category: string; count: number }>;
}

/** How many industry chips show before the visitor expands to all. */
const TOP_INDUSTRIES = 16;

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

  // SELECTION of the compact set stays by member count (that's what makes
  // them "top" categories), but every DISPLAYED list reads A→Z — staff
  // expected alphabetical and count-order looked arbitrary (Mark's call,
  // from Stephanie's review).
  const alpha = (
    list: ReadonlyArray<{ category: string; count: number }>,
  ) => [...list].sort((a, b) => a.category.localeCompare(b.category));

  const topIndustries = industries.slice(0, TOP_INDUSTRIES);
  const browseIndustries = alpha(
    showAllCategories ? industries : topIndustries,
  );

  // Refine bar stays compact (top 10), but if the active category is a
  // rare one (picked from the expanded list or a deep link), include it
  // so its chip is visible and deselectable.
  const refineIndustries = alpha(
    activeCategory && !topIndustries.some((i) => i.category === activeCategory)
      ? [
          industries.find((i) => i.category === activeCategory) ?? {
            category: activeCategory,
            count: 0,
          },
          ...topIndustries,
        ]
      : topIndustries,
  );

  // Last query string this component wrote (or adopted). Lets the
  // URL→state effect tell our own history writes apart from real
  // navigations (nav link, back/forward, command palette).
  const lastSyncedQs = useRef(searchParams.toString());
  const urlWriteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // State → URL, debounced. We update the URL with the native
  // window.history.replaceState instead of router.replace: on this
  // force-dynamic route router.replace triggers a full RSC round-trip
  // to the server on every filter change, which re-rendered the tree
  // and made category results flash in then vanish ~250ms after a click.
  // history.replaceState still syncs usePathname/useSearchParams (per
  // the Next docs) so deep links and the URL→state guard keep working —
  // it just doesn't refetch. Debouncing keeps the URL from thrashing
  // mid-keystroke and guarantees any searchParams change differing from
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
      window.history.replaceState(null, "", pathname + (qs ? `?${qs}` : ""));
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

  // null = "a query is typed but the debounced semantic search hasn't
  // resolved yet" — genuinely unknown, NOT the same as zero results.
  // Without this distinction, every keystroke briefly falls through to the
  // naive keyword fallback below (meant only for when /api/search errors)
  // before the real semantic results replace it — for a query like
  // "roofers" that fallback usually finds nothing, so the empty state
  // flashed on screen for the length of the 280ms debounce + fetch.
  const filtered = useMemo((): Member[] | null => {
    if (search.trim()) {
      if (semanticSlugs) {
        const bySlug = new Map(members.map((m) => [m.chamberSlug, m]));
        return semanticSlugs
          .map((slug) => bySlug.get(slug))
          .filter((m): m is Member => !!m)
          // Community Investors first, relevance order preserved within tier
          // (stable sort) — so a CI match never lands below plain results.
          .sort((a, b) => tierRank(a) - tierRank(b));
      }
      if (searchError) {
        let result = members;
        if (activeCategory) {
          result = result.filter((m) => m.categories.includes(activeCategory));
        }
        return keywordFilter(result, search).sort(
          (a, b) => tierRank(a) - tierRank(b) || a.name.localeCompare(b.name),
        );
      }
      return null;
    }
    let result = members;
    if (activeCategory) {
      result = result.filter((m) => m.categories.includes(activeCategory));
    }
    // Community Investors sort first in every browse/category view, then
    // Visibility Plus, then alphabetically — so CI always populate the top of
    // the page. (Search results stay in relevance order, handled above.)
    return [...result].sort(
      (a, b) => tierRank(a) - tierRank(b) || a.name.localeCompare(b.name),
    );
  }, [members, search, activeCategory, semanticSlugs, searchError]);

  const isFiltered = !!search.trim() || !!activeCategory || showAll;

  // Entering a filtered view swaps the tall BrowseBand out for the results
  // grid; CSS scroll anchoring then keeps the below-band sections at the same
  // viewport offset, dumping the user at the BOTTOM of the inserted grid (the
  // "browse all lands at Z" bug). Snap to the top when a filter engages.
  const wasFiltered = useRef(false);

  // The browse band and the results view each render their OWN search input,
  // so the first typed character unmounts the field the visitor is typing in
  // and mounts a different one — focus dropped to <body> and the second
  // keystroke went nowhere (or "/" opened the command palette). Deleting the
  // last character did the same thing in reverse. Keep a ref to whichever
  // input is now mounted and restore focus + caret across the swap. Only
  // typing sets `restoreFocus`, so clicking a category chip or "browse all"
  // does not steal focus (or pop the mobile keyboard).
  const browseSearchRef = useRef<HTMLInputElement>(null);
  const resultsSearchRef = useRef<HTMLInputElement>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (isFiltered !== wasFiltered.current) {
      if (isFiltered) window.scrollTo({ top: 0 });
      if (restoreFocus.current) {
        const el = isFiltered ? resultsSearchRef.current : browseSearchRef.current;
        if (el) {
          el.focus({ preventScroll: true });
          const end = el.value.length;
          el.setSelectionRange(end, end);
        }
      }
    }
    restoreFocus.current = false;
    wasFiltered.current = isFiltered;
  }, [isFiltered]);

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

  /** Typing specifically — flags the effect above to carry focus across the
   *  browse/results swap. Suggestion chips deliberately do not. */
  function handleTypedQuery(next: string) {
    restoreFocus.current = true;
    startSearch(next);
  }

  return (
    <>
      <DirectoryHero />

      {!isFiltered ? (
        // ── BROWSE MODE ──────────────────────────────
        <BrowseBand
          inputRef={browseSearchRef}
          query={search}
          onQueryChange={handleTypedQuery}
          onSuggestionClick={startSearch}
          isSearching={isSearching}
          visibleIndustries={browseIndustries}
          active={activeCategory}
          onSelect={selectCategory}
          onSeeAll={() => setShowAll(true)}
          expanded={showAllCategories}
          onToggleExpand={() => setShowAllCategories((v) => !v)}
        />
      ) : (
        // ── RESULTS MODE ─────────────────────────────
        <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f34">
          {/* Search stays reachable in results so a query can be refined
              without navigating back to the browse landing. */}
          <div className="mb-f21">
            <DirectorySearch
              inputRef={resultsSearchRef}
              query={search}
              onQueryChange={handleTypedQuery}
              onSuggestionClick={startSearch}
              isSearching={isSearching}
            />
          </div>

          <IndustryChipStrip
            industries={refineIndustries}
            active={activeCategory}
            onSelect={selectCategory}
          />

          {/* Active filters — every applied filter is visible and
              individually removable, so nothing can get invisibly stuck. */}
          <div className="mt-f21 flex flex-wrap items-center gap-x-f13 gap-y-f8">
            <p className="text-caption text-text-tertiary shrink-0">
              <span className="font-bold text-text-primary">
                {activeCategory ?? "All members"}
              </span>
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

          {filtered === null ? (
            // Waiting on the debounced semantic search — skeleton, not
            // an empty state, so a real result never gets mistaken for
            // "no members found" mid-search.
            <div
              className="mt-f13 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-f13"
              aria-hidden="true"
            >
              {Array.from({ length: 8 }, (_, i) => (
                <div
                  key={i}
                  className="h-40 rounded-[var(--radius-lg)] border border-border-secondary bg-bg-secondary animate-pulse"
                />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            // Community Investors (logo-header cards) render in their own rows,
            // then everyone else (name-forward text cards) in theirs — so a tall
            // logo card and a short text card never share a row and stretch the
            // text card to match. Order (CI first) is already set by the sort.
            <div className="mt-f13 flex flex-col gap-f13">
              {[
                filtered.filter(isCommunityInvestor),
                filtered.filter((m) => !isCommunityInvestor(m)),
              ]
                .filter((group) => group.length > 0)
                .map((group, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-f13"
                  >
                    {group.map((member) => (
                      <MemberCard key={member.chamberSlug} member={member} />
                    ))}
                  </div>
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
