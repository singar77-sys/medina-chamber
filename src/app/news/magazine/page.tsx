import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Medina Means Business Magazine",
  description:
    "Medina Means Business, the official quarterly magazine of the Greater Medina Chamber of Commerce. Featuring local business profiles, community stories, Chamber updates, and advertising opportunities for Medina County.",
  openGraph: {
    title: "Medina Means Business Magazine | Greater Medina Chamber of Commerce",
    description:
      "The official quarterly magazine of the Greater Medina Chamber of Commerce, business profiles, community stories, and chamber updates.",
  },
  alternates: { canonical: "/news/magazine" },
};

const issues = [
  {
    title: "Impact",
    quarter: "Q4 2025",
    date: "October 2025",
    url: "https://wjcspub.hflip.co/2025Q4Impact",
    latest: true,
  },
  {
    title: "Growth",
    quarter: "Q3 2025",
    date: "July 2025",
    url: "https://wjcspub.hflip.co/2025Q3Growth",
    latest: false,
  },
  {
    title: "Thrive",
    quarter: "Q2 2025",
    date: "April 2025",
    url: "https://wjcspub.hflip.co/2025Q2Thrive",
    latest: false,
  },
];

const latestIssue = issues[0];

export default function MagazinePage() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Magazine</p>
        <h1 className="text-display">
            <span className="block">Medina Means</span>
            <span className="block text-accent">Business</span>
          </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          The Chamber&apos;s official quarterly magazine, local business
          profiles, community stories, Chamber updates, and the people driving
          Medina County forward.
        </p>
      </section>

      {/* Latest issue embed */}
      <section className="mt-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-caption text-cambridge font-bold uppercase tracking-wider">
              Latest Issue · {latestIssue.quarter}
            </p>
            <h2 className="text-h2 mt-1">{latestIssue.title}</h2>
          </div>
          <a
            href={latestIssue.url}
            target="_blank"
            rel="noopener noreferrer"
            className="
              hidden sm:inline-flex items-center px-5 py-2.5
              bg-accent hover:bg-accent-hover
              text-white font-bold text-body-sm
              rounded-[var(--radius-md)]
              transition-colors shrink-0
            "
          >
            Open Full Screen ↗
          </a>
        </div>

        <div className="rounded-[var(--radius-lg)] overflow-hidden border border-border-secondary bg-bg-secondary">
          <iframe
            src={latestIssue.url}
            width="100%"
            height="600"
            allowFullScreen
            title={`Medina Means Business, ${latestIssue.title} ${latestIssue.quarter}`}
            className="block"
          />
        </div>

        <div className="mt-4 sm:hidden">
          <a
            href={latestIssue.url}
            target="_blank"
            rel="noopener noreferrer"
            className="
              inline-flex items-center px-5 py-2.5
              bg-accent hover:bg-accent-hover
              text-white font-bold text-body-sm
              rounded-[var(--radius-md)]
              transition-colors
            "
          >
            Open Full Screen ↗
          </a>
        </div>
      </section>

      {/* Past issues */}
      <section className="mt-20">
        <h2 className="text-overline text-cambridge mb-8">Past Issues</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {issues.map((issue) => (
            <a
              key={issue.url}
              href={issue.url}
              target="_blank"
              rel="noopener noreferrer"
              className="
                group p-6
                bg-bg-secondary border border-border-secondary
                rounded-[var(--radius-lg)]
                hover:border-border-primary transition-colors
              "
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-caption text-cambridge font-bold uppercase tracking-wider">
                    {issue.quarter}
                  </p>
                  <h3 className="text-h3 mt-1 group-hover:text-cambridge transition-colors">
                    {issue.title}
                  </h3>
                  <p className="text-caption text-text-tertiary mt-1">{issue.date}</p>
                </div>
                {issue.latest && (
                  <span className="shrink-0 px-2 py-0.5 bg-cambridge/20 text-cambridge text-caption font-bold rounded-full">
                    Latest
                  </span>
                )}
              </div>
              <p className="text-body-sm text-cambridge font-bold">
                Read issue ↗
              </p>
            </a>
          ))}
        </div>
      </section>

      {/* What's inside */}
      <section className="mt-20">
        <h2 className="text-overline text-cambridge mb-8">What&apos;s Inside</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Business Profiles",
              description:
                "In-depth features on member businesses, their story, their people, and what makes them run.",
            },
            {
              title: "Chamber Updates",
              description:
                "Recaps of signature events, new member spotlights, advocacy wins, and program announcements.",
            },
            {
              title: "Advertising",
              description:
                "Reach every Chamber member and thousands of community readers. Member rates available for print and digital placements.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="p-6 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
            >
              <h3 className="text-h4 mb-3">{item.title}</h3>
              <p className="text-body-sm text-text-secondary">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-20 p-10 lg:p-16 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
        <div className="max-w-2xl">
          <h2 className="text-h2">Want to be featured?</h2>
          <p className="text-body-lg text-text-secondary mt-4">
            Chamber members are eligible for business profiles and member-rate
            advertising. The magazine reaches thousands of readers across Medina
            County, business owners, residents, and community leaders.
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
