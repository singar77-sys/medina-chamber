import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { safeJsonLd } from "@/lib/json-ld";
import { jaclyn } from "@/data/staff";
import { mailto } from "@/lib/format";

export const metadata: Metadata = {
  title: "Athena Awards",
  description:
    "The ATHENA Awards honor Medina County leaders who achieve professional excellence, serve their community, and actively help women reach their full leadership potential. Presented November 10, 2026 by the Greater Medina Chamber of Commerce and WJ Creative Studio.",
  openGraph: {
    title: "Athena Awards | Greater Medina Chamber of Commerce",
    description:
      "Honoring Medina County leaders who champion the advancement of women. Presented November 10, 2026 by the Greater Medina Chamber of Commerce and WJ Creative Studio.",
  },
  alternates: { canonical: "/programs/athena-awards" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: "Athena Awards",
  description:
    "Annual ATHENA Awards ceremony honoring Medina County leaders who demonstrate professional excellence, serve their community, and actively help women reach their full leadership potential. Nominees of any gender are welcome.",
  startDate: "2026-11-10",
  organizer: [
    {
      "@type": "Organization",
      name: "Greater Medina Chamber of Commerce",
      url: "https://medinachamber.com",
    },
    {
      "@type": "Organization",
      name: "WJ Creative Studio",
    },
  ],
  location: {
    "@type": "Place",
    name: "Medina County, Ohio",
  },
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
};

// The four ATHENA Leadership Award criteria (ATHENA International). The award
// is defined by what a leader DOES — including actively advancing women — not
// by the leader's own gender, so nominees of any gender qualify.
const criteria = [
  {
    title: "Professional Excellence",
    description:
      "Demonstrates the highest level of professional excellence, creativity, and initiative in their business or profession.",
  },
  {
    title: "Community Service",
    description:
      "Provides valuable service that improves the quality of life for others across Medina County.",
  },
  {
    title: "Advancing Women",
    description:
      "Actively helps women reach their full leadership potential, through mentorship, sponsorship, and opening doors. This is the heart of the award, and nominees of any gender qualify.",
  },
  {
    title: "Enlightened Leadership",
    description:
      "Leads by ATHENA's model of enlightened leadership, building inclusive environments where everyone can thrive.",
  },
];

// Two nomination tracks, each with its official 2026 form (hosted on the
// Chamber's ChamberMaster site).
const awards = [
  {
    title: "ATHENA Leadership Award",
    description:
      "For an established leader with a proven record of professional excellence, community service, and championing women's advancement.",
    form: "https://business.medinachamber.com/s/2026-Athena-Nomination-Form.pdf",
  },
  {
    title: "ATHENA Young Professional Award",
    description:
      "For an emerging leader early in their career who already lives out ATHENA's leadership principles and lifts others as they rise.",
    form: "https://business.medinachamber.com/s/2026-Athena-Young-Professional-Nomination-Form.pdf",
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
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />


      <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
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
            className="object-cover object-top lg:object-[center_28%] opacity-[0.33]"
            sizes="100vw"
            quality={60}
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
            Honoring Medina County leaders who achieve professional excellence,
            give back to their community, and actively help women reach their
            full leadership potential.
          </p>
          <p className="text-body-sm text-text-tertiary mt-f8">
            Presented{" "}
            <span className="text-text-secondary font-bold">November 10, 2026</span>{" "}
            · Co-hosted by the{" "}
            <span className="text-text-secondary font-bold">
              Greater Medina Chamber of Commerce
            </span>{" "}
            and{" "}
            <span className="text-text-secondary font-bold">
              WJ Creative Studio
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
                  The Medina Chamber of Commerce and WJ Creative Studio proudly
                  host the ATHENA Awards, honoring exceptional leaders who have
                  made remarkable contributions to their careers and communities.
                  Modeled on the international ATHENA Leadership Award, this
                  recognition celebrates individuals, of any gender, who lead with
                  excellence, serve their community, and actively help women reach
                  their full leadership potential.
                </p>
                <p>
                  Many honorees are accomplished women leaders. Others are the
                  mentors, sponsors, and allies, women and men alike, who open
                  doors and clear the path for the women rising behind them.
                  Through these awards we celebrate individual achievement while
                  advancing women in every field, uplifting and empowering the
                  next generation of leaders across Medina County.
                </p>
              </div>
            </div>

            {/* Event Details card — p-f21 */}
            <div className="p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
              <p className="text-overline text-cambridge mb-f21">Event Details</p>
              <div className="space-y-f21">
                <div>
                  <p className="text-caption text-text-tertiary uppercase tracking-wider">Date</p>
                  <p className="text-body font-bold text-text-primary mt-f3">
                    November 10, 2026
                  </p>
                </div>
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
      <section className="relative overflow-hidden bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        {/* Ghosted ATHENA ceremony backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/events/athena-awards/highlights/athena-awards-medina-ohio-002.webp"
            alt=""
            fill
            className="object-cover opacity-[0.10]"
            sizes="100vw"
            quality={60}
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
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

      {/* Award Tracks + Nomination Forms */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          <h2 className="text-h2">Two Ways to Be Honored</h2>
          <p className="text-body text-text-secondary mt-f8 max-w-2xl leading-relaxed">
            Know someone in Medina County who leads with excellence and lifts
            women up along the way? Nominate them in whichever category fits,
            using the official 2026 form below.
          </p>
          <div className="grid md:grid-cols-2 gap-f21 mt-f34">
            {awards.map((a) => (
              <div
                key={a.title}
                className="flex flex-col p-f34 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
              >
                <h3 className="text-h3">{a.title}</h3>
                <p className="text-body text-text-secondary mt-f8 leading-relaxed flex-1">
                  {a.description}
                </p>
                <a
                  href={a.form}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    inline-flex items-center mt-f21 px-f21 py-f13
                    bg-accent hover:bg-accent-hover
                    text-white font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  Download Nomination Form (PDF) →
                </a>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* Sponsorship + Contact */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pb-f55 lg:pb-f89">
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
              <h2 className="text-h3">Questions About Nominating?</h2>
              <p className="text-body text-text-secondary mt-f8 leading-relaxed">
                Not sure whether someone qualifies, or which category fits best?
                Reach out to the Chamber and we&apos;ll walk you through the
                nomination process and deadlines.
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
