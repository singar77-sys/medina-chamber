import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { totalCount } from "@/data/members";
import { activeCommunities, getMembersByCity } from "@/data/communities";
import { FadeIn } from "@/components/FadeIn";
import { CountUp } from "@/components/CountUp";

export const metadata: Metadata = {
  title: "Medina Means Business",
  description:
    "Medina Means Business is the official tagline of the Greater Medina Chamber of Commerce — and a statement of fact. 511+ member businesses, nearly 90 years of chamber work, and a manufacturing economy that outperforms. Here's what it actually means.",
  openGraph: {
    title: "Medina Means Business — Greater Medina Chamber of Commerce",
    description:
      "The tagline, the magazine, and the reality. 511+ businesses, nearly 90 years of Chamber work, and what Medina County's business community looks like today.",
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* ─── Hero ─────────────────────────────────────────── */}
      <section className="relative min-h-[80vh] flex items-end overflow-hidden">
        {/* Background photos — theme-aware */}
        <Image
          src="/images/photos/gazebo-daytime-flag.jpg"
          alt="Historic Medina Square gazebo"
          fill
          className="object-cover object-center [[data-theme=dark]_&]:hidden"
          priority
          quality={85}
        />
        <Image
          src="/images/photos/gazebo-night-flag.jpg"
          alt="Historic Medina gazebo at night"
          fill
          className="object-cover object-center hidden [[data-theme=dark]_&]:block"
          priority
          quality={85}
        />
        {/* Gradient overlay — stronger for daytime, lighter for night */}
        <div className="absolute inset-0 bg-gradient-to-t from-oxford via-oxford/85 to-oxford/60 [[data-theme=dark]_&]:via-oxford/60 [[data-theme=dark]_&]:to-oxford/15" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 pb-16 lg:pb-24 pt-32 w-full">
          <div className="max-w-4xl">
            <p className="text-overline text-cambridge mb-4 tracking-widest">
              The Tagline. The Magazine. The Reality.
            </p>
            <h1 className="text-display text-white leading-[0.95]">
              Medina
              <br />
              Means
              <br />
              <span className="text-cambridge">Business.</span>
            </h1>
            <p className="text-body-lg text-white/80 mt-8 max-w-2xl">
              Three words the Greater Medina Chamber of Commerce has been
              earning since 1938. A tagline, yes — but also a statement of
              fact about what Medina County actually is.
            </p>
          </div>
        </div>
      </section>

      {/* ─── It's not a slogan. It's a statement of fact. ── */}
      <section className="bg-bg-secondary border-y border-border-secondary">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-20 lg:py-28">
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
                  The Chamber didn&apos;t invent that. We built a 511-member
                  network around it — connecting the businesses, advocating
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

      {/* ─── Stats Strip ──────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-20 lg:py-28">
        <FadeIn>
          <div className="max-w-2xl mb-12">
            <p className="text-overline text-cambridge mb-4">By the numbers</p>
            <h2 className="text-h2">
              What Medina County&apos;s business community looks like today.
            </h2>
          </div>
        </FadeIn>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { end: 1938, label: "Chamber Founded", suffix: "" },
            { end: totalCount, label: "Chamber Members", suffix: "+" },
            { end: 87, label: "Years of Advocacy", suffix: "" },
            { end: 9, label: "Active Committees", suffix: "" },
          ].map((s, i) => (
            <FadeIn key={s.label} delay={i * 80}>
              <div className="p-8 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] text-center">
                <p className="text-display text-oxford leading-none">
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

      {/* ─── Anchor Companies ────────────────────────────── */}
      <section className="bg-oxford text-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-20 lg:py-28 relative overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-cambridge/10 rounded-full blur-3xl" />
          <FadeIn>
            <div className="relative max-w-3xl">
              <p className="text-overline text-cambridge mb-4">
                Global reach, local roots
              </p>
              <h2 className="text-h2 text-white">
                Medina County is the headquarters address for real giants.
              </h2>
              <p className="text-body-lg text-white/70 mt-6">
                When international manufacturers and insurance firms choose
                where to put their HQ, they choose Medina. Here&apos;s some
                of what that means in practice.
              </p>
            </div>
          </FadeIn>

          <div className="relative mt-12 grid md:grid-cols-3 gap-6">
            {anchorCompanies.map((company, i) => (
              <FadeIn key={company.name} delay={i * 100}>
                <div className="p-8 bg-white/5 border border-white/10 rounded-[var(--radius-lg)] backdrop-blur-sm h-full">
                  <p className="text-h3 text-white">{company.name}</p>
                  <p className="text-body-sm text-cambridge mt-3">
                    {company.industry}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn>
            <p className="relative text-body-sm text-white/60 mt-10 max-w-2xl">
              And 511 more member businesses across every sector — retail,
              healthcare, professional services, construction, hospitality,
              food and beverage, technology, agriculture, and the trades.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ─── Where Medina Means Business ──────────────────── */}
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
                  <p className="text-caption text-cambridge font-bold">
                    {c.memberCount}
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

      {/* ─── The Magazine ─────────────────────────────────── */}
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
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ─── Explore the Chamber ──────────────────────────── */}
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
              desc: "All 511+ member businesses in one searchable directory.",
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
              desc: "A new member onboarding checklist — turn membership into momentum.",
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

      {/* ─── Closing CTA ──────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pb-20 lg:pb-28">
        <FadeIn>
          <div className="p-10 lg:p-16 bg-oxford text-white rounded-[var(--radius-lg)] relative overflow-hidden">
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-cambridge/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-accent/5 rounded-full blur-3xl" />
            <div className="relative grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <p className="text-overline text-cambridge mb-4">
                  Add your name to the list
                </p>
                <h2 className="text-h2 text-white">
                  Medina Means Business — including yours.
                </h2>
                <p className="text-body-lg text-white/70 mt-4">
                  Join {totalCount}+ businesses across Medina County. Three
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
                    border border-white/30 hover:border-white/60
                    text-white font-bold text-body-sm
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
