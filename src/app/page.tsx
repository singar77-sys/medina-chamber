import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { totalCount } from "@/data/members";
import { FadeIn } from "@/components/FadeIn";
import { CountUp } from "@/components/CountUp";
import { HomeAIPrompt } from "@/components/HomeAIPrompt";

export const metadata: Metadata = {
  title: "Greater Medina Chamber of Commerce — Medina County, Ohio",
  description:
    "The Greater Medina Chamber of Commerce connects and champions businesses across Medina County, Ohio. 511+ member businesses, networking events, advocacy, and programs since 1938.",
  openGraph: {
    title: "Greater Medina Chamber of Commerce",
    description:
      "Connecting and championing Medina County's business community since 1938.",
  },
  alternates: { canonical: "/" },
};

const partners = [
  {
    name: "Medina County Safety Council",
    logo: "/images/partners/medina-county-safety-council.png",
    href: "/programs/safety-council",
  },
  {
    name: "Medina County Young Professionals Association",
    logo: "/images/partners/medina-county-young-professionals-association.jpg",
    href: "https://www.ypamedina.com",
    external: true,
  },
  {
    name: "Community Energy Advisors",
    logo: "/images/partners/community-energy-advisors.jpg",
    href: "/membership/savings",
  },
  {
    name: "Anthem Insurance",
    logo: "/images/partners/anthem-insurance.jpg",
    href: "/membership/savings",
  },
  {
    name: "Hunter Consulting",
    logo: "/images/partners/hunter-consulting.png",
    href: "/membership/savings",
  },
  {
    name: "Medina City Schools",
    logo: "/images/partners/medina-city-schools.png",
    href: "https://www.medinaschools.org",
    external: true,
  },
];

const programs = [
  {
    tag: "Leadership",
    title: "Compass Program",
    desc: "Five sessions. Twenty leaders. A shared commitment to growth. Our flagship leadership development program meets February through May.",
    href: "/programs/compass",
    cta: "Learn More →",
  },
  {
    tag: "Annual Event",
    title: "Golf Outing",
    desc: "Monday, July 20, 2026 at Westfield Country Club. 18-hole shotgun scramble — the Chamber's biggest fundraiser of the year.",
    href: "/programs/golf-outing",
    cta: "Register →",
  },
  {
    tag: "Networking",
    title: "Social Connect",
    desc: "Corporate competitions, an expo, and early-access networking — all at Foundry Social. Where Medina's business community unwinds together.",
    href: "/programs/social-connect",
    cta: "Get Tickets →",
  },
  {
    tag: "Recognition",
    title: "Athena Awards",
    desc: "Annual awards honoring women leaders in Medina County, co-hosted with the Medina County Women's Journal.",
    href: "/programs/athena-awards",
    cta: "Learn More →",
  },
];

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": ["Organization", "LocalBusiness"],
  "@id": "https://medinachamber.com/#organization",
  name: "Greater Medina Chamber of Commerce",
  alternateName: "Medina Chamber",
  url: "https://medinachamber.com",
  logo: "https://medinachamber.com/images/logos/logo-full-blue.png",
  image: "https://medinachamber.com/images/photos/chamber-building-exterior.jpg",
  description:
    "The Greater Medina Chamber of Commerce connects and champions businesses across Medina County, Ohio. 511+ member businesses, networking events, advocacy, and programs since 1938.",
  foundingDate: "1938",
  telephone: "+1-330-723-8773",
  email: "office@medinaohchamber.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "139 N. Court Street, Suite A",
    addressLocality: "Medina",
    addressRegion: "OH",
    postalCode: "44256",
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 41.1382,
    longitude: -81.8637,
  },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "10:00",
    closes: "16:00",
  },
  sameAs: [
    "https://www.facebook.com/medinachamber",
    "https://www.linkedin.com/company/greatermedinachamberofcommerce",
    "https://www.instagram.com/medinachamber/",
    "https://twitter.com/grmedinachamber",
    "https://www.youtube.com/channel/UCS_V2kgS_GxkOFV1n8iuHSw",
  ],
  areaServed: [
    { "@type": "AdministrativeArea", name: "Medina County, OH" },
    { "@type": "City", name: "Medina, OH 44256" },
    { "@type": "City", name: "Brunswick, OH 44212" },
    { "@type": "City", name: "Wadsworth, OH 44281" },
    { "@type": "City", name: "Lodi, OH 44254" },
    { "@type": "City", name: "Seville, OH 44273" },
    { "@type": "City", name: "Rittman, OH" },
    { "@type": "City", name: "Valley City, OH 44280" },
    { "@type": "City", name: "Lafayette, OH 44256" },
  ],
  numberOfEmployees: { "@type": "QuantitativeValue", value: 2 },
  member: {
    "@type": "QuantitativeValue",
    value: 511,
    unitText: "member businesses",
  },
};

export default function HomePage() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />

      {/* ─── Hero ─────────────────────────────────────────── */}
      <section className="relative min-h-[85vh] flex items-end overflow-hidden">
        {/* Background photo */}
        <Image
          src="/images/photos/gazebo-night-flag.jpg"
          alt="Historic Medina gazebo at night"
          fill
          className="object-cover object-center"
          priority
          quality={85}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-oxford via-oxford/70 to-oxford/20" />

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 pb-16 lg:pb-24 pt-40 w-full">
          <div className="max-w-3xl">
            <p className="text-overline text-cambridge mb-4 tracking-widest">
              Medina County, Ohio · Est. 1938
            </p>
            <h1 className="text-display text-white">
              Medina Means
              <br />
              <span className="text-cambridge">Business</span>
            </h1>
            <p className="text-body-lg text-white/70 mt-6 max-w-2xl">
              The Greater Medina Chamber of Commerce connects and champions
              businesses across Medina County. From sole proprietors to
              manufacturers — we&apos;re the room where deals get made, leaders
              get built, and Medina gets stronger.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/membership/join"
                className="
                  inline-flex items-center px-8 py-4
                  bg-accent hover:bg-accent-hover
                  text-white font-bold text-body
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                Join the Chamber →
              </Link>
              <Link
                href="/membership/directory"
                className="
                  inline-flex items-center px-6 py-4
                  border border-white/30 hover:border-white/60
                  text-white font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                Browse the Directory
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats Strip ──────────────────────────────────── */}
      <section className="bg-bg-secondary border-y border-border-secondary">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { end: 1938, label: "Founded", prefix: "", suffix: "" },
              { end: totalCount, label: "Member Businesses", suffix: "+" },
              { end: 9, label: "Committees" },
              { end: 30, label: "Events Per Year", suffix: "+" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-display text-oxford leading-none">
                  <CountUp
                    end={s.end}
                    prefix={s.prefix}
                    suffix={s.suffix || ""}
                    duration={s.end > 100 ? 2400 : 1600}
                  />
                </p>
                <p className="text-caption text-text-tertiary mt-2 uppercase tracking-wider">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AI Section ───────────────────────────────────── */}
      <section className="bg-bg-secondary border-t border-border-secondary">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-20">
          <FadeIn>
            <div className="max-w-2xl mx-auto text-center mb-8">
              <img
                src="/images/chamberbot-mascot.svg"
                alt="ChamberBot mascot"
                className="w-24 h-24 mx-auto mb-4"
              />
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-cambridge/10 border border-cambridge/20 rounded-full mb-6">
                <div className="w-2 h-2 bg-cambridge rounded-full animate-pulse" />
                <span className="text-caption font-bold text-cambridge">
                  AI-Powered
                </span>
              </div>
              <h2 className="text-h2">
                Ask the Chamber anything
              </h2>
              <p className="text-body-sm text-text-tertiary mt-3">
                ChamberBot knows every member, event, and program.
                Try it.
              </p>
            </div>
            <div className="max-w-xl mx-auto">
              <HomeAIPrompt />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── Programs Grid ────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-20 lg:py-28">
        <FadeIn>
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-overline text-cambridge mb-2">Get Involved</p>
              <h2 className="text-h2">Programs &amp; Events</h2>
            </div>
            <Link
              href="/programs"
              className="hidden sm:inline-flex text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
            >
              All programs →
            </Link>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-2 gap-6">
          {programs.map((p, i) => (
            <FadeIn key={p.title} delay={i * 100}>
              <Link
                href={p.href}
                className="
                  group flex flex-col h-full p-8
                  bg-bg-secondary border border-border-secondary
                  rounded-[var(--radius-lg)]
                  hover:border-cambridge/40 hover:shadow-[0_8px_30px_rgba(131,188,169,0.08)]
                  transition-all duration-300
                "
              >
                <span className="text-caption text-cambridge font-bold uppercase tracking-wider">
                  {p.tag}
                </span>
                <h3 className="text-h3 mt-2 mb-3 group-hover:text-cambridge transition-colors">
                  {p.title}
                </h3>
                <p className="text-body-sm text-text-secondary leading-relaxed flex-1">
                  {p.desc}
                </p>
                <p className="mt-5 text-body-sm font-bold text-cambridge group-hover:translate-x-1 transition-transform inline-block">
                  {p.cta}
                </p>
              </Link>
            </FadeIn>
          ))}
        </div>

        <div className="mt-6 sm:hidden text-center">
          <Link
            href="/programs"
            className="text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
          >
            View all programs →
          </Link>
        </div>
      </section>

      {/* ─── Partners & Sponsors ──────────────────────────── */}
      <section className="bg-bg-secondary border-y border-border-secondary py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <p className="text-caption text-text-tertiary uppercase tracking-widest text-center mb-10 font-bold">
              Partners &amp; Sponsors
            </p>
          </FadeIn>
          <FadeIn delay={150}>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 lg:gap-6">
              {partners.map((p) => {
                const inner = (
                  <div
                    className="
                      flex items-center justify-center
                      bg-bg-primary border border-border-secondary
                      rounded-[var(--radius-md)]
                      p-4 aspect-square
                      hover:border-border-primary transition-colors
                    "
                  >
                    <Image
                      src={p.logo}
                      alt={`${p.name} logo — Medina Chamber partner`}
                      width={120}
                      height={120}
                      className="w-full h-full object-contain"
                    />
                  </div>
                );
                return p.external ? (
                  <a
                    key={p.name}
                    href={p.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={p.name}
                  >
                    {inner}
                  </a>
                ) : (
                  <Link key={p.name} href={p.href} title={p.name}>
                    {inner}
                  </Link>
                );
              })}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── Join CTA ─────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-20 lg:py-28">
        <FadeIn>
          <div className="p-10 lg:p-16 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <p className="text-overline text-cambridge mb-4">Membership</p>
                <h2 className="text-h2">
                  Ready to be part of what&apos;s building Medina?
                </h2>
                <p className="text-body-lg text-text-secondary mt-4">
                  Most small businesses invest $250–$400 a year. The savings
                  programs alone typically cover that in the first month.
                  Stephanie will walk you through everything — no pressure.
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
                  href="/membership/benefits"
                  className="
                    block w-full text-center py-3 px-6
                    border border-border-primary hover:border-text-tertiary
                    text-text-primary font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  See All Benefits
                </Link>
                <a
                  href="mailto:stephanie@medinaohchamber.com"
                  className="
                    block w-full text-center py-3 px-6
                    text-cambridge font-bold text-body-sm
                    transition-colors hover:text-cambridge/80
                  "
                >
                  Email Stephanie with Questions
                </a>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>
    </div>
  );
}
