import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import Link from "next/link";
import { activeCommunities } from "@/data/communities";

export const metadata: Metadata = {
  title: "Medina County Business Communities",
  description:
    "Explore business resources and Chamber member businesses in Medina, Brunswick, Wadsworth, and communities across Medina County. The Greater Medina Chamber serves all of Medina County.",
  openGraph: {
    title: "Medina County Business Communities, Greater Medina Chamber",
    description:
      "Business resources for every community in Medina County, Ohio.",
  },
  alternates: { canonical: "/community" },
};

export default function CommunityHubPage() {
  return (
    <>
      <PageHero
        overline="Medina County, Ohio"
        titleTop="Business Communities"
        titleAccent="Across the County"
        subtitle={
          <>
            The Greater Medina Chamber of Commerce serves businesses in every
            corner of Medina County, from the Square to the southern townships.
            Member businesses across every community we serve.
          </>
        }
        image="/images/photos/medina-square-aerial-spring.jpg"
      />

      <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-16 lg:pb-24">

      {/* Community grid */}
      <section className="mt-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeCommunities.map((c) => (
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
                <div className="mt-4 flex items-center justify-end">
                  <span className="text-body-sm text-cambridge font-bold group-hover:translate-x-0.5 transition-transform">
                    Explore →
                  </span>
                </div>
              </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-20 p-10 lg:p-16 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-h2">
              Your community. Your chamber.
            </h2>
            <p className="text-body-lg text-text-secondary mt-4">
              From the Square to the southern townships, same advocacy,
              same directory, same networking events, same savings programs.
              The chamber works for every zip code in the county.
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
                bg-emerald hover:bg-emerald/90
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
    </>
  );
}
