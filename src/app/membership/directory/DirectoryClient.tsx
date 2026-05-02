"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { MemberCard } from "@/components/MemberCard";
import { type Member } from "@/data/members";

interface DirectoryClientProps {
  members: Member[];
  categories: string[];
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

function DirectoryClientInner({ members, categories }: DirectoryClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [activeCategory, setActiveCategory] = useState<string | null>(
    searchParams.get("category") ?? null,
  );

  // Semantic search state
  const [semanticSlugs, setSemanticSlugs] = useState<string[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Sync URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (activeCategory) params.set("category", activeCategory);
    const qs = params.toString();
    router.replace(pathname + (qs ? `?${qs}` : ""), { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeCategory]);

  // Debounced semantic search
  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setSemanticSlugs(null);
      setIsSearching(false);
      setSearchError(false);
      abortRef.current?.abort();
      return;
    }

    // Abort any in-flight request
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
          body: JSON.stringify({ q, topK: 48, categoryFilter: activeCategory }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`${res.status}`);
        const data: { results: { slug: string }[] } = await res.json();
        setSemanticSlugs(data.results.map((r) => r.slug));
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        // Fall back to client-side keyword filter
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
    // Path 1: semantic search returned ranked slugs — use that order
    if (semanticSlugs && search.trim()) {
      const bySlug = new Map(members.map((m) => [m.chamberSlug, m]));
      const ordered = semanticSlugs
        .map((slug) => bySlug.get(slug))
        .filter((m): m is Member => !!m);
      // semantic API already respects category filter — return as-is
      return ordered;
    }

    // Path 2: either no query, or semantic failed → client filter
    let result = members;
    if (activeCategory) {
      result = result.filter((m) => m.categories.includes(activeCategory));
    }
    if (search.trim()) {
      result = keywordFilter(result, search);
    }
    // When no query, Visibility Plus members sort to top
    if (!search.trim()) {
      return [...result].sort((a, b) => a.membershipTier - b.membershipTier);
    }
    return result;
  }, [members, search, activeCategory, semanticSlugs]);

  const isFiltered = !!search.trim() || !!activeCategory;

  function reset() {
    setSearch("");
    setActiveCategory(null);
    setSemanticSlugs(null);
  }

  return (
    <div>
      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.099zm-5.242 1.156a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ask in plain English, e.g. “leaky roof after storm, takes insurance”"
            className="
              w-full pl-10 pr-10 py-3
              bg-bg-primary border border-border-primary
              rounded-[var(--radius-md)]
              text-body-sm text-text-primary placeholder:text-text-tertiary
              focus:outline-none focus:ring-2 focus:ring-cambridge/40 focus:border-cambridge
              transition-colors
            "
          />
          {/* Loading spinner */}
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <span className="block w-4 h-4 border-2 border-border-primary border-t-cambridge rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Category Select */}
        <div className="relative sm:w-72">
          <select
            aria-label="Filter by category"
            value={activeCategory ?? ""}
            onChange={(e) => setActiveCategory(e.target.value || null)}
            className="
              w-full appearance-none
              pl-4 pr-10 py-3
              bg-bg-primary border border-border-primary
              rounded-[var(--radius-md)]
              text-body-sm text-text-primary
              focus:outline-none focus:ring-2 focus:ring-cambridge/40 focus:border-cambridge
              transition-colors cursor-pointer
            "
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" />
          </svg>
        </div>
      </div>

      {/* Results bar */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-caption text-text-tertiary">
          {isFiltered ? (
            <>
              <span className="font-bold text-text-primary">
                {filtered.length}
              </span>{" "}
              of {members.length} members
              {activeCategory && (
                <>
                  {" "}
                  in <span className="text-cambridge">{activeCategory}</span>
                </>
              )}
              {search.trim() && !searchError && semanticSlugs && (
                <span className="ml-2 text-cambridge">· semantic match</span>
              )}
              {searchError && (
                <span className="ml-2 text-text-tertiary">
                  · keyword fallback
                </span>
              )}
            </>
          ) : (
            <>
              <span className="font-bold text-text-primary">
                {members.length}
              </span>{" "}
              member businesses
            </>
          )}
        </p>

        {isFiltered && (
          <button
            onClick={reset}
            className="
              text-caption text-text-tertiary hover:text-accent
              underline underline-offset-2 transition-colors
            "
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Member Grid */}
      {filtered.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((member) => (
            <MemberCard key={member.chamberSlug} member={member} />
          ))}
        </div>
      ) : (
        <div className="mt-16 text-center">
          <p className="text-h4 text-text-secondary">No members found</p>
          <p className="text-body-sm text-text-tertiary mt-2">
            Try rephrasing, e.g. describe the service you need, not a category.
          </p>
          <button
            onClick={reset}
            className="
              mt-6 inline-flex items-center px-5 py-2.5
              bg-bg-secondary border border-border-primary
              text-text-primary text-body-sm font-bold
              rounded-[var(--radius-md)] hover:border-border-primary
              transition-colors
            "
          >
            Show all members
          </button>
        </div>
      )}
    </div>
  );
}

export function DirectoryClient(props: DirectoryClientProps) {
  return (
    <Suspense>
      <DirectoryClientInner {...props} />
    </Suspense>
  );
}
