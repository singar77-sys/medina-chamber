import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  activeCommunities,
  getCommunityBySlug,
  getMembersByCity,
} from "@/data/communities";
import { getUpcomingEvents } from "@/data/events";
import { isVisibilityPlus } from "@/data/members";

// ── Static generation ─────────────────────────────────────────────
export function generateStaticParams() {
  return activeCommunities.map((c) => ({ slug: c.slug }));
}

// ── Per-page metadata ─────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const community = getCommunityBySlug(slug);
  if (!community) return { title: "Community Not Found" };

  const title = `${community.name} Ohio Business Resources & Chamber Members`;
  const description = `Find chamber member businesses in ${community.name}, Ohio. ${community.description.substring(0, 120)}`;

  return {
    title,
    description,
    openGraph: {
      title: `${community.name}, OH — Greater Medina Chamber of Commerce`,
      description,
    },
    alternates: { canonical: `/community/${slug}` },
  };
}

// ── Page component ────────────────────────────────────────────────
export default async function CommunityPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const community = getCommunityBySlug(slug);
  if (!community) notFound();

  const cityMembers = getMembersByCity(community.cityMatch);

  // Sort: Visibility Plus first, then alphabetical
  const sortedMembers = [...cityMembers].sort((a, b) => {
    const aPremium = isVisibilityPlus(a) ? 0 : 1;
    const bPremium = isVisibilityPlus(b) ? 0 : 1;
    if (aPremium !== bPremium) return aPremium - bPremium;
    return a.name.localeCompare(b.name);
  });

  const upcoming = getUpcomingEvents().slice(0, 4);

  // Top categories in this city
  const categoryCounts: Record<string, number> = {};
  cityMembers.forEach((m) =>
    m.categories.forEach((c) => {
      categoryCounts[c] = (categoryCounts[c] || 0) + 1;
    })
  );
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://medinachamber.com" },
      { "@type": "ListItem", position: 2, name: "Communities", item: "https://medinachamber.com/community" },
      { "@type": "ListItem", position: 3, name: community.name },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-caption text-text-tertiary mb-10">
          <Link href="/community" className="hover:text-text-primary transition-colors">
            Communities
          </Link>
          <span>/</span>
          <span className="text-text-secondary">{community.name}</span>
        </nav>

        {/* Hero */}
        <section className="max-w-3xl">
          <p className="text-overline text-cambridge mb-4">{community.county}</p>
          <h1 className="text-display">
            {community.name}
            <br />
            <span className="text-accent">Business Community</span>
          </h1>
          <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
            {community.description}
          </p>
        </section>

        {/* Stats strip */}
        <section className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] text-center">
            <p className="text-h2 text-cambridge">{cityMembers.length}</p>
            <p className="text-caption text-text-tertiary mt-1">Chamber Members</p>
          </div>
          <div className="p-5 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] text-center">
            <p className="text-h2 text-cambridge">{topCategories.length}+</p>
            <p className="text-caption text-text-tertiary mt-1">Industries</p>
          </div>
          <div className="p-5 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] text-center">
            <p className="text-h2 text-cambridge">{upcoming.length}</p>
            <p className="text-caption text-text-tertiary mt-1">Upcoming Events</p>
          </div>
          <div className="p-5 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] text-center">
            <p className="text-h2 text-cambridge">1938</p>
            <p className="text-caption text-text-tertiary mt-1">Chamber Est.</p>
          </div>
        </section>

        {/* Why join from this city */}
        <section className="mt-16 p-8 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
          <h2 className="text-h3">
            Why {community.name} businesses join the Medina Chamber
          </h2>
          <p className="text-body text-text-secondary mt-4 leading-relaxed max-w-3xl">
            {community.chamberPitch}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/membership/join"
              className="
                inline-flex items-center px-6 py-3
                bg-accent hover:bg-accent-hover
                text-white font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Apply for Membership →
            </Link>
            <Link
              href="/membership/benefits"
              className="
                inline-flex items-center px-6 py-3
                border border-border-primary hover:border-text-tertiary
                text-text-primary font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              See Benefits
            </Link>
          </div>
        </section>

        {/* Top categories */}
        {topCategories.length > 0 && (
          <section className="mt-16">
            <h2 className="text-overline text-cambridge mb-6">
              Top Industries in {community.name}
            </h2>
            <div className="flex flex-wrap gap-3">
              {topCategories.map(([cat, count]) => (
                <Link
                  key={cat}
                  href={`/membership/directory?category=${encodeURIComponent(cat)}`}
                  className="
                    inline-flex items-center gap-2 px-4 py-2
                    bg-bg-secondary border border-border-secondary
                    rounded-full text-body-sm text-text-secondary
                    hover:border-border-primary hover:text-text-primary
                    transition-colors
                  "
                >
                  {cat}
                  <span className="text-caption text-text-tertiary">{count}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Member directory for this city */}
        {sortedMembers.length > 0 && (
          <section className="mt-16">
            <div className="flex items-end justify-between mb-6">
              <h2 className="text-h2">
                Chamber Members in {community.name}
              </h2>
              <Link
                href="/membership/directory"
                className="hidden sm:inline-flex text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
              >
                Full directory →
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedMembers.map((m) => (
                <Link
                  key={m.chamberSlug}
                  href={`/membership/directory/${m.chamberSlug}`}
                  className="
                    group flex items-start gap-4 p-5 min-w-0 overflow-hidden
                    bg-bg-secondary border border-border-secondary
                    rounded-[var(--radius-lg)]
                    hover:border-border-primary transition-colors
                  "
                >
                  <div className="flex-1 min-w-0">
                    {isVisibilityPlus(m) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 mb-1.5 bg-amber-50 border border-amber-200 rounded-full text-[10px] font-bold text-amber-700 uppercase tracking-wide">
                        <svg className="w-2.5 h-2.5 text-amber-500" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
                        </svg>
                        Visibility Plus
                      </span>
                    )}
                    <h3 className="text-body font-bold text-text-primary group-hover:text-cambridge transition-colors truncate">
                      {m.name}
                    </h3>
                    {m.categories[0] && (
                      <p className="text-caption text-text-tertiary mt-0.5 truncate">
                        {m.categories[0]}
                      </p>
                    )}
                    {m.phone && (
                      <p className="text-caption text-text-tertiary mt-1">
                        {m.phone}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-6 sm:hidden text-center">
              <Link
                href="/membership/directory"
                className="text-body-sm font-bold text-cambridge"
              >
                View full directory →
              </Link>
            </div>
          </section>
        )}

        {/* Upcoming events */}
        {upcoming.length > 0 && (
          <section className="mt-20">
            <div className="flex items-end justify-between mb-6">
              <h2 className="text-h2">Upcoming Chamber Events</h2>
              <Link
                href="/events"
                className="hidden sm:inline-flex text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
              >
                All events →
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {upcoming.map((e) => (
                <Link
                  key={e.slug}
                  href={`/events/${e.slug}`}
                  className="
                    group flex gap-5 p-5 min-w-0 overflow-hidden
                    bg-bg-secondary border border-border-secondary
                    rounded-[var(--radius-lg)]
                    hover:border-border-primary transition-colors
                  "
                >
                  <div className="shrink-0 w-14 text-center">
                    <p className="text-caption text-cambridge font-bold uppercase">
                      {e.month.substring(0, 3)}
                    </p>
                    <p className="text-h2 leading-none">{e.day}</p>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-body font-bold text-text-primary group-hover:text-cambridge transition-colors truncate">
                      {e.title}
                    </h3>
                    <p className="text-caption text-text-tertiary mt-1">
                      {e.startTime} – {e.endTime}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <section className="mt-20 p-10 lg:p-16 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
          <div className="max-w-2xl">
            <h2 className="text-h2">
              Put your {community.name} business on the map
            </h2>
            <p className="text-body-lg text-text-secondary mt-4">
              Join 511+ Medina County businesses in the chamber. Get listed in
              the directory, attend networking events, and access savings
              programs that more than pay for membership.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/membership/join"
                className="
                  inline-flex items-center px-8 py-4
                  bg-accent hover:bg-accent-hover
                  text-white font-bold text-body
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                Join the Chamber →
              </Link>
              <Link
                href="/about/contact"
                className="
                  inline-flex items-center px-6 py-4
                  border border-border-primary hover:border-text-tertiary
                  text-text-primary font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                Contact Us
              </Link>
            </div>
          </div>
        </section>

        {/* Back link */}
        <div className="mt-12">
          <Link
            href="/community"
            className="text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
          >
            ← All Communities
          </Link>
        </div>
      </div>
    </>
  );
}
