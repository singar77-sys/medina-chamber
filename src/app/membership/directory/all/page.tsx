import type { Metadata } from "next";
import Link from "next/link";
import { members, getAllCategories, totalCount } from "@/data/members";
import { DirectoryClient } from "../DirectoryClient";

export const metadata: Metadata = {
  title: "All Members",
  description: `Search all ${totalCount}+ Greater Medina Chamber of Commerce member businesses by name, category, or keyword. Semantic search powered by Jackie.`,
  openGraph: {
    title: "All Members — Greater Medina Chamber of Commerce",
    description: `Search all ${totalCount}+ Chamber member businesses by name, category, or service.`,
  },
  alternates: { canonical: "/membership/directory/all" },
};

export default function AllMembersPage() {
  const categories = getAllCategories();

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* ── Hero ── */}
      <section className="max-w-3xl mb-10">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/membership/directory"
            className="text-caption text-text-tertiary hover:text-cambridge transition-colors inline-flex items-center gap-1"
          >
            <span aria-hidden="true">←</span> Featured Members
          </Link>
          <span className="text-text-tertiary/40" aria-hidden="true">
            /
          </span>
          <p className="text-caption text-cambridge font-bold uppercase tracking-wider">
            All Members
          </p>
        </div>
        <h1 className="text-display leading-none">
          All {totalCount}+
          <br />
          <span className="text-accent">Chamber Members</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          Search by name, category, or plain-English description. Ask in your
          own words — &ldquo;leaky roof after storm, takes insurance&rdquo; —
          and Jackie&apos;s semantic search will rank the members that fit.
        </p>
      </section>

      {/* ── Interactive Directory ── */}
      <DirectoryClient members={members} categories={categories} />

      {/* ── Bottom CTA ── */}
      <section className="mt-24 p-10 lg:p-16 bg-bg-secondary rounded-[var(--radius-lg)] border border-border-secondary">
        <div className="max-w-2xl">
          <h2 className="text-h2">Want your business in the directory?</h2>
          <p className="text-body-lg text-text-secondary mt-4">
            Chamber members are automatically listed with their full business
            profile — name, address, website, categories, and description.
            It&apos;s one of the most visible benefits of membership.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
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
              Join the Chamber →
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
              See All Benefits
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
