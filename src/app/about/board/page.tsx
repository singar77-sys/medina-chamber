import type { Metadata } from "next";
import Link from "next/link";
import { safeJsonLd } from "@/lib/json-ld";
import { jaclyn, stephanie } from "@/data/staff";

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

const staff = [
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
      "Meet the volunteer board of directors leading the Greater Medina Chamber of Commerce, local business leaders guiding strategy and advocacy for Medina County.",
    url: "https://medinachamber.com/about/board",
    mainEntity: {
      "@type": "Organization",
      name: "Greater Medina Chamber of Commerce",
      member: [
        { "@type": "OrganizationRole", roleName: "Board President", member: { "@type": "Person", name: "Julie McNabb" } },
        { "@type": "OrganizationRole", roleName: "Board Chair", member: { "@type": "Person", name: "Steve Allison" } },
        { "@type": "OrganizationRole", roleName: "Board of Directors", member: { "@type": "Person", name: "Malorie Kormos" } },
        { "@type": "OrganizationRole", roleName: "Board of Directors", member: { "@type": "Person", name: "Steve Ferris" } },
        { "@type": "OrganizationRole", roleName: "Board of Directors", member: { "@type": "Person", name: "Terry Blascak" } },
        { "@type": "OrganizationRole", roleName: "Board of Directors", member: { "@type": "Person", name: "David Ferrell" } },
        { "@type": "OrganizationRole", roleName: "Board of Directors", member: { "@type": "Person", name: "Kathy Elseser" } },
        { "@type": "OrganizationRole", roleName: "Board of Directors", member: { "@type": "Person", name: "Randy Fuerst" } },
        { "@type": "OrganizationRole", roleName: "Board of Directors", member: { "@type": "Person", name: "Brian Harr" } },
        { "@type": "OrganizationRole", roleName: "Board of Directors", member: { "@type": "Person", name: "Nick Howell" } },
        { "@type": "OrganizationRole", roleName: "Past Board President", member: { "@type": "Person", name: "Dan Calvin" } },
      ],
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
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Leadership</p>
        <h1 className="text-display">
          Board of
          <br />
          <span className="text-accent">Directors</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          The Greater Medina Chamber of Commerce is governed by a volunteer
          board of local business leaders who set strategy, guide advocacy, and
          ensure the chamber delivers value for every member.
        </p>
      </section>

      {/* Staff */}
      <section className="mt-20">
        <h2 className="text-overline text-cambridge mb-8">Chamber Staff</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {staff.map((s) => (
            <div
              key={s.name}
              className="p-6 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
            >
              <p className="text-h4">{s.name}</p>
              <p className="text-cambridge text-body-sm font-bold mt-1">{s.title}</p>
              <p className="text-text-secondary text-body-sm mt-3 leading-relaxed">{s.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Board */}
      <section className="mt-20">
        <h2 className="text-overline text-cambridge mb-8">Board Members</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {board.map((m) => (
            <div
              key={m.name}
              className="flex items-start gap-4 p-5 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
            >
              <div className="w-10 h-10 rounded-full bg-oxford/10 [[data-theme=dark]_&]:bg-cambridge/15 flex items-center justify-center shrink-0 text-body-sm font-bold text-oxford [[data-theme=dark]_&]:text-cambridge">
                {m.name.split(" ").map((n) => n[0]).join("").substring(0, 2)}
              </div>
              <div>
                <p className="text-body font-semibold text-text-primary">{m.name}</p>
                <p className="text-caption text-text-tertiary mt-0.5">{m.title}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-24 p-10 lg:p-16 bg-bg-secondary rounded-[var(--radius-lg)] border border-border-secondary">
        <div className="max-w-2xl">
          <h2 className="text-h2">Interested in getting involved?</h2>
          <p className="text-body-lg text-text-secondary mt-4">
            Chamber members can participate in committees, serve as ambassadors,
            and engage with the board. It&apos;s how Medina&apos;s business community
            stays connected at the leadership level.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/about/contact"
              className="
                inline-flex items-center px-6 py-3
                bg-accent hover:bg-accent-hover
                text-white font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Get in Touch →
            </Link>
            <Link
              href="/about/ambassadors"
              className="
                inline-flex items-center px-6 py-3
                border border-border-primary hover:border-text-tertiary
                text-text-primary font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Meet the Ambassadors
            </Link>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
