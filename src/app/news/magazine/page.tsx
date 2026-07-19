import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Medina Means Business Magazine",
  description:
    "Medina Means Business, the official quarterly magazine of the Greater Medina Chamber of Commerce. Local business profiles, community stories, chamber updates, and advertising opportunities for Medina County.",
  openGraph: {
    title: "Medina Means Business Magazine | Greater Medina Chamber of Commerce",
    description:
      "The official quarterly magazine of the Greater Medina Chamber of Commerce. Business profiles, community stories, and chamber updates.",
  },
  alternates: { canonical: "/news/magazine" },
};

interface Issue {
  title: string;
  quarter: string;
  date: string;
  dateISO: string;
  url: string;
  latest: boolean;
}

const issues: Issue[] = [
  {
    title: "Volume 2, Issue 1",
    quarter: "Spring 2026",
    date: "April 2026",
    dateISO: "2026-04",
    url: "https://wjcspub.hflip.co/mmbmagazine",
    latest: true,
  },
  {
    title: "Impact",
    quarter: "Q4 2025",
    date: "October 2025",
    dateISO: "2025-10",
    url: "https://wjcspub.hflip.co/2025Q4Impact",
    latest: false,
  },
  {
    title: "Growth",
    quarter: "Q3 2025",
    date: "July 2025",
    dateISO: "2025-07",
    url: "https://wjcspub.hflip.co/2025Q3Growth",
    latest: false,
  },
  {
    title: "Thrive",
    quarter: "Q2 2025",
    date: "April 2025",
    dateISO: "2025-04",
    url: "https://wjcspub.hflip.co/2025Q2Thrive",
    latest: false,
  },
];

const inside = [
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
];

export default function MagazinePage() {
  const latestIssue = issues[0];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Periodical",
    name: "Medina Means Business Magazine",
    description:
      "The official quarterly magazine of the Greater Medina Chamber of Commerce.",
    url: "https://medinachamber.com/news/magazine",
    publisher: {
      "@type": "Organization",
      name: "Greater Medina Chamber of Commerce",
      url: "https://medinachamber.com",
    },
    workExample: issues.map((i) => ({
      "@type": "PublicationIssue",
      issueNumber: i.quarter,
      datePublished: i.dateISO,
      name: i.title,
      url: i.url,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
        {/* Ghosted Medina County courthouse backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/medina-chamber-magazine-hero.webp"
            alt=""
            fill
            priority
            className="object-cover opacity-[0.33]"
            sizes="100vw"
            quality={60}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
          <p className="text-overline text-cambridge mb-f8">Magazine</p>
          <h1 className="text-display">
            <span className="block">Medina Means</span>
            <span className="block text-accent">Business</span>
          </h1>
          <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
            The chamber&apos;s official quarterly magazine. Local business
            profiles, community stories, chamber updates, and the people
            driving Medina County forward.
          </p>
          </div>
        </div>
      </section>

      {/* Latest issue embed */}
      <section className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="flex items-center justify-between mb-f21 flex-wrap gap-f13">
              <div>
                <p className="text-caption text-cambridge font-bold uppercase tracking-wider">
                  Latest Issue · {latestIssue.quarter}
                </p>
                <h2 className="text-h2 mt-f3">{latestIssue.title}</h2>
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

            <div className="rounded-[var(--radius-lg)] overflow-hidden border border-border-secondary bg-bg-primary">
              <iframe
                src={latestIssue.url}
                width="100%"
                height="600"
                allowFullScreen
                title={`Medina Means Business, ${latestIssue.title} ${latestIssue.quarter}`}
                className="block"
              />
            </div>

            <div className="mt-f13 sm:hidden">
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
          </FadeIn>
        </div>
      </section>

      {/* Past issues */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          <div className="mb-f21">
            <p className="text-overline text-cambridge mb-f8">Archive</p>
            <h2 className="text-h2">Past Issues</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-f21">
            {issues.map((issue) => (
              <a
                key={issue.url}
                href={issue.url}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  group p-f21
                  bg-bg-secondary border border-border-secondary
                  rounded-[var(--radius-lg)]
                  hover:border-cambridge/40 transition-colors
                "
              >
                <div className="flex items-start justify-between gap-3 mb-f13">
                  <div>
                    <p className="text-caption text-cambridge font-bold uppercase tracking-wider">
                      {issue.quarter}
                    </p>
                    <h3 className="text-h3 mt-f3 group-hover:text-cambridge transition-colors">
                      {issue.title}
                    </h3>
                    <p className="text-caption text-text-tertiary mt-f3">
                      {issue.date}
                    </p>
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
        </FadeIn>
      </section>

      {/* What's inside */}
      <section className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="mb-f21">
              <p className="text-overline text-cambridge mb-f8">Inside</p>
              <h2 className="text-h2">What&apos;s Inside Every Issue</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-f21">
              {inside.map((item) => (
                <div
                  key={item.title}
                  className="p-f21 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)]"
                >
                  <h3 className="text-h4 mb-f8">{item.title}</h3>
                  <p className="text-body-sm text-text-secondary leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          <div className="p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <div className="grid lg:grid-cols-2 gap-f34 items-center">
              <div>
                <p className="text-overline text-cambridge mb-f8">
                  Get Featured
                </p>
                <h2 className="text-h2">Want to be in the magazine?</h2>
                <p className="text-body-lg text-text-secondary mt-f13">
                  Chamber members are eligible for business profiles and
                  member-rate advertising. The magazine reaches thousands of
                  readers across Medina County: business owners, residents,
                  and community leaders.
                </p>
              </div>
              <div className="space-y-f13">
                <Link
                  href="/about/contact"
                  className="
                    block w-full text-center py-f13 px-f21
                    bg-accent hover:bg-accent-hover
                    text-white font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  Contact the Chamber →
                </Link>
                <Link
                  href="/membership/join"
                  className="
                    block w-full text-center py-f13 px-f21
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
          </div>

          <div className="mt-f34">
            <Link
              href="/news"
              className="text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
            >
              ← Back to News
            </Link>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
