import type { Metadata } from "next";
import Link from "next/link";
import { totalCount } from "@/data/members";
import { FadeIn } from "@/components/FadeIn";

import { safeJsonLd } from "@/lib/json-ld";
import { headers } from "next/headers";
export const metadata: Metadata = {
  title: "Your First 30 Days",
  description:
    "New to the Greater Medina Chamber of Commerce? Here's a 7-step onboarding checklist to get the most out of your membership in your first month — build your profile, attend your first event, join a committee, and more.",
  openGraph: {
    title: "Your First 30 Days — Medina Chamber Onboarding Checklist",
    description:
      "7-step checklist for new Chamber members. Build your profile, meet the community, and turn membership into momentum in your first month.",
  },
  alternates: { canonical: "/membership/first-30-days" },
};

interface Step {
  number: string;
  week: string;
  time: string;
  title: string;
  why: string;
  actions: string[];
  link?: { label: string; href: string; external?: boolean };
}

const steps: Step[] = [
  {
    number: "01",
    week: "Week 1",
    time: "10 minutes",
    title: "Complete your Member Hub profile",
    why:
      `Members find members through the directory. Your profile is how ${totalCount}+ Medina County businesses discover you when they search for what you do. A blank profile is a missed connection.`,
    actions: [
      "Log in to the Member Hub (link sent in your welcome email)",
      "Add your business description, categories, and hours",
      "Upload your logo and cover photo",
      "Link your website and social profiles",
    ],
    link: {
      label: "Open Member Hub",
      href: "https://greatermedinachamberofcommerce.growthzoneapp.com/a/MIC/Login",
      external: true,
    },
  },
  {
    number: "02",
    week: "Week 1",
    time: "30 minutes",
    title: "Schedule a 1:1 orientation with Stephanie",
    why:
      "Stephanie walks you through every benefit, helps you pick the right committees and events, and makes sure you get the most out of membership from day one. This is the fastest way to turn membership into momentum.",
    actions: [
      "Email Stephanie to book a call or office visit",
      "Bring a list of your business goals for the year",
      "Leave with a personalized action plan",
    ],
    link: {
      label: "Email Stephanie",
      href: "mailto:stephanie@medinaohchamber.com",
    },
  },
  {
    number: "03",
    week: "Week 2",
    time: "1–2 hours",
    title: "Attend your first event",
    why:
      "Most members make their first meaningful connection at their first event. Don't wait — the longer you delay, the easier it gets to put off. Pick any upcoming event and just show up.",
    actions: [
      "Check the upcoming events calendar",
      "Pick one that fits your schedule (Networking WOW, Chamber Chat, and mixers are great starters)",
      "Register online",
      "Mention at check-in that you're a new member — we'll help introduce you around",
    ],
    link: { label: "Browse Upcoming Events", href: "/events" },
  },
  {
    number: "04",
    week: "Week 2",
    time: "2 minutes",
    title: "Follow the Chamber on social",
    why:
      "Events, member spotlights, and Chamber announcements go out on social first. Following keeps you in the loop without relying on email alone — and it's how you start getting seen in the community.",
    actions: [
      "Follow @medinachamber on Facebook and Instagram",
      "Connect with Greater Medina Chamber on LinkedIn",
      "Tag the Chamber when you post about your business wins",
    ],
  },
  {
    number: "05",
    week: "Week 3",
    time: "15 minutes",
    title: "Review committees and join one",
    why:
      "Committees are where relationships get built. An event is fun; a committee is family. Nine committees cover everything from golf and ATHENA awards to business advocacy and marketing. Pick the one that aligns with your business goals.",
    actions: [
      "Review the committee list and descriptions",
      "Pick one (or two) that match your interests",
      "Email the Chamber to express interest",
      "Attend your first committee meeting",
    ],
    link: { label: "See Committees & Councils", href: "/membership/committees" },
  },
  {
    number: "06",
    week: "Week 3",
    time: "60–90 minutes",
    title: "Register for a workshop",
    why:
      "Chamber workshops are built for fast wins. Come in at 9, leave with something you can use by lunch. Topics rotate — marketing, leadership, workforce, compliance — all taught by experts from the Medina business community.",
    actions: [
      "Check the events calendar for upcoming workshops",
      "Register at the member rate",
      "Bring a teammate if the topic applies to them",
    ],
    link: { label: "Browse Workshops", href: "/events" },
  },
  {
    number: "07",
    week: "Week 4",
    time: "15 minutes",
    title: "Explore sponsorships and visibility options",
    why:
      "Your membership tier sets your baseline visibility. Sponsorships and ad placements compound that — they're how growing businesses stay top of mind across the Chamber network. Even small sponsorships get your name in front of every member.",
    actions: [
      "Review sponsorship opportunities at events you care about",
      "Ask about newsletter ads and digital placements",
      "Consider upgrading to Visibility Plus for 4 free newsletter ads per year",
    ],
    link: {
      label: "See Sponsorships & Ribbon Cuttings",
      href: "/events/sponsorships",
    },
  },
];

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://medinachamber.com" },
    { "@type": "ListItem", position: 2, name: "Membership", item: "https://medinachamber.com/membership/benefits" },
    { "@type": "ListItem", position: 3, name: "First 30 Days" },
  ],
};

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "First 30 Days — Greater Medina Chamber of Commerce Onboarding",
  description:
    "A 7-step checklist for new Chamber members to get the most out of membership in their first month.",
  totalTime: "P30D",
  step: steps.map((s, i) => ({
    "@type": "HowToStep",
    position: i + 1,
    name: s.title,
    text: s.why,
  })),
};

export default async function First30DaysPage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: safeJsonLd(howToJsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-caption text-text-tertiary mb-10">
          <Link
            href="/membership/benefits"
            className="hover:text-text-primary transition-colors"
          >
            Membership
          </Link>
          <span>/</span>
          <span className="text-text-secondary">First 30 Days</span>
        </nav>

        {/* Hero */}
        <section className="max-w-3xl">
          <p className="text-overline text-cambridge mb-4">
            New Member Onboarding
          </p>
          <h1 className="text-display">
            Your First
            <br />
            <span className="text-accent">30 Days.</span>
          </h1>
          <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
            Seven steps to turn membership into momentum. Written for
            time-starved business owners — everything here is optimized for
            fast wins and real connections, not busywork.
          </p>
        </section>

        {/* Overview callout */}
        <FadeIn>
          <section className="mt-12 p-8 lg:p-10 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] relative overflow-hidden">
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-cambridge/10 rounded-full blur-3xl" />
            <div className="relative grid md:grid-cols-3 gap-6 items-center">
              <div className="md:col-span-2">
                <p className="text-overline text-cambridge mb-3">
                  Here&apos;s the promise
                </p>
                <p className="text-h3">
                  Follow this checklist in your first month and your
                  membership will pay for itself — often in one referral, one
                  saved contract, or one introduction at a mixer.
                </p>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-1 gap-4 text-center md:text-left">
                <div>
                  <p className="text-h2 text-cambridge leading-none">7</p>
                  <p className="text-caption text-text-tertiary uppercase tracking-wider mt-1">
                    Steps
                  </p>
                </div>
                <div>
                  <p className="text-h2 text-cambridge leading-none">4</p>
                  <p className="text-caption text-text-tertiary uppercase tracking-wider mt-1">
                    Weeks
                  </p>
                </div>
                <div>
                  <p className="text-h2 text-cambridge leading-none">~3h</p>
                  <p className="text-caption text-text-tertiary uppercase tracking-wider mt-1">
                    Total time
                  </p>
                </div>
              </div>
            </div>
          </section>
        </FadeIn>

        {/* Steps */}
        <section className="mt-20">
          <div className="space-y-6">
            {steps.map((step, i) => (
              <FadeIn key={step.number} delay={i * 60}>
                <div
                  className="
                    grid lg:grid-cols-[auto_minmax(0,1fr)_auto] gap-6 lg:gap-10
                    p-6 sm:p-8 lg:p-10 overflow-hidden
                    bg-bg-secondary border border-border-secondary
                    rounded-[var(--radius-lg)]
                    hover:border-cambridge/40 transition-colors
                  "
                >
                  {/* Step number + week */}
                  <div className="lg:w-32 shrink-0">
                    <p className="text-display text-cambridge leading-none">
                      {step.number}
                    </p>
                    <p className="text-caption text-text-tertiary mt-2 uppercase tracking-wider">
                      {step.week}
                    </p>
                    <p className="text-caption text-cambridge font-bold mt-1">
                      ⏱ {step.time}
                    </p>
                  </div>

                  {/* Main content */}
                  <div className="min-w-0">
                    <h2 className="text-h3">{step.title}</h2>
                    <p className="text-body-sm text-text-secondary mt-3 leading-relaxed">
                      {step.why}
                    </p>

                    <div className="mt-5">
                      <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-2">
                        Action
                      </p>
                      <ul className="space-y-1.5">
                        {step.actions.map((action) => (
                          <li
                            key={action}
                            className="flex items-start gap-2 text-body-sm text-text-primary"
                          >
                            <svg
                              className="w-4 h-4 shrink-0 mt-0.5 text-cambridge"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* CTA */}
                  {step.link && (
                    <div className="lg:w-48 flex lg:items-center">
                      {step.link.external ? (
                        <a
                          href={step.link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="
                            inline-flex items-center justify-center w-full px-5 py-3
                            bg-accent hover:bg-accent-hover
                            text-white font-bold text-body-sm
                            rounded-[var(--radius-md)]
                            transition-colors whitespace-nowrap
                          "
                        >
                          {step.link.label} ↗
                        </a>
                      ) : (
                        <Link
                          href={step.link.href}
                          className="
                            inline-flex items-center justify-center w-full px-5 py-3
                            bg-accent hover:bg-accent-hover
                            text-white font-bold text-body-sm
                            rounded-[var(--radius-md)]
                            transition-colors whitespace-nowrap
                          "
                        >
                          {step.link.label} →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* Stuck? Callout */}
        <FadeIn>
          <section className="mt-20 p-10 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <div className="grid md:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <p className="text-overline text-cambridge mb-3">
                  Stuck on any step?
                </p>
                <h2 className="text-h3">
                  Stephanie is your onboarding concierge.
                </h2>
                <p className="text-body text-text-secondary mt-3 leading-relaxed max-w-2xl">
                  Stephanie Mueller runs membership and events for the Chamber.
                  She&apos;s walked hundreds of new members through exactly
                  this checklist. If anything on this page feels unclear, or
                  you want to skip straight to the 1:1 orientation, just
                  reach out — she&apos;ll handle the rest.
                </p>
              </div>
              <div className="flex flex-col gap-3 md:w-56">
                <a
                  href="mailto:stephanie@medinaohchamber.com"
                  className="
                    inline-flex items-center justify-center px-5 py-3
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
                    inline-flex items-center justify-center px-5 py-3
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
        </FadeIn>

        {/* Next steps */}
        <section className="mt-16">
          <FadeIn>
            <div className="max-w-2xl mb-8">
              <p className="text-overline text-cambridge mb-3">What&apos;s Next</p>
              <h2 className="text-h2">Keep the momentum going.</h2>
              <p className="text-body-lg text-text-secondary mt-4">
                Once you&apos;ve worked through the first 30 days, here are
                the deeper resources to keep building.
              </p>
            </div>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                label: "Full Benefits List",
                href: "/membership/benefits",
                description: "Every benefit across all three tiers.",
              },
              {
                label: "Member Savings Programs",
                href: "/membership/savings",
                description: "Health insurance, workers' comp, energy, HR, recreation discounts.",
              },
              {
                label: "Committees & Councils",
                href: "/membership/committees",
                description: "Nine committees shaping Chamber programs.",
              },
              {
                label: "Upcoming Events",
                href: "/events",
                description: "Networking WOW, Chamber Chat, workshops, and more.",
              },
              {
                label: "Compass Leadership Program",
                href: "/programs/compass",
                description: "Five-session flagship leadership development.",
              },
              {
                label: "Chamber Directory",
                href: "/membership/directory",
                description: `Browse all ${totalCount}+ member businesses.`,
              },
            ].map((link, i) => (
              <FadeIn key={link.href} delay={i * 50}>
                <Link
                  href={link.href}
                  className="
                    group block p-6 h-full
                    bg-bg-secondary border border-border-secondary
                    rounded-[var(--radius-lg)]
                    hover:border-cambridge/40 transition-colors
                  "
                >
                  <p className="text-body font-bold text-text-primary group-hover:text-cambridge transition-colors">
                    {link.label} →
                  </p>
                  <p className="text-caption text-text-tertiary mt-2">
                    {link.description}
                  </p>
                </Link>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* Not yet a member CTA */}
        <FadeIn>
          <section className="mt-20 p-10 lg:p-16 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] relative overflow-hidden">
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-cambridge/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />
            <div className="relative grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <p className="text-overline text-cambridge mb-4">
                  Not a member yet?
                </p>
                <h2 className="text-h2">
                  Start the clock on your first 30 days.
                </h2>
                <p className="text-body-lg text-text-secondary mt-4">
                  Apply for membership today and Stephanie will walk you
                  through this exact checklist as part of your welcome. Three
                  tiers starting at $345/year.
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
                  Apply for Membership →
                </Link>
                <Link
                  href="/membership/pricing"
                  className="
                    block w-full text-center py-3 px-6
                    border border-border-primary hover:border-text-tertiary
                    text-text-primary font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  Compare the Three Tiers
                </Link>
              </div>
            </div>
          </section>
        </FadeIn>
      </div>
    </>
  );
}
