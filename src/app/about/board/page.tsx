import type { Metadata } from "next";
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
  { name: "Julie McNabb", title: "Board President" },
  { name: "Steve Allison", title: "Board Chair" },
  { name: "Malorie Kormos", title: "Board of Directors" },
  { name: "Steve Ferris", title: "Board of Directors" },
  { name: "Terry Blascak", title: "Board of Directors" },
  { name: "David Ferrell", title: "Board of Directors" },
  { name: "Kathy Elseser", title: "Board of Directors" },
  { name: "Randy Fuerst", title: "Board of Directors" },
  { name: "Brian Harr", title: "Board of Directors" },
  { name: "Nick Howell", title: "Board of Directors" },
  { name: "Dan Calvin", title: "Past Board President" },
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
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pt-f144 pb-f89">
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
      </section>

      {/* Chamber staff */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
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
      <section className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="mb-f21 flex items-end justify-between gap-f21 flex-wrap">
              <div>
                <p className="text-overline text-cambridge mb-f8">
                  Board Members
                </p>
                <h2 className="text-h2">{board.length} Volunteer Leaders</h2>
              </div>
              <p className="text-body-sm text-text-tertiary">
                Local business owners, executives, and longtime members.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-f13">
              {board.map((m) => (
                <div
                  key={m.name}
                  className="flex items-start gap-f13 p-f21 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)]"
                >
                  <div className="w-10 h-10 rounded-full bg-oxford/10 [[data-theme=dark]_&]:bg-cambridge/15 flex items-center justify-center shrink-0 text-body-sm font-bold text-oxford [[data-theme=dark]_&]:text-cambridge">
                    {m.name.split(" ").map((n) => n[0]).join("").substring(0, 2)}
                  </div>
                  <div>
                    <p className="text-body font-bold text-text-primary">
                      {m.name}
                    </p>
                    <p className="text-caption text-text-tertiary mt-f3">
                      {m.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          <div className="p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <div className="grid lg:grid-cols-2 gap-f34 items-center">
              <div>
                <p className="text-overline text-cambridge mb-f8">
                  Get Involved
                </p>
                <h2 className="text-h2">Interested in serving?</h2>
                <p className="text-body-lg text-text-secondary mt-f13">
                  Chamber members can join committees, serve as ambassadors,
                  and engage with the board. It&apos;s how Medina&apos;s
                  business community stays connected at the leadership level.
                </p>
              </div>
              <div className="space-y-f13">
                <ButtonLink href="/about/contact" size="md" className="w-full justify-center">
                  Get in Touch →
                </ButtonLink>
                <ButtonLink href="/about/ambassadors" variant="ghost" size="md" className="w-full justify-center">
                  Meet the Ambassadors
                </ButtonLink>
              </div>
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
      </section>
    </>
  );
}
