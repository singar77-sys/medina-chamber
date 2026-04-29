import type { Metadata } from "next";
import Link from "next/link";
import { members, getAllCategories, totalCount } from "@/data/members";
import { MemberGraph } from "./MemberGraph";
import { FadeIn } from "@/components/FadeIn";

/**
 * Member Directory — φ spatial system applied throughout.
 *
 * HERO    pt-f144 pb-f89
 * GRAPH   full-width, 85vh — neural network primary experience
 * SEO     sr-only — server-rendered member list for crawlers
 * CLOSER  py-f55 lg:py-f89  — join CTA card
 */

export const metadata: Metadata = {
  title: "Member Directory",
  description: `Find local businesses in Medina County. Browse all ${totalCount}+ Greater Medina Chamber of Commerce member businesses by name, category, or keyword.`,
  openGraph: {
    title: "Member Directory — Greater Medina Chamber of Commerce",
    description:
      "Find local businesses in Medina County. Search all Chamber member businesses by name, category, or keyword.",
  },
  alternates: { canonical: "/membership/directory" },
};

export default function DirectoryPage() {
  const categories = getAllCategories();

  return (
    <>
      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pt-f144 pb-f89">
        <div className="max-w-3xl">
          {/* mb-f8 — overline→heading */}
          <p className="text-overline text-cambridge mb-f8">Member Directory</p>
          <h1 className="text-display leading-none">
            Find a Local
            <br />
            <span className="text-accent">Medina Business</span>
          </h1>
          {/* mt-f13 — heading→body */}
          <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
            {totalCount}+ chamber member businesses — explore by industry, city,
            or name. Click any node to open their profile.
          </p>
          {/* mt-f21 — body→CTA */}
          <div className="mt-f21">
            <Link
              href="/membership/join"
              className="
                inline-flex items-center gap-f8 px-f21 py-f13
                border border-border-primary hover:border-text-tertiary
                text-text-primary font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Get Your Business Listed
            </Link>
          </div>
        </div>
      </section>

      {/* ─── GRAPH — Neural network directory ─────────────────── */}
      {/* Full-width, no max-w constraint — graph fills the viewport */}
      <section className="w-full">
        <MemberGraph members={members} categories={categories} />
      </section>

      {/* ─── SEO — Server-rendered member list (hidden from users) ─
          sr-only keeps HTML in the DOM so crawlers index it,
          while visually hidden from all users.              ────── */}
      <div className="sr-only" aria-hidden="true">
        <h2>All Chamber Member Businesses</h2>
        {members.map((m) => (
          <div key={m.chamberSlug}>
            <a href={`/membership/directory/${m.chamberSlug}`}>{m.name}</a>
            {m.categories.length > 0 && (
              <span> — {m.categories.join(", ")}</span>
            )}
            {m.address && <span> — {m.address}</span>}
            {m.description && <span> — {m.description}</span>}
          </div>
        ))}
      </div>

      {/* ─── CLOSER — Join CTA ────────────────────────────────── */}
      {/* py-f55/f89 — CLOSER taper */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          {/* p-f34/f55 — card padding */}
          <div className="p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <div className="max-w-2xl">
              <h2 className="text-h2">Want your business in the directory?</h2>
              {/* mt-f13 — heading→body */}
              <p className="text-body-lg text-text-secondary mt-f13">
                Chamber members are automatically listed with their full business
                profile — name, address, website, categories, and description.
                It&apos;s one of the most visible benefits of membership.
              </p>
              {/* mt-f21 — body→buttons; gap-f13 — between buttons */}
              <div className="mt-f21 flex flex-wrap gap-f13">
                <Link
                  href="/membership/join"
                  className="
                    inline-flex items-center px-f21 py-f13
                    bg-accent hover:bg-accent-hover
                    text-white font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  Join the Chamber →
                </Link>
                <Link
                  href="/membership/benefits"
                  className="
                    inline-flex items-center px-f21 py-f13
                    border border-border-primary hover:border-text-tertiary
                    text-text-primary font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  See All Benefits
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
