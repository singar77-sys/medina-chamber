import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sponsorships & Ribbon Cuttings",
  description:
    "Sponsor Greater Medina Chamber events to reach Medina County's business community — Golf Outing, Athena Awards, Member Meetings, and Safety Council. Ribbon cuttings celebrate member milestones.",
  openGraph: {
    title: "Sponsorships & Ribbon Cuttings — Greater Medina Chamber of Commerce",
    description:
      "Put your brand in front of Medina County's business community. Sponsorship packages for every budget.",
  },
  alternates: { canonical: "/events/sponsorships" },
};

const sponsorships = [
  {
    event: "Golf Outing",
    tag: "Largest Fundraiser",
    href: "/programs/golf-outing",
    description:
      "The chamber's largest fundraiser of the year. Sponsorship options include hole/tee sponsors, Par 3 \"spend the day\" sponsors, comfort station sponsors, and raffle prize donations. Maximum exposure with Medina County's business community in one afternoon.",
    contact: "stephanie@medinaohchamber.com",
    options: [
      "Hole / Tee Sponsor",
      "Spend the Day at a Par 3",
      "Comfort Station Sponsor",
      "Raffle Prize Donation",
    ],
  },
  {
    event: "Athena Leadership Awards",
    tag: "Annual Ceremony",
    href: "/programs/athena-awards",
    description:
      "Annual awards ceremony co-hosted with the Medina County Women's Journal. Various sponsorship tiers available to put your brand in front of Medina County's most influential business and community leaders.",
    contact: "jaclyn@medinaohchamber.com",
    options: [
      "Presenting Sponsor",
      "Event Sponsor",
      "Reception Sponsor",
      "Supporting Sponsor",
    ],
  },
  {
    event: "Member Meetings",
    tag: "$100 + lunch fees",
    href: "/events",
    description:
      "Monthly member meetings bring together the chamber's business community for programming, networking, and updates. Table sponsorships include a display table, a 30-second podium commercial, and logo placement on the event registration page and all promotional emails and social media.",
    contact: "stephanie@medinaohchamber.com",
    options: [
      "Display table at the event",
      "30-second podium commercial",
      "Logo on event registration page",
      "Logo in promotional emails & social media",
    ],
  },
  {
    event: "Safety Council Meetings",
    tag: "Monthly",
    href: "/programs/safety-council",
    description:
      "Monthly workplace safety meetings at Williams on the Lake. Sponsors get a display table, podium time, and logo placement on the Safety Council website and promotional materials — reaching Medina County's employer community every month.",
    contact: "safety@medinaohchamber.com",
    options: [
      "Display table at the meeting",
      "Podium presentation time",
      "Logo on Safety Council website",
      "Logo in promotional materials",
    ],
  },
];

const ribbonCuttingDetails = [
  {
    title: "Eligible Milestones",
    items: [
      "Grand openings (within first year of business)",
      "New locations",
      "Ownership or management changes",
      "Renovations or expansions",
    ],
  },
  {
    title: "What's Included",
    items: [
      "Chamber staff and ambassador attendance",
      "Ceremonial scissors and ribbon",
      "Promotional graphics in the chamber's weekly email",
      "Facebook post with event photos",
    ],
  },
  {
    title: "How to Book",
    items: [
      "Available to chamber members only",
      "2+ weeks advance notice recommended",
      "Monday–Friday, latest start time 4:00 PM",
      "Contact Stephanie to schedule",
    ],
  },
];

export default function SponsorshipsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Events</p>
        <h1 className="text-display">
          Sponsorships &amp;
          <br />
          <span className="text-accent">Ribbon Cuttings</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          Put your brand in front of Medina County&apos;s business community —
          at the events they actually attend. Or celebrate your business
          milestone with a chamber ribbon cutting.
        </p>
        <div className="mt-10">
          <a
            href="mailto:stephanie@medinaohchamber.com"
            className="
              inline-flex items-center px-8 py-4
              bg-accent hover:bg-accent-hover
              text-white font-bold text-body
              rounded-[var(--radius-md)]
              transition-colors
            "
          >
            Talk to Stephanie About Sponsorship →
          </a>
        </div>
      </section>

      {/* Sponsorship opportunities */}
      <section className="mt-20">
        <h2 className="text-overline text-cambridge mb-8">Sponsorship Opportunities</h2>
        <div className="space-y-6">
          {sponsorships.map((s) => (
            <div
              key={s.event}
              className="p-8 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <span className="text-caption text-cambridge font-bold uppercase tracking-wider">
                    {s.tag}
                  </span>
                  <h2 className="text-h3 mt-1">{s.event}</h2>
                </div>
                <Link
                  href={s.href}
                  className="shrink-0 text-caption font-bold text-cambridge hover:text-cambridge/80 transition-colors"
                >
                  View event →
                </Link>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <p className="text-body-sm text-text-secondary leading-relaxed">
                  {s.description}
                </p>
                <div>
                  <p className="text-caption text-text-tertiary uppercase tracking-wider mb-3">
                    Sponsorship Options
                  </p>
                  <ul className="space-y-1.5">
                    {s.options.map((o) => (
                      <li key={o} className="flex items-center gap-2 text-body-sm text-text-secondary">
                        <svg className="w-4 h-4 text-cambridge shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        {o}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={`mailto:${s.contact}`}
                    className="inline-block mt-4 text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
                  >
                    {s.contact} →
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Ribbon Cuttings */}
      <section className="mt-24">
        <h2 className="text-overline text-cambridge mb-3">Ribbon Cuttings</h2>
        <h3 className="text-h2 mb-6">Celebrate Your Milestone</h3>
        <p className="text-body text-text-secondary max-w-2xl leading-relaxed mb-10">
          The chamber shows up for your big moments. Grand openings, new
          locations, renovations, and expansions all qualify for a ribbon
          cutting — with chamber staff, ambassadors, and social media coverage
          included.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {ribbonCuttingDetails.map((section) => (
            <div
              key={section.title}
              className="p-6 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
            >
              <h4 className="text-h4 mb-4">{section.title}</h4>
              <ul className="space-y-2">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-body-sm text-text-secondary">
                    <svg className="w-4 h-4 text-cambridge shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-20 p-10 lg:p-16 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-h2">Ready to get in the room?</h2>
            <p className="text-body-lg text-text-secondary mt-4">
              Contact Stephanie Mueller to learn about available sponsorship
              packages, pricing, and how to schedule your ribbon cutting.
              She knows every event inside and out.
            </p>
          </div>
          <div className="space-y-4">
            <a
              href="mailto:stephanie@medinaohchamber.com"
              className="
                block w-full text-center py-3 px-6
                bg-accent hover:bg-accent-hover
                text-white font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Email Stephanie →
            </a>
            <a
              href="tel:+13307238773"
              className="
                block w-full text-center py-3 px-6
                border border-border-primary hover:border-text-tertiary
                text-text-primary font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              (330) 723-8773
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
