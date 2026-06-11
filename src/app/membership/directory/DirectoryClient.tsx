"use client";

import { useState, useMemo, useEffect, useRef, Suspense, type ReactNode } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { MemberCard } from "@/components/MemberCard";
import { DirectoryHero } from "@/components/directory/DirectoryHero";
import { IndustryChipStrip } from "@/components/directory/IndustryChipStrip";
import { type Member } from "@/data/members";

interface DirectoryClientProps {
  members: Member[];
  topIndustries: ReadonlyArray<{ category: string; count: number }>;
  totalIndustries: number;
  /** Server-rendered Community Investor showcase (passed in via page.tsx). */
  investorsSlot: ReactNode;
  /** Server-rendered City teaser cards (passed in via page.tsx). */
  citiesSlot: ReactNode;
}

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

function DirectoryClientInner({
  members,
  topIndustries,
  totalIndustries,
  investorsSlot,
  citiesSlot,
}: DirectoryClientProps) {
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
  const abortRef = useRef<AbortController | null>(null);

  // Sync URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (activeCategory) params.set("category", activeCategory);
    if (showAll && !search.trim() && !activeCategory) params.set("all", "1");
    const qs = params.toString();
    router.replace(pathname + (qs ? `?${qs}` : ""), { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeCategory, showAll]);

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

  return (
    <>
      <DirectoryHero
        query={search}
        onQueryChange={setSearch}
        onSuggestionClick={(s) => setSearch(s)}
        isSearching={isSearching}
      />

      {!isFiltered ? (
        // ── BROWSE MODE ──────────────────────────────
        <>
          {investorsSlot}
          <IndustryChipStrip
            industries={topIndustries}
            totalCount={totalIndustries}
            active={activeCategory}
            onSelect={setActiveCategory}
            onSeeAll={() => setShowAll(true)}
          />
          {citiesSlot}
          <div className="mx-auto max-w-7xl px-6 lg:px-8 -mt-f21 pb-f34">
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="
                text-caption text-text-tertiary hover:text-accent
                underline underline-offset-4 transition-colors duration-200
                focus-visible:outline-none focus-visible:text-accent
              "
            >
              See all members <span aria-hidden="true">→</span>
            </button>
          </div>
        </>
      ) : (
        // ── RESULTS MODE ─────────────────────────────
        <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f34">
          <IndustryChipStrip
            industries={topIndustries}
            totalCount={totalIndustries}
            active={activeCategory}
            onSelect={setActiveCategory}
          />

          <div className="mt-f21 flex items-center justify-between">
            <p className="text-caption text-text-tertiary">
              <span className="font-bold text-text-primary">{filtered.length}</span>{" "}
              of {members.length} members
              {activeCategory && (
                <>
                  {" "}in <span className="text-cambridge">{activeCategory}</span>
                </>
              )}
              {search.trim() && !searchError && semanticSlugs && (
                <span className="ml-2 text-cambridge">· semantic match</span>
              )}
              {searchError && (
                <span className="ml-2 text-text-tertiary">· keyword fallback</span>
              )}
            </p>
            <button
              onClick={reset}
              type="button"
              className="text-caption text-text-tertiary hover:text-accent focus-visible:outline-none focus-visible:text-accent focus-visible:ring-2 focus-visible:ring-cambridge/40 focus-visible:rounded underline underline-offset-2 transition-colors duration-200"
            >
              Clear filters
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
                onClick={reset}
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

export function DirectoryClient(props: DirectoryClientProps) {
  return (
    <Suspense>
      <DirectoryClientInner {...props} />
    </Suspense>
  );
}
