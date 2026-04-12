import type { Metadata } from "next";
import Link from "next/link";
import { communities, getMembersByCity } from "@/data/communities";

export const metadata: Metadata = {
  title: "Medina County Business Communities",
  description:
    "Explore business resources and Chamber member businesses in Medina, Brunswick, Wadsworth, Lodi, Seville, Valley City, Hinckley, Rittman, and Lafayette Township. The Greater Medina Chamber serves all of Medina County.",
  openGraph: {
    title: "Medina County Business Communities — Greater Medina Chamber",
    description:
      "Business resources for every community in Medina County, Ohio.",
  },
  alternates: { canonical: "/community" },
};

export default function CommunityHubPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">
          Medina County, Ohio
        </p>
        <h1 className="text-display">
          Business Communities
          <br />
          <span className="text-accent">Across the County</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          The Greater Medina Chamber of Commerce serves businesses in every
          corner of Medina County — from the Square to the southern townships.
          511+ member businesses across {communities.length} communities.
        </p>
      </section>

      {/* Community grid */}
      <section className="mt-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {communities.map((c) => {
            const memberCount = getMembersByCity(c.name.replace(" Township", "")).length;
            return (
              <Link
                key={c.slug}
                href={`/community/${c.slug}`}
                className="
                  group flex flex-col p-6
                  bg-bg-secondary border border-border-secondary
                  rounded-[var(--radius-lg)]
                  hover:border-border-primary transition-colors
                "
              >
                <p className="text-caption text-cambridge font-bold uppercase tracking-wider">
                  {c.county}
                </p>
                <h2 className="text-h3 mt-2 group-hover:text-cambridge transition-colors">
                  {c.name}
                </h2>
                <p className="text-body-sm text-text-secondary mt-2 leading-relaxed flex-1">
                  {c.tagline}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-caption text-text-tertiary">
                    {memberCount} chamber member{memberCount !== 1 ? "s" : ""}
                  </span>
                  <span className="text-body-sm text-cambridge font-bold group-hover:translate-x-0.5 transition-transform">
                    Explore →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-20 p-10 lg:p-16 bg-oxford text-white rounded-[var(--radius-lg)]">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-h2 text-white">
              Your community. Your chamber.
            </h2>
            <p className="text-body-lg text-white/70 mt-4">
              No matter where in Medina County your business is located, the
              chamber works for you — advocacy, networking, directory visibility,
              and savings programs that serve the whole county.
            </p>
          </div>
          <div className="space-y-4">
            <Link
              href="/membership/join"
              className="
                block w-full text-center py-4 px-6
                bg-accent hover:bg-accent-hover
                text-white font-bold text-body
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Join the Chamber →
            </Link>
            <Link
              href="/membership/directory"
              className="
                block w-full text-center py-3 px-6
                border border-white/30 hover:border-white/60
                text-white font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Browse the Full Directory
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
