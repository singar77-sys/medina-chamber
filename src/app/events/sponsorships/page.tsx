import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { jaclyn, stephanie } from "@/data/staff";
import { mailto } from "@/lib/format";
import { SponsorshipForm } from "./SponsorshipForm";

export const metadata: Metadata = {
  title: "Sponsorships & Ribbon Cuttings",
  description:
    "Advertise in the Medina Means Business magazine and e-newsletter, and sponsor Greater Medina Chamber events, Golf Outing, Athena Awards, Member Meetings, and Safety Council. Published ad rates plus ribbon cuttings for Medina County businesses.",
  openGraph: {
    title: "Sponsorships & Ribbon Cuttings | Greater Medina Chamber of Commerce",
    description:
      "Put your brand in front of Medina County's business community. Sponsorship packages for every budget.",
  },
  alternates: { canonical: "/events/sponsorships" },
};

interface SponsorshipCard {
  event: string;
  tag: string;
  href: string;
  description: string;
  contact: string;
  options: string[];
  price?: string;
}

const sponsorships: SponsorshipCard[] = [
  {
    event: "Golf Outing",
    tag: "Flagship Event",
    href: "/programs/golf-outing",
    description:
      "The chamber's flagship outing of the year and a major driver of the funding behind Chamber programs. Sponsorship options include hole/tee sponsors, Par 3 \"spend the day\" sponsors, comfort station sponsors, and raffle prize donations. Maximum exposure with Medina County's business community in one afternoon.",
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
    tag: "Premier Audience",
    href: "/programs/athena-awards",
    description:
      "Annual awards ceremony co-hosted with WJ Creative Studio. Various sponsorship tiers available to put your brand in front of Medina County's most influential business and community leaders.",
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
    tag: "Podium & Spotlight",
    href: "/events",
    price: "$100 table sponsorship · $75 non-profit · +$25 per attendee for lunch · limited to 3 per meeting",
    description:
      "Regular member meetings bring together the chamber's business community for programming, networking, and updates. Table sponsorships include a display table, a 30-second podium commercial, and logo placement on the event registration page and all promotional emails and social media.",
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
    tag: "Employer Reach",
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
      "Renovations or expansions",
    ],
  },
  {
    title: "What's Included",
    items: [
      "Chamber staff and ambassador attendance",
      "Ceremonial ribbon and the chamber's giant scissors for the big cut",
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

const MAGAZINE_AD_EMAIL = "wjcsproduction@outlook.com";
const NEWSLETTER_AD_EMAIL = "memberservices@medinaohchamber.com";

const magazineStats = [
  { value: "Quarterly", label: "Digital interactive issues" },
  { value: "9,000+", label: "Subscribers & followers" },
  { value: "3,000", label: "Avg. monthly site visitors" },
];

const magazineRates = [
  {
    tier: "Issue Sponsor",
    price: "$675",
    spec: "Full-page insertion plus an email release banner ad, three social sponsor mentions, and a cover headline spotlight.",
    featured: true,
  },
  { tier: "Full Page", price: "$300", spec: "8.5\"w x 11\"h. Includes one social highlight." },
  { tier: "Half Page", price: "$150", spec: "8\"w x 5\"h. Includes one social group highlight." },
  { tier: "Quarter Page", price: "$75", spec: "3.875\"w x 5\"h. Includes one social group highlight." },
];

const magazinePremium = [
  { label: "Inside Front Cover (L or R)", price: "+$100" },
  { label: "Back Cover", price: "+$50" },
  { label: "Cover Headline Link", price: "+$75" },
];

const magazineDeadlines = [
  { q: "Q1", submit: "Mar 10", release: "Apr 10" },
  { q: "Q2", submit: "Jun 15", release: "Jul 15" },
  { q: "Q3", submit: "Sep 15", release: "Oct 15" },
  { q: "Q4", submit: "Dec 15", release: "Jan 15" },
];

const newsletterRates = [
  { tier: "Single Ad Insertion", price: "$50", spec: "One-time ad with website link. 4\"w x 6\"h." },
  {
    tier: "Triple Ad Insertion",
    price: "$125",
    note: "Non-profit rate: $75",
    spec: "Three insertions with website link. 4\"w x 6\"h.",
  },
  { tier: "Chamber Ad Spotlight", price: "$150", spec: "Featured article, photo, and website link. 1,000-word limit." },
  { tier: "Annual Newsletter Sponsor", price: "$240", spec: "12-month business-card ad with website link. 3.5\"w x 2\"h." },
];

export default function SponsorshipsPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
        {/* Ghosted chamber ribbon-cutting backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/medina-chamber-ribbon-cutting-hero.webp"
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
          <div className="mt-f21 flex flex-wrap gap-f13">
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
            <a
              href="#advertising-rates"
              className="
                inline-flex items-center px-f21 py-f13
                border border-border-primary hover:border-text-tertiary
                text-text-primary font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              View Advertising Rates
            </a>
          </div>
          </div>
        </div>
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
                      {s.price && (
                        <p className="text-body-sm text-text-tertiary mt-f3">{s.price}</p>
                      )}
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

      {/* Advertising Rates — magazine + e-newsletter */}
      <section
        id="advertising-rates"
        className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89 scroll-mt-f89"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <p className="text-overline text-cambridge mb-f8">Advertising Rates</p>
            <h2 className="text-h2">Medina Means Business Magazine</h2>
            <p className="text-body text-text-secondary max-w-2xl leading-relaxed mt-f13">
              The chamber&apos;s quarterly digital magazine puts your brand in front of
              Medina County&apos;s most engaged business audience, with extended shelf
              life, clickable links, and Chamber-branded credibility. All rates are for a
              one-time insertion.
            </p>
          </FadeIn>

          {/* Publication stats */}
          <div className="mt-f21 grid grid-cols-3 gap-f13 max-w-2xl">
            {magazineStats.map((s, i) => (
              <FadeIn key={s.label} delay={i * 70}>
                <div className="p-f21 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)] text-center h-full">
                  <p className="text-h3 text-oxford [[data-theme=dark]_&]:text-cambridge leading-none">
                    {s.value}
                  </p>
                  <p className="text-caption text-text-tertiary mt-f8 uppercase tracking-wider">
                    {s.label}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* Magazine display ad rates */}
          <div className="mt-f34 grid sm:grid-cols-2 lg:grid-cols-4 gap-f21">
            {magazineRates.map((r, i) => (
              <FadeIn key={r.tier} delay={i * 60}>
                <div
                  className={`flex flex-col h-full p-f21 rounded-[var(--radius-lg)] border ${
                    r.featured
                      ? "bg-oxford border-cambridge"
                      : "bg-bg-primary border-border-secondary"
                  }`}
                >
                  <p
                    className={`text-caption font-bold uppercase tracking-wider ${
                      r.featured ? "text-cambridge" : "text-text-tertiary"
                    }`}
                  >
                    {r.tier}
                  </p>
                  <p
                    className={`text-display leading-none mt-f8 ${
                      r.featured ? "text-white" : "text-text-primary"
                    }`}
                  >
                    {r.price}
                  </p>
                  <p
                    className={`text-body-sm mt-f13 leading-relaxed ${
                      r.featured ? "text-white/80" : "text-text-secondary"
                    }`}
                  >
                    {r.spec}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* Premium placement + schedule */}
          <div className="mt-f21 grid md:grid-cols-2 gap-f21">
            <div className="p-f21 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)]">
              <p className="text-caption font-bold text-text-tertiary uppercase tracking-wider mb-f13">
                Premium Placement (full-page ads only)
              </p>
              <ul className="space-y-f8">
                {magazinePremium.map((p) => (
                  <li
                    key={p.label}
                    className="flex items-center justify-between gap-f8 text-body-sm text-text-secondary border-b border-border-secondary pb-f8"
                  >
                    <span>{p.label}</span>
                    <span className="font-bold text-text-primary">{p.price}</span>
                  </li>
                ))}
              </ul>
              <p className="text-caption text-text-tertiary mt-f13 leading-relaxed">
                First-come, first-served with limited availability. Save 5% with a
                full-year (4-issue) commitment paid in full.
              </p>
            </div>

            <div className="p-f21 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)]">
              <p className="text-caption font-bold text-text-tertiary uppercase tracking-wider mb-f13">
                Submission &amp; Release Schedule
              </p>
              <ul className="space-y-f8">
                {magazineDeadlines.map((d) => (
                  <li
                    key={d.q}
                    className="flex items-center justify-between gap-f8 text-body-sm text-text-secondary border-b border-border-secondary pb-f8"
                  >
                    <span className="font-bold text-text-primary">{d.q}</span>
                    <span>Submit {d.submit}</span>
                    <span className="text-text-tertiary">Release {d.release}</span>
                  </li>
                ))}
              </ul>
              <p className="text-caption text-text-tertiary mt-f13">
                Confirm current-year dates when you reserve your spot.
              </p>
            </div>
          </div>

          <FadeIn>
            <a
              href={`mailto:${MAGAZINE_AD_EMAIL}`}
              className="inline-block mt-f21 text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
            >
              Reserve a magazine ad — {MAGAZINE_AD_EMAIL} →
            </a>
          </FadeIn>

          {/* E-Newsletter */}
          <div className="mt-f55">
            <FadeIn>
              <h3 className="text-h3">E-Newsletter Advertising</h3>
              <p className="text-body-sm text-text-secondary max-w-2xl leading-relaxed mt-f8">
                Reach the chamber&apos;s member inbox directly. Every e-newsletter ad
                includes a website link.
              </p>
            </FadeIn>
            <div className="mt-f21 grid sm:grid-cols-2 lg:grid-cols-4 gap-f21">
              {newsletterRates.map((r, i) => (
                <FadeIn key={r.tier} delay={i * 60}>
                  <div className="flex flex-col h-full p-f21 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)]">
                    <p className="text-caption font-bold text-text-tertiary uppercase tracking-wider">
                      {r.tier}
                    </p>
                    <p className="text-h2 leading-none mt-f8 text-text-primary">{r.price}</p>
                    {r.note && (
                      <p className="text-caption text-cambridge font-bold mt-f3">{r.note}</p>
                    )}
                    <p className="text-body-sm text-text-secondary mt-f13 leading-relaxed">
                      {r.spec}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
            <FadeIn>
              <a
                href={`mailto:${NEWSLETTER_AD_EMAIL}`}
                className="inline-block mt-f21 text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
              >
                Book an e-newsletter ad — {NEWSLETTER_AD_EMAIL} →
              </a>
            </FadeIn>
          </div>
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
