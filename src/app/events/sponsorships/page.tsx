import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { jaclyn, stephanie } from "@/data/staff";
import { mailto } from "@/lib/format";
import { SponsorshipForm } from "./SponsorshipForm";

export const metadata: Metadata = {
  title: "Sponsorships & Ribbon Cuttings",
  description:
    "Sponsor Greater Medina Chamber events to reach Medina County's business community, Golf Outing, Athena Awards, Member Meetings, and Safety Council. Ribbon cuttings celebrate member milestones.",
  openGraph: {
    title: "Sponsorships & Ribbon Cuttings | Greater Medina Chamber of Commerce",
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
    contact: stephanie.email,
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
    contact: jaclyn.email,
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
    contact: stephanie.email,
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
      "Monthly workplace safety meetings at Williams on the Lake. Sponsors get a display table, podium time, and logo placement on the Safety Council website and promotional materials, reaching Medina County's employer community every month.",
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
    <>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pt-f144 pb-f89 min-h-[42rem]">
        <div className="max-w-3xl">
          <p className="text-overline text-cambridge mb-f8">Events</p>
          <h1 className="text-display">
            <span className="block">Sponsorships &amp;</span>
            <span className="block text-accent">Ribbon Cuttings</span>
          </h1>
          <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
            Put your brand in front of Medina County&apos;s business community, 
            at the events they actually attend. Or celebrate your business
            milestone with a chamber ribbon cutting.
          </p>
          <div className="mt-f21">
            <a
              href="#become-a-sponsor"
              className="
                inline-flex items-center px-f21 py-f13
                bg-accent hover:bg-accent-hover
                text-white font-bold text-body
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Become a Sponsor →
            </a>
          </div>
        </div>
      </section>

      {/* Sponsorship cards */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          <h2 className="text-overline text-cambridge mb-f21">Sponsorship Opportunities</h2>
          <div className="space-y-f21">
            {sponsorships.map((s, i) => (
              <FadeIn key={s.event} delay={i * 60}>
                <div className="p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
                  <div className="flex flex-wrap items-start justify-between gap-f8 mb-f13">
                    <div>
                      <span className="text-caption text-cambridge font-bold uppercase tracking-wider">
                        {s.tag}
                      </span>
                      <h2 className="text-h3 mt-f3">{s.event}</h2>
                    </div>
                    <Link
                      href={s.href}
                      className="shrink-0 text-caption font-bold text-cambridge hover:text-cambridge/80 transition-colors"
                    >
                      View event →
                    </Link>
                  </div>

                  <div className="grid md:grid-cols-2 gap-f21">
                    <p className="text-body-sm text-text-secondary leading-relaxed">
                      {s.description}
                    </p>
                    <div>
                      <p className="text-caption text-text-tertiary uppercase tracking-wider mb-f8">
                        Sponsorship Options
                      </p>
                      <ul className="space-y-f3">
                        {s.options.map((o) => (
                          <li key={o} className="flex items-center gap-f8 text-body-sm text-text-secondary">
                            <svg className="w-4 h-4 text-cambridge shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                            {o}
                          </li>
                        ))}
                      </ul>
                      <a
                        href={`mailto:${s.contact}`}
                        className="inline-block mt-f13 text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
                      >
                        {s.contact} →
                      </a>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* Ribbon Cuttings */}
      <section className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <p className="text-overline text-cambridge mb-f8">Ribbon Cuttings</p>
            <h2 className="text-h2">Celebrate Your Milestone</h2>
            <p className="text-body text-text-secondary max-w-2xl leading-relaxed mt-f13 mb-f21">
              The chamber shows up for your big moments. Grand openings, new
              locations, renovations, and expansions all qualify for a ribbon
              cutting, with chamber staff, ambassadors, and social media coverage
              included.
            </p>
            <div className="grid md:grid-cols-3 gap-f21">
              {ribbonCuttingDetails.map((section, i) => (
                <FadeIn key={section.title} delay={i * 80}>
                  <div className="p-f21 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)]">
                    <h4 className="text-h4 mb-f8">{section.title}</h4>
                    <ul className="space-y-f8">
                      {section.items.map((item) => (
                        <li key={item} className="flex items-start gap-f8 text-body-sm text-text-secondary">
                          <svg className="w-4 h-4 text-cambridge shrink-0 mt-f3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </FadeIn>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Become a sponsor — intake form */}
      <section id="become-a-sponsor" className="mx-auto max-w-3xl px-6 lg:px-8 py-f55 lg:py-f89 scroll-mt-f89">
        <FadeIn>
          <p className="text-overline text-cambridge mb-f8">Get Started</p>
          <h2 className="text-h2">Become a Sponsor</h2>
          <p className="text-body text-text-secondary mt-f13 mb-f34 max-w-2xl leading-relaxed">
            Tell us about your business and what you&apos;d like to sponsor. We&apos;ll follow up
            within one business day with the options and pricing that fit.
          </p>
          <SponsorshipForm />
        </FadeIn>
      </section>

      {/* Cta */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          <div className="p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <div className="grid lg:grid-cols-2 gap-f34 items-center">
              <div>
                <h2 className="text-h2">Ready to get in the room?</h2>
                <p className="text-body-lg text-text-secondary mt-f13">
                  Contact Stephanie Mueller to learn about available sponsorship
                  packages, pricing, and how to schedule your ribbon cutting.
                  She knows every event inside and out.
                </p>
              </div>
              <div className="space-y-f13">
                <a
                  href={mailto(stephanie.email)}
                  className="
                    block w-full text-center py-f13 px-f21
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
                    block w-full text-center py-f13 px-f21
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
          </div>
        </FadeIn>
      </section>
    </>
  );
}
