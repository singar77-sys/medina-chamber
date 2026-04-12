import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { totalCount } from "@/data/members";

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

const stats = [
  { value: "1938", label: "Founded" },
  { value: `${totalCount}+`, label: "Member Businesses" },
  { value: "9", label: "Committees" },
  { value: "30+", label: "Events Per Year" },
];

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
    desc: "Honoring exceptional women leaders in Medina County, co-hosted with the Medina County Women's Journal.",
    href: "/programs/athena-awards",
    cta: "Learn More →",
  },
];

export default function HomePage() {
  return (
    <div>
      {/* ─── Hero ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="max-w-3xl">
          <p className="text-overline text-cambridge mb-4">
            Medina County, Ohio · Est. 1938
          </p>
          <h1 className="text-display">
            Where Medina
            <br />
            <span className="text-accent">Does Business</span>
          </h1>
          <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
            The Greater Medina Chamber of Commerce connects and champions
            businesses across Medina County. From sole proprietors to
            manufacturers — we&apos;re the room where deals get made, leaders
            get built, and Medina gets stronger.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
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
                border border-border-primary hover:border-text-tertiary
                text-text-primary font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Browse the Directory
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Stats Strip ──────────────────────────────────── */}
      <section className="bg-oxford">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-display text-cambridge leading-none">{s.value}</p>
                <p className="text-caption text-white/60 mt-2 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Programs Grid ────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-20 lg:py-28">
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

        <div className="grid md:grid-cols-2 gap-6">
          {programs.map((p) => (
            <Link
              key={p.title}
              href={p.href}
              className="
                group p-8
                bg-bg-secondary border border-border-secondary
                rounded-[var(--radius-lg)]
                hover:border-border-primary transition-colors
              "
            >
              <span className="text-caption text-cambridge font-bold uppercase tracking-wider">
                {p.tag}
              </span>
              <h3 className="text-h3 mt-2 mb-3 group-hover:text-cambridge transition-colors">
                {p.title}
              </h3>
              <p className="text-body-sm text-text-secondary leading-relaxed">
                {p.desc}
              </p>
              <p className="mt-5 text-body-sm font-bold text-cambridge group-hover:translate-x-0.5 transition-transform inline-block">
                {p.cta}
              </p>
            </Link>
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
      <section className="bg-oxford py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="text-caption text-white/50 uppercase tracking-widest text-center mb-10 font-bold">
            Partners &amp; Sponsors
          </p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4 lg:gap-6">
            {partners.map((p) => {
              const inner = (
                <div
                  className="
                    flex items-center justify-center
                    bg-white rounded-[var(--radius-md)]
                    p-4 aspect-square
                    hover:opacity-90 transition-opacity
                  "
                >
                  <Image
                    src={p.logo}
                    alt={p.name}
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
        </div>
      </section>

      {/* ─── Join CTA ─────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-20 lg:py-28">
        <div className="p-10 lg:p-16 bg-oxford text-white rounded-[var(--radius-lg)]">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-overline text-cambridge mb-4">Membership</p>
              <h2 className="text-h2 text-white">
                Ready to be part of what&apos;s building Medina?
              </h2>
              <p className="text-body-lg text-white/70 mt-4">
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
                  border border-white/30 hover:border-white/60
                  text-white font-bold text-body-sm
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
      </section>
    </div>
  );
}
