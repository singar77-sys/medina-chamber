import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Athena Awards",
  description:
    "The Athena Awards honor exceptional women leaders in Medina County who demonstrate excellence in leadership, inspire others, and make remarkable contributions to their careers and communities. Hosted by the Greater Medina Chamber of Commerce and Medina County Women's Journal.",
  openGraph: {
    title: "Athena Awards — Greater Medina Chamber of Commerce",
    description:
      "Honoring exceptional women leaders in Medina County. Co-hosted by the Greater Medina Chamber of Commerce and Medina County Women's Journal.",
  },
  alternates: { canonical: "/programs/athena-awards" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: "Athena Awards",
  description:
    "Annual ceremony honoring exceptional women leaders in Medina County who demonstrate excellence in leadership and make remarkable contributions to their careers and communities.",
  organizer: [
    {
      "@type": "Organization",
      name: "Greater Medina Chamber of Commerce",
      url: "https://medinachamber.com",
    },
    {
      "@type": "Organization",
      name: "Medina County Women's Journal",
    },
  ],
  location: {
    "@type": "Place",
    name: "Medina County, Ohio",
  },
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
};

const criteria = [
  {
    title: "Excellence in Leadership",
    description:
      "Demonstrated track record of leading with vision, integrity, and impact — in business, nonprofit, government, or community service.",
  },
  {
    title: "Inspiring Others",
    description:
      "Actively mentors, sponsors, or advocates for other women — lifting the next generation of leaders.",
  },
  {
    title: "Community Contribution",
    description:
      "Made meaningful, lasting contributions to Medina County — professionally and in the broader community.",
  },
  {
    title: "Inclusive Leadership",
    description:
      "Fosters environments where everyone can thrive. Champions equity and inclusion as a core leadership principle.",
  },
];

const pricing = [
  { tier: "Chamber Members", price: "$40" },
  { tier: "Non-Members", price: "$55" },
];

export default function AthenaAwardsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
        {/* Hero */}
        <section className="max-w-3xl">
          <p className="text-overline text-cambridge mb-4">Annual Program</p>
          <h1 className="text-display">
            Athena
            <br />
            <span className="text-accent">Awards</span>
          </h1>
          <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
            Honoring exceptional women leaders who have made remarkable
            contributions to their careers and communities in Medina County.
          </p>
          <p className="text-body-sm text-text-tertiary mt-4">
            Co-hosted by the{" "}
            <span className="text-text-secondary font-semibold">
              Greater Medina Chamber of Commerce
            </span>{" "}
            and the{" "}
            <span className="text-text-secondary font-semibold">
              Medina County Women&apos;s Journal
            </span>
          </p>
        </section>

        {/* About the award */}
        <section className="mt-20 grid lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-h2">About the Award</h2>
            <p className="text-body text-text-secondary mt-4 leading-relaxed">
              The Athena Awards celebrate women who lead by example — in the
              boardroom, in their communities, and in the lives of those they
              mentor. This isn&apos;t just recognition. It&apos;s a statement about
              the kind of leadership Medina County values and intends to grow.
            </p>
            <p className="text-body text-text-secondary mt-4 leading-relaxed">
              Each year, honorees are selected for their professional
              excellence, their commitment to uplifting others, and their
              lasting impact on Medina County.
            </p>
          </div>

          {/* Event details */}
          <div className="p-8 bg-oxford text-white rounded-[var(--radius-lg)]">
            <p className="text-overline text-cambridge mb-4">Event Details</p>
            <div className="space-y-4">
              <div>
                <p className="text-caption text-white/50 uppercase tracking-wider">Format</p>
                <p className="text-body font-semibold mt-1">
                  Annual ceremony — soft drinks, appetizers, program, and complimentary wine
                </p>
              </div>
              <div>
                <p className="text-caption text-white/50 uppercase tracking-wider">Registration</p>
                <p className="text-body font-semibold mt-1">Required — walk-ins not permitted</p>
              </div>
              <div>
                <p className="text-caption text-white/50 uppercase tracking-wider">Pricing</p>
                <div className="mt-1 space-y-1">
                  {pricing.map((p) => (
                    <div key={p.tier} className="flex items-center justify-between">
                      <span className="text-body text-white/80">{p.tier}</span>
                      <span className="text-body font-bold text-cambridge">{p.price}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-caption text-white/50 uppercase tracking-wider">Cancellations</p>
                <p className="text-body-sm text-white/60 mt-1">
                  Must cancel by 5:00 PM on the Tuesday before the event for a credit.
                  No-shows will be billed.
                </p>
              </div>
            </div>

            <Link
              href="/events"
              className="
                block mt-6 w-full text-center py-3 px-5
                bg-cambridge hover:bg-cambridge/90
                text-white font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              View Upcoming Events →
            </Link>
          </div>
        </section>

        {/* Selection criteria */}
        <section className="mt-24">
          <h2 className="text-overline text-cambridge mb-8">Selection Criteria</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {criteria.map((c) => (
              <div
                key={c.title}
                className="p-6 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
              >
                <h3 className="text-h4 mb-3">{c.title}</h3>
                <p className="text-body-sm text-text-secondary leading-relaxed">
                  {c.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Sponsorship */}
        <section className="mt-24 grid md:grid-cols-2 gap-6">
          <div className="p-8 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <h2 className="text-h3">Sponsorship Opportunities</h2>
            <p className="text-body text-text-secondary mt-3 leading-relaxed">
              The Athena Awards offer sponsorship packages at various levels —
              putting your brand in front of Medina County&apos;s most engaged
              business and community leaders. Contact Jaclyn to learn about
              available opportunities.
            </p>
            <a
              href="mailto:jaclyn@medinaohchamber.com"
              className="
                inline-flex items-center mt-5 px-5 py-2.5
                bg-accent hover:bg-accent-hover
                text-white font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Contact Jaclyn →
            </a>
          </div>

          <div className="p-8 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <h2 className="text-h3">Know Someone Who Qualifies?</h2>
            <p className="text-body text-text-secondary mt-3 leading-relaxed">
              Nominations are accepted annually. If you know an exceptional
              woman leader in Medina County who deserves recognition, reach out
              to the Chamber to learn about the nomination process.
            </p>
            <Link
              href="/about/contact"
              className="
                inline-flex items-center mt-5 px-5 py-2.5
                border border-border-primary hover:border-text-tertiary
                text-text-primary font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Get in Touch →
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
