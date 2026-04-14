"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { MemberCard } from "@/components/MemberCard";
import { type Member } from "@/data/members";

interface DirectoryClientProps {
  members: Member[];
  categories: string[];
}

function DirectoryClientInner({ members, categories }: DirectoryClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [activeCategory, setActiveCategory] = useState<string | null>(
    searchParams.get("category") ?? null
  );

  // Sync URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (activeCategory) params.set("category", activeCategory);
    const qs = params.toString();
    router.replace(pathname + (qs ? `?${qs}` : ""), { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, activeCategory]);

  const filtered = useMemo(() => {
    let result = members;

    if (activeCategory) {
      result = result.filter((m) => m.categories.includes(activeCategory));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.address.toLowerCase().includes(q) ||
          m.categories.some((c) => c.toLowerCase().includes(q)) ||
          m.description.toLowerCase().includes(q)
      );
    }

    // Visibility Plus members always sort to the top
    return [...result].sort((a, b) => a.membershipTier - b.membershipTier);
  }, [members, search, activeCategory]);

  const isFiltered = !!search.trim() || !!activeCategory;

  function reset() {
    setSearch("");
    setActiveCategory(null);
  }

  return (
    <div>
      {/* ── Search + Filter Bar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary pointer-events-none"
            viewBox="0 0 16 16" fill="currentColor"
          >
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.099zm-5.242 1.156a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, category, or keyword…"
            className="
              w-full pl-10 pr-4 py-3
              bg-bg-primary border border-border-primary
              rounded-[var(--radius-md)]
              text-body-sm text-text-primary placeholder:text-text-tertiary
              focus:outline-none focus:ring-2 focus:ring-cambridge/40 focus:border-cambridge
              transition-colors
            "
          />
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
            viewBox="0 0 16 16" fill="currentColor"
          >
            <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
          </svg>
        </div>
      </div>

      {/* ── Results bar ── */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-caption text-text-tertiary">
          {isFiltered ? (
            <>
              <span className="font-bold text-text-primary">{filtered.length}</span>
              {" "}of {members.length} members
              {activeCategory && (
                <> in <span className="text-cambridge">{activeCategory}</span></>
              )}
            </>
          ) : (
            <><span className="font-bold text-text-primary">{members.length}</span> member businesses</>
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

      {/* ── Member Grid ── */}
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
            Try a different search term or category.
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
