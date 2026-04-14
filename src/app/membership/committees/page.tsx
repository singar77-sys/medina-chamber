import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Committees & Councils",
  description:
    "Get involved in the Greater Medina Chamber of Commerce through our committees and councils — from business advocacy and marketing to the Safety Council and Ambassador program.",
  openGraph: {
    title: "Committees & Councils — Greater Medina Chamber of Commerce",
    description:
      "Nine ways to get involved and lead in Medina County's business community.",
  },
  alternates: { canonical: "/membership/committees" },
};

const committees = [
  {
    name: "Business Advocacy Committee",
    tag: "By Invitation",
    description:
      "Serves as the trusted voice of the local business community — building relationships with elected officials and local organizations to foster a pro-business environment. Focuses on economic development, key business issues, and promoting pro-business policy. Seats are by invitation; interested members may express interest to the chamber.",
  },
  {
    name: "Member Services Committee",
    tag: null,
    description:
      "Enhances the membership experience through recruitment, retention, meeting organization, event planning, and management of affinity programs and sponsorships. Directly shapes how new and existing members experience the chamber.",
  },
  {
    name: "Programming Committee",
    tag: null,
    description:
      "Creates and executes programs and events that deliver real networking and educational value. Evaluates relevance and impact continuously to ensure every chamber program earns its place.",
  },
  {
    name: "Golf Committee",
    tag: null,
    description:
      "Plans and executes the chamber's annual golf outing — the largest fundraiser of the year. Responsible for fostering community connections and creating a great experience for every participant.",
  },
  {
    name: "Athena Leadership Awards Committee",
    tag: null,
    description:
      "Organizes the annual Athena Awards alongside the Medina County Women's Journal — including speaker recruitment, sponsorships, vendor coordination, and full event logistics.",
  },
  {
    name: "Safety Council",
    tag: null,
    description:
      "Helps Medina County businesses earn workers' compensation discounts through BWC participation. Organizes monthly expert speakers and safety programming in collaboration with the Workers' Compensation Steering Committee.",
  },
  {
    name: "Marketing Committee",
    tag: null,
    description:
      "Develops strategic marketing plans targeting specific audiences, creates sales and retention materials, and manages promotional communications for the chamber.",
  },
  {
    name: "Ambassador Committee",
    tag: null,
    description:
      "The welcoming face of the chamber. Ambassadors attend ribbon cuttings, welcome new members, and provide support at meetings and events — fostering genuine connections across the membership.",
  },
  {
    name: "Hall of Fame Committee",
    tag: "Non-Annual",
    description:
      "Oversees inductee selection and event planning for the Hall of Fame dinner — honoring individuals and organizations whose contributions have shaped Medina County. Convenes approximately every five years.",
  },
];

export default function CommitteesPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Membership</p>
        <h1 className="text-display">
          Committees
          <br />
          <span className="text-accent">&amp; Councils</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          Chamber membership is more than a listing. Committees are where
          members actually shape the chamber — its programs, advocacy, events,
          and culture. There&apos;s a place for every kind of contributor.
        </p>
      </section>

      {/* Committees grid */}
      <section className="mt-20">
        <div className="space-y-4">
          {committees.map((c) => (
            <div
              key={c.name}
              className="p-6 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <h2 className="text-h4">{c.name}</h2>
                {c.tag && (
                  <span className="shrink-0 px-2.5 py-1 text-caption font-bold bg-cambridge/15 text-cambridge rounded-full">
                    {c.tag}
                  </span>
                )}
              </div>
              <p className="text-body-sm text-text-secondary leading-relaxed">
                {c.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Get involved CTA */}
      <section className="mt-20 p-10 lg:p-16 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-h2">Ready to get involved?</h2>
            <p className="text-body-lg text-text-secondary mt-4">
              Most committees are open to any chamber member. Reach out and
              let the team know where you&apos;d like to contribute — there&apos;s
              always room for people who want to show up.
            </p>
          </div>
          <div className="space-y-4">
            <Link
              href="/about/contact"
              className="
                block w-full text-center py-3 px-6
                bg-accent hover:bg-accent-hover
                text-white font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Express Interest →
            </Link>
            <Link
              href="/membership/join"
              className="
                block w-full text-center py-3 px-6
                border border-border-primary hover:border-text-tertiary
                text-text-primary font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Not a member yet? Join the Chamber
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
