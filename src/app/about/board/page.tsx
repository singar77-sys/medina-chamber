import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { FadeIn } from "@/components/FadeIn";
import { jaclyn, stephanie } from "@/data/staff";
import { safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Board of Directors",
  description:
    "Meet the volunteer board of directors leading the Greater Medina Chamber of Commerce. Local business leaders guiding the chamber's strategy and advocacy for Medina County.",
  openGraph: {
    title: "Board of Directors | Greater Medina Chamber of Commerce",
    description:
      "Local business leaders guiding the chamber's strategy and advocacy.",
  },
  alternates: { canonical: "/about/board" },
};

const board = [
  { name: "Steve Allison", title: "President", company: "Fire-Dex" },
  { name: "Malorie Kormos", title: "President Elect", company: "Catholic Charities Diocese of Cleveland" },
  { name: "Julie McNabb", title: "Immediate Past President", company: "JK Gift Shop / Interior Design Studio" },
  { name: "Terry Blascak", title: "Board of Directors", company: "Huntington Bank" },
  { name: "David Ferrell", title: "Board of Directors", company: "Philpott Solutions Group" },
  { name: "Steve Ferris", title: "Board of Directors", company: "Discount Drug Mart" },
  { name: "Kathy Elseser", title: "Board of Directors", company: "Community Energy Advisors" },
  { name: "Julie Simon", title: "Board of Directors", company: "Cleveland Clinic Medina Hospital" },
  { name: "Brian Harr", title: "Board of Directors", company: "Commercial & Savings Bank" },
  { name: "Mark Herwick", title: "Board of Directors", company: "Homestead Insurance Agency" },
  { name: "Nick Howell", title: "Board of Directors", company: "National Design Mart" },
  { name: "Kaleigh Huffman", title: "Board of Directors", company: "Critchfield, Critchfield & Johnston" },
];

const staffBios = [
  {
    name: "Jaclyn Ringstmeier, IOM",
    title: "Executive Director",
    bio: "14+ years at the chamber. Holds the IOM designation from the U.S. Chamber of Commerce Foundation's Institute for Organization Management. Baldwin Wallace College alum.",
  },
  {
    name: "Stephanie Mueller",
    title: "Membership & Events Coordinator",
    bio: "6+ years at the chamber. Primary contact for membership, events, sponsorships, and new member onboarding.",
  },
];

export default function BoardPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "Board of Directors | Greater Medina Chamber of Commerce",
    description:
      "Meet the volunteer board of directors leading the Greater Medina Chamber of Commerce. Local business leaders guiding strategy and advocacy for Medina County.",
    url: "https://medinachamber.com/about/board",
    mainEntity: {
      "@type": "Organization",
      name: "Greater Medina Chamber of Commerce",
      member: board.map((m) => ({
        "@type": "OrganizationRole",
        roleName: m.title,
        member: { "@type": "Person", name: m.name },
      })),
      employee: [
        {
          "@type": "Person",
          name: "Jaclyn Ringstmeier IOM",
          jobTitle: "Executive Director",
          email: jaclyn.email,
        },
        {
          "@type": "Person",
          name: "Stephanie Mueller",
          jobTitle: "Membership & Events Coordinator",
          email: stephanie.email,
        },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
        {/* Ghosted historic Medina Town Hall / Public Square rooflines backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/about/medina-chamber-board-hero.webp"
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
            <p className="text-overline text-cambridge mb-f8">Leadership</p>
            <h1 className="text-display">
              <span className="block">Board of</span>
              <span className="block text-accent">Directors</span>
            </h1>
            <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
              The Greater Medina Chamber of Commerce is governed by a volunteer
              board of local business leaders who set strategy, guide advocacy,
              and ensure the chamber delivers value for every member.
            </p>
          </div>
        </div>
      </section>

      {/* Chamber staff */}
      <section className="rule-top mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          <div className="mb-f21">
            <p className="text-overline text-cambridge mb-f8">Chamber Staff</p>
            <h2 className="text-h2">The full-time team</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-f21">
            {staffBios.map((s) => (
              <div
                key={s.name}
                className="p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
              >
                <p className="text-h4">{s.name}</p>
                <p className="text-cambridge text-body-sm font-bold mt-f3">
                  {s.title}
                </p>
                <p className="text-text-secondary text-body-sm mt-f13 leading-relaxed">
                  {s.bio}
                </p>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* Board members */}
      <section className="relative overflow-hidden bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        {/* Ghosted vintage courthouse backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/medina-courthouse-vintage.webp"
            alt=""
            fill
            className="object-cover opacity-[0.10]"
            sizes="100vw"
            quality={60}
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="mb-f21 flex items-end justify-between gap-f21 flex-wrap">
              <div>
                <p className="text-overline text-cambridge mb-f8">
                  2026 Board of Directors
                </p>
                <h2 className="text-h2">Volunteer Leaders</h2>
              </div>
              <p className="text-body-sm text-text-tertiary">
                Local business owners, executives, and longtime members.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-f13">
              {board.map((m) => (
                <div
                  key={m.name}
                  className="p-f21 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)]"
                >
                  <p className="text-body font-bold text-text-primary">
                    {m.name}
                  </p>
                  <p className="text-caption text-cambridge font-bold mt-f3">
                    {m.title}
                  </p>
                  <p className="text-caption text-text-tertiary mt-f3">
                    {m.company}
                  </p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden py-f55 lg:py-f89">
        {/* Backdrop removed 2026-08-03: the board band above carries the
            courthouse ghost, and backdrops must alternate — never stack. */}
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="grid lg:grid-cols-2 gap-f34 items-center">
              <div>
                <p className="text-overline text-cambridge mb-f8">
                  Get Involved
                </p>
                <h2 className="text-h2">Interested in serving?</h2>
                <p className="text-body-lg text-text-secondary mt-f13">
                  Chamber members can serve as ambassadors and engage with the
                  board. It&apos;s how Medina&apos;s
                  business community stays connected at the leadership level.
                </p>
              </div>
              <div className="space-y-f13">
                <ButtonLink href="/about/contact" size="md" className="w-full justify-center">
                  Get in Touch →
                </ButtonLink>
              </div>
            </div>

            <div className="mt-f34">
              <Link
                href="/about"
                className="text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
              >
                ← Back to About
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
