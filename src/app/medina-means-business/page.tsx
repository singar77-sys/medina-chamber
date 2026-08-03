import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { GazeboHero } from "@/components/GazeboHero";
import { activeCommunities, getMembersByCity } from "@/data/communities";
import { FadeIn } from "@/components/FadeIn";
import { CountUp } from "@/components/CountUp";

import { safeJsonLd } from "@/lib/json-ld";

// ISR: re-render daily so the "years of advocacy" count (new Date() at build
// time) refreshes each New Year instead of freezing until the next deploy.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Medina Means Business",
  description:
    `Medina Means Business is the official tagline of the Greater Medina Chamber of Commerce, and a statement of fact. Member businesses, ${new Date().getFullYear() - 1938}+ years of chamber work, and a manufacturing economy that outperforms. Here's what it actually means.`,
  openGraph: {
    title: "Medina Means Business | Greater Medina Chamber of Commerce",
    description: `The tagline, the magazine, and the reality. ${new Date().getFullYear() - 1938}+ years of Chamber work, and what Medina County's business community looks like today.`,
  },
  alternates: { canonical: "/medina-means-business" },
};

const anchorCompanies = [
  { name: "RPM International", industry: "Specialty coatings, sealants, and building materials" },
  { name: "Westfield Insurance", industry: "Commercial and personal insurance" },
  { name: "MTD Products", industry: "Outdoor power equipment manufacturing" },
];

const webPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Medina Means Business",
  description:
    "The official tagline of the Greater Medina Chamber of Commerce and a statement of fact about Medina County's business community.",
  url: "https://medinachamber.com/medina-means-business",
  isPartOf: {
    "@type": "WebSite",
    name: "Greater Medina Chamber of Commerce",
    url: "https://medinachamber.com",
  },
  about: {
    "@type": "Organization",
    "@id": "https://medinachamber.com/#organization",
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://medinachamber.com" },
    { "@type": "ListItem", position: 2, name: "Medina Means Business" },
  ],
};

export default function MedinaMeansBusinessPage() {
  const topCommunities = activeCommunities
    .map((c) => ({
      ...c,
      memberCount: getMembersByCity(c.cityMatch).length,
    }))
    .sort((a, b) => b.memberCount - a.memberCount);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(webPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />

      
      <section className="relative min-h-[80dvh] flex items-end overflow-hidden">
        {/* Background photos — theme-aware */}
        <GazeboHero />
        {/* Gradient overlay — white wash in light, dark wash in dark mode */}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/85 to-white/50 [[data-theme=dark]_&]:from-oxford [[data-theme=dark]_&]:via-oxford/60 [[data-theme=dark]_&]:to-oxford/15" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 pb-16 lg:pb-24 pt-32 w-full">
          <div className="max-w-4xl">
            <p className="text-overline text-emerald [[data-theme=dark]_&]:text-cambridge mb-4 tracking-widest">
              The Tagline. The Magazine. The Reality.
            </p>
            <h1 className="text-display text-oxford [[data-theme=dark]_&]:text-white leading-[0.95]">
              <span className="block">Medina</span>
              <span className="block">Means</span>
              <span className="block text-emerald [[data-theme=dark]_&]:text-cambridge">Business.</span>
            </h1>
            <p className="text-body-lg text-text-secondary [[data-theme=dark]_&]:text-white/80 mt-8 max-w-2xl">
              Three words the Greater Medina Chamber of Commerce has been
              earning since 1938. A tagline, yes, but also a statement of
              fact about what Medina County actually is.
            </p>
          </div>
        </div>
      </section>

      {/* It's not a slogan. It's a statement of fact. */}
      <section className="relative overflow-hidden bg-bg-secondary border-y border-border-secondary">
        {/* Ghosted Medina Square storefronts backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/medina-square-storefronts.webp"
            alt=""
            fill
            className="object-cover opacity-[0.10]"
            sizes="100vw"
            quality={60}
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8 py-20 lg:py-28">
          <FadeIn>
            <div className="max-w-3xl">
              <p className="text-overline text-cambridge mb-4">What it means</p>
              <h2 className="text-h2 leading-tight">
                It&apos;s not a slogan. It&apos;s a statement of fact.
              </h2>
              <div className="mt-8 space-y-5 text-body-lg text-text-secondary leading-relaxed">
                <p>
                  Medina County is the home of Fortune-ranked manufacturers, a
                  thriving small-business community, and some of Ohio&apos;s
                  most recognizable brands. It&apos;s where global firms build
                  their headquarters and where solopreneurs open their first
                  storefronts on the Square.
                </p>
                <p>
                  The Chamber didn&apos;t invent that. We built a member
                  network around it, connecting the businesses, advocating
                  for the policies, and creating the programs that keep
                  Medina&apos;s economy compounding year after year.
                </p>
                <p className="text-text-primary font-bold">
                  When we say &ldquo;Medina Means Business,&rdquo; we mean it
                  the way people who live here mean it. As a fact.
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-20 lg:py-28">
        <FadeIn>
          <div className="max-w-2xl mb-12">
            <p className="text-overline text-cambridge mb-4">By the numbers</p>
            <h2 className="text-h2">
              What Medina County&apos;s business community looks like today.
            </h2>
          </div>
        </FadeIn>
        <div className="grid grid-cols-3 gap-6">
          {[
            { end: 1938, label: "Chamber Founded", suffix: "" },
            { end: new Date().getFullYear() - 1938, label: "Years of Advocacy", suffix: "+" },
            { end: 9, label: "Active Committees", suffix: "" },
          ].map((s, i) => (
            <FadeIn key={s.label} delay={i * 80}>
              <div className="p-8 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] text-center">
                <p className="text-display text-oxford [[data-theme=dark]_&]:text-cambridge leading-none">
                  <CountUp end={s.end} suffix={s.suffix} duration={s.end > 100 ? 2400 : 1600} />
                </p>
                <p className="text-caption text-text-tertiary mt-2 uppercase tracking-wider">
                  {s.label}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Anchor Companies */}
      <section className="bg-bg-secondary border-y border-border-secondary">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-20 lg:py-28 relative overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-cambridge/10 rounded-full blur-3xl" />
          <FadeIn>
            <div className="relative max-w-3xl">
              <p className="text-overline text-cambridge mb-4">
                Global reach, local roots
              </p>
              <h2 className="text-h2">
                Medina County is the headquarters address for real giants.
              </h2>
              <p className="text-body-lg text-text-secondary mt-6">
                When international manufacturers and insurance firms choose
                where to put their HQ, they choose Medina. Here&apos;s some
                of what that means in practice.
              </p>
            </div>
          </FadeIn>

          <div className="relative mt-12 grid md:grid-cols-3 gap-6">
            {anchorCompanies.map((company, i) => (
              <FadeIn key={company.name} delay={i * 100}>
                <div className="p-8 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)] h-full">
                  <p className="text-h3">{company.name}</p>
                  <p className="text-body-sm text-cambridge mt-3 font-bold">
                    {company.industry}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn>
            <p className="relative text-body-sm text-text-tertiary mt-10 max-w-2xl">
              And member businesses across every sector, retail,
              healthcare, professional services, construction, hospitality,
              food and beverage, technology, agriculture, and the trades.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Where Medina Means Business */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-20 lg:py-28">
        <FadeIn>
          <div className="max-w-2xl mb-12">
            <p className="text-overline text-cambridge mb-4">
              Across the county
            </p>
            <h2 className="text-h2">
              Every community in Medina County does business.
            </h2>
            <p className="text-body-lg text-text-secondary mt-4">
              The Chamber serves {activeCommunities.length} communities and
              townships across Medina County. Click through to see the
              businesses and events happening in each.
            </p>
          </div>
        </FadeIn>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {topCommunities.map((c, i) => (
            <FadeIn key={c.slug} delay={i * 50}>
              <Link
                href={`/community/${c.slug}`}
                className="
                  group block p-6 h-full
                  bg-bg-secondary border border-border-secondary
                  rounded-[var(--radius-lg)]
                  hover:border-cambridge/40 transition-colors
                "
              >
                <div className="flex items-baseline justify-between">
                  <p className="text-h4 text-text-primary group-hover:text-cambridge transition-colors">
                    {c.name}
                  </p>
                </div>
                <p className="text-caption text-text-tertiary mt-1">
                  {c.tagline}
                </p>
                <p className="mt-3 text-caption text-cambridge font-bold">
                  Explore →
                </p>
              </Link>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* The Magazine */}
      <section className="bg-bg-secondary border-y border-border-secondary">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-[1fr_auto] gap-10 items-center">
            <FadeIn>
              <div className="max-w-2xl">
                <p className="text-overline text-cambridge mb-4">
                  Medina Means Business Magazine
                </p>
                <h2 className="text-h2">
                  The tagline is also the name of the magazine.
                </h2>
                <p className="text-body-lg text-text-secondary mt-6">
                  The Chamber publishes a quarterly magazine called{" "}
                  <em>Medina Means Business</em>, featuring local business
                  profiles, community stories, Chamber updates, and advertising
                  opportunities. Every member gets it. Every issue is a
                  snapshot of what&apos;s happening across Medina County
                  right now.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    href="/news/magazine"
                    className="
                      inline-flex items-center px-6 py-3
                      bg-accent hover:bg-accent-hover
                      text-white font-bold text-body-sm
                      rounded-[var(--radius-md)]
                      transition-colors
                    "
                  >
                    Read the Latest Issue →
                  </Link>
                  <Link
                    href="/news/magazine"
                    className="
                      inline-flex items-center px-6 py-3
                      border border-border-primary hover:border-text-tertiary
                      text-text-primary font-bold text-body-sm
                      rounded-[var(--radius-md)]
                      transition-colors
                    "
                  >
                    See All Issues
                  </Link>
                </div>
                <p className="mt-6 text-body-sm">
                  <Link
                    href="/events/sponsorships#advertising-rates"
                    className="font-bold text-cambridge hover:text-cambridge/80 transition-colors"
                  >
                    See magazine advertising rates →
                  </Link>
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Explore the Chamber */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-20 lg:py-28">
        <FadeIn>
          <div className="max-w-2xl mb-12">
            <p className="text-overline text-cambridge mb-4">Go Deeper</p>
            <h2 className="text-h2">
              Explore what the Chamber actually does.
            </h2>
          </div>
        </FadeIn>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: "The Member Directory",
              desc: "All member businesses in one searchable directory.",
              href: "/membership/directory",
            },
            {
              title: "Upcoming Events",
              desc: "Networking, workshops, leadership programs, and more.",
              href: "/events",
            },
            {
              title: "About the Chamber",
              desc: "The core purpose, brand story, and five values that guide everything.",
              href: "/about",
            },
            {
              title: "Advocacy",
              desc: "How the Chamber fights for a pro-business environment at every level.",
              href: "/about/advocacy",
            },
            {
              title: "Join the Chamber",
              desc: "Three membership tiers. Apply in under ten minutes.",
              href: "/membership/join",
            },
            {
              title: "First 30 Days",
              desc: "A new member onboarding checklist, turn membership into momentum.",
              href: "/membership/first-30-days",
            },
          ].map((link, i) => (
            <FadeIn key={link.href} delay={i * 60}>
              <Link
                href={link.href}
                className="
                  group block p-8 h-full
                  bg-bg-secondary border border-border-secondary
                  rounded-[var(--radius-lg)]
                  hover:border-cambridge/40 transition-colors
                "
              >
                <h3 className="text-h4 text-text-primary group-hover:text-cambridge transition-colors">
                  {link.title} →
                </h3>
                <p className="text-body-sm text-text-secondary mt-3 leading-relaxed">
                  {link.desc}
                </p>
              </Link>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pb-20 lg:pb-28">
        <FadeIn>
          <div className="p-10 lg:p-16 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] relative overflow-hidden">
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-cambridge/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />
            <div className="relative grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <p className="text-overline text-cambridge mb-4">
                  Add your name to the list
                </p>
                <h2 className="text-h2">
                  Medina Means Business, including yours.
                </h2>
                <p className="text-body-lg text-text-secondary mt-4">
                  Join businesses across Medina County. Three
                  membership tiers starting at $345/year. Apply online in
                  under ten minutes, or talk to Stephanie and get the
                  personal tour first.
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
                <Link
                  href="/about/contact"
                  className="
                    block w-full text-center py-3 px-6
                    text-cambridge font-bold text-body-sm
                    transition-colors hover:text-cambridge/80
                  "
                >
                  Talk to the Chamber
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
