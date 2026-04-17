import type { Metadata } from "next";
import Link from "next/link";
import { members, getAllCategories, totalCount } from "@/data/members";
import { DirectoryClient } from "./DirectoryClient";

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
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">

      {/* ── Hero ── */}
      <section className="max-w-3xl mb-14">
        <p className="text-overline text-cambridge mb-4">Member Directory</p>
        <h1 className="text-display leading-none">
          Find a Local
          <br />
          <span className="text-accent">Medina Business</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          All {totalCount}+ Greater Medina Chamber member businesses — searchable
          and filtered, right here. Click any member to see their full profile.
        </p>
        <div className="mt-8">
          <Link
            href="/membership/join"
            className="
              inline-flex items-center gap-2 px-6 py-3
              border border-border-primary hover:border-text-tertiary
              text-text-primary font-bold text-body-sm
              rounded-[var(--radius-md)]
              transition-colors
            "
          >
            Get Your Business Listed
          </Link>
        </div>
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
