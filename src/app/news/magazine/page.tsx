import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Medina Means Business Magazine",
  description:
    "Medina Means Business — the official magazine of the Greater Medina Chamber of Commerce. Featuring local business profiles, community stories, and Chamber updates.",
  openGraph: {
    title: "Medina Means Business Magazine — Greater Medina Chamber of Commerce",
    description:
      "The official magazine of the Greater Medina Chamber of Commerce.",
  },
};

export default function MagazinePage() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Magazine</p>
        <h1 className="text-display">
          Medina Means
          <br />
          <span className="text-accent">Business</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          The Chamber&apos;s official magazine. Local business profiles,
          community stories, Chamber updates, and advertising opportunities —
          published for the businesses and residents of Medina County.
        </p>
      </section>

      {/* What's Inside */}
      <section className="mt-24">
        <h2 className="text-overline text-cambridge mb-8">
          What&apos;s Inside
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Business Profiles",
              description:
                "In-depth features on member businesses — their story, their people, and what makes them run.",
            },
            {
              title: "Chamber Updates",
              description:
                "Recaps of signature events, new member spotlights, advocacy wins, and program announcements.",
            },
            {
              title: "Advertising",
              description:
                "Reach every Chamber member and thousands of community readers. Print and digital ad placements available.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="
                p-6
                bg-bg-secondary border border-border-secondary
                rounded-[var(--radius-lg)]
              "
            >
              <h3 className="text-h4 mb-3">{item.title}</h3>
              <p className="text-body-sm text-text-secondary">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-24 p-10 lg:p-16 bg-bg-secondary rounded-[var(--radius-lg)] border border-border-secondary">
        <div className="max-w-2xl">
          <h2 className="text-h2">Want to be featured?</h2>
          <p className="text-body-lg text-text-secondary mt-4">
            Chamber members are eligible for business profiles and
            member-rate advertising. The magazine reaches thousands of
            readers across Medina County — business owners, residents, and
            community leaders.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/about/contact"
              className="
                inline-flex items-center px-6 py-3
                bg-accent hover:bg-accent-hover
                text-white font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Contact Us About the Magazine →
            </Link>
            <Link
              href="/membership/join"
              className="
                inline-flex items-center px-6 py-3
                border border-border-primary hover:border-text-tertiary
                text-text-primary font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Become a Member
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
