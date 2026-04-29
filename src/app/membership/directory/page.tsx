import type { Metadata } from "next";
import Link from "next/link";
import { members, getAllCategories, totalCount } from "@/data/members";
import { DirectoryClient } from "./DirectoryClient";
import { FadeIn } from "@/components/FadeIn";

/**
 * Member Directory — φ spatial system applied throughout.
 *
 * HERO    pt-f144 pb-f89
 * FEATURE py-f89 lg:py-f144 — DirectoryClient interactive search (open white)
 * CLOSER  py-f55 lg:py-f89  — Join CTA card
 */

export const metadata: Metadata = {
  title: "Member Directory",
  description:
    `Find local businesses in Medina County. Browse all ${totalCount}+ Greater Medina Chamber of Commerce member businesses by name, category, or keyword.`,
  openGraph: {
    title: "Member Directory — Greater Medina Chamber of Commerce",
    description:
      "Find local businesses in Medina County. Search all Chamber member businesses by name, category, or keyword.",
  },
};

export default function DirectoryPage() {
  const categories = getAllCategories();

  return (
    <>
      {/* ─── HERO ─────────────────────────────────────────────── */}
      {/* pt-f144 pb-f89 (144/89 = φ) — HERO tier */}
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
            All {totalCount}+ Greater Medina Chamber member businesses — searchable
            and filtered, right here. Click any member to see their full profile.
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

      {/* ─── FEATURE — Interactive Directory ──────────────────── */}
      {/* py-f89/f144 — FEATURE tier, open white */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <DirectoryClient members={members} categories={categories} />
      </section>

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
