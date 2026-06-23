import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { safeJsonLd } from "@/lib/json-ld";
import { jaclyn } from "@/data/staff";
import { mailto } from "@/lib/format";
import { getStaticPhotos } from "@/lib/static-media";
import { EventGallery } from "@/components/events/EventGallery";

export const metadata: Metadata = {
  title: "Athena Awards",
  description:
    "The Athena Awards honor exceptional women leaders in Medina County who demonstrate excellence in leadership, inspire others, and make remarkable contributions to their careers and communities. Hosted by the Greater Medina Chamber of Commerce and Medina County Women's Journal.",
  openGraph: {
    title: "Athena Awards | Greater Medina Chamber of Commerce",
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
      "Demonstrated track record of leading with vision, integrity, and impact, in business, nonprofit, government, or community service.",
  },
  {
    title: "Inspiring Others",
    description:
      "Actively mentors, sponsors, or advocates for other women, lifting the next generation of leaders.",
  },
  {
    title: "Community Contribution",
    description:
      "Made meaningful, lasting contributions to Medina County, professionally and in the broader community.",
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

export default async function AthenaAwardsPage() {
  const highlights = await getStaticPhotos(
    "events/athena-awards/highlights",
    "Award recipient at the Athena Awards ceremony, Greater Medina Chamber of Commerce, Medina Ohio",
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      
      <section className="relative overflow-hidden pt-f144 pb-f89">
        {/* Ghosted Athena International award trophy backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/medina-chamber-athena-awards-hero.webp"
            alt=""
            fill
            priority
            className="object-cover opacity-[0.33]"
            sizes="100vw"
            quality={72}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
          <p className="text-overline text-cambridge mb-f8">Annual Program</p>
          <h1 className="text-display">
            <span className="block">Athena</span>
            <span className="block text-accent">Awards</span>
          </h1>
          <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
            Honoring exceptional women leaders who have made remarkable
            contributions to their careers and communities in Medina County.
          </p>
          <p className="text-body-sm text-text-tertiary mt-f8">
            Co-hosted by the{" "}
            <span className="text-text-secondary font-bold">
              Greater Medina Chamber of Commerce
            </span>{" "}
            and the{" "}
            <span className="text-text-secondary font-bold">
              Medina County Women&apos;s Journal
            </span>
          </p>
          </div>
        </div>
      </section>

      {/* About + Event Details */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          <div className="grid lg:grid-cols-2 gap-f34 lg:gap-f55 items-start">
            <div>
              <h2 className="text-h2">About the Award</h2>
              <div className="mt-f13 space-y-f21 text-body text-text-secondary leading-relaxed">
                <p>
                  The Athena Awards celebrate women who lead by example, in the
                  boardroom, in their communities, and in the lives of those they
                  mentor. This isn&apos;t just recognition. It&apos;s a statement about
                  the kind of leadership Medina County values and intends to grow.
                </p>
                <p>
                  Each year, honorees are selected for their professional
                  excellence, their commitment to uplifting others, and their
                  lasting impact on Medina County.
                </p>
              </div>
            </div>

            {/* Event Details card — p-f21 */}
            <div className="p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
              <p className="text-overline text-cambridge mb-f21">Event Details</p>
              <div className="space-y-f21">
                <div>
                  <p className="text-caption text-text-tertiary uppercase tracking-wider">Format</p>
                  <p className="text-body font-bold text-text-primary mt-f3">
                    Annual ceremony, soft drinks, appetizers, program, and complimentary wine
                  </p>
                </div>
                <div>
                  <p className="text-caption text-text-tertiary uppercase tracking-wider">Registration</p>
                  <p className="text-body font-bold text-text-primary mt-f3">
                    Required, walk-ins not permitted
                  </p>
                </div>
                <div>
                  <p className="text-caption text-text-tertiary uppercase tracking-wider">Pricing</p>
                  <div className="mt-f3 space-y-f3">
                    {pricing.map((p) => (
                      <div key={p.tier} className="flex items-center justify-between">
                        <span className="text-body text-text-secondary">{p.tier}</span>
                        <span className="text-body font-bold text-cambridge">{p.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-caption text-text-tertiary uppercase tracking-wider">Cancellations</p>
                  <p className="text-body-sm text-text-tertiary mt-f3">
                    Must cancel by 5:00 PM on the Tuesday before the event for a credit.
                    No-shows will be billed.
                  </p>
                </div>
              </div>

              <Link
                href="/events"
                className="
                  block mt-f21 w-full text-center py-f13 px-f21
                  bg-accent hover:bg-accent-hover
                  text-white font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                View Upcoming Events →
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Selection Criteria */}
      <section className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-overline text-cambridge mb-f21">Selection Criteria</h2>
            <div className="grid md:grid-cols-2 gap-f21">
              {criteria.map((c, i) => (
                <FadeIn key={c.title} delay={i * 70}>
                  <div className="p-f21 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)]">
                    <h3 className="text-h4 mb-f8">{c.title}</h3>
                    <p className="text-body-sm text-text-secondary leading-relaxed">
                      {c.description}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* 2026 ceremony — highlight photos */}
      {highlights.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
          <FadeIn>
            <p className="text-overline text-cambridge mb-f8">From the 2026 Ceremony</p>
            <h2 className="text-h2 mb-f21">A Night to Remember</h2>
            <EventGallery photos={highlights} title="" />
          </FadeIn>
        </section>
      )}

      {/* Sponsorship + Nominations */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          <div className="grid md:grid-cols-2 gap-f21">
            <div className="p-f34 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
              <h2 className="text-h3">Sponsorship Opportunities</h2>
              <p className="text-body text-text-secondary mt-f8 leading-relaxed">
                The Athena Awards offer sponsorship packages at various levels, 
                putting your brand in front of Medina County&apos;s most engaged
                business and community leaders. Contact Jaclyn to learn about
                available opportunities.
              </p>
              <a
                href={mailto(jaclyn.email)}
                className="
                  inline-flex items-center mt-f21 px-f21 py-f13
                  bg-accent hover:bg-accent-hover
                  text-white font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                Contact Jaclyn →
              </a>
            </div>

            <div className="p-f34 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
              <h2 className="text-h3">Know Someone Who Qualifies?</h2>
              <p className="text-body text-text-secondary mt-f8 leading-relaxed">
                Nominations are accepted annually. If you know an exceptional
                woman leader in Medina County who deserves recognition, reach out
                to the Chamber to learn about the nomination process.
              </p>
              <Link
                href="/about/contact"
                className="
                  inline-flex items-center mt-f21 px-f21 py-f13
                  border border-border-primary hover:border-text-tertiary
                  text-text-primary font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                Get in Touch →
              </Link>
            </div>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
