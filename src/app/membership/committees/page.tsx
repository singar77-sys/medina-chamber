import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";

export const metadata: Metadata = {
  title: "Committees & Councils",
  description:
    "Get involved in the Greater Medina Chamber of Commerce through our committees and councils, from business advocacy and marketing to the Safety Council and Ambassador program.",
  openGraph: {
    title: "Committees & Councils | Greater Medina Chamber of Commerce",
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
      "Serves as the trusted voice of the local business community, building relationships with elected officials and local organizations to foster a pro-business environment. Focuses on economic development, key business issues, and promoting pro-business policy. Seats are by invitation; interested members may express interest to the chamber.",
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
      "Plans and executes the chamber's annual golf outing, the largest fundraiser of the year. Responsible for fostering community connections and creating a great experience for every participant.",
  },
  {
    name: "Athena Leadership Awards Committee",
    tag: null,
    description:
      "Organizes the annual Athena Awards alongside the Medina County Women's Journal, including speaker recruitment, sponsorships, vendor coordination, and full event logistics.",
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
      "The welcoming face of the chamber. Ambassadors attend ribbon cuttings, welcome new members, and provide support at meetings and events, fostering genuine connections across the membership.",
  },
  {
    name: "Hall of Fame Committee",
    tag: "Non-Annual",
    description:
      "Oversees inductee selection and event planning for the Hall of Fame dinner, honoring individuals and organizations whose contributions have shaped Medina County. Convenes approximately every five years.",
  },
];

export default function CommitteesPage() {
  return (
    <>
      
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pt-f144 pb-f89">
        <div className="max-w-3xl">
          <p className="text-overline text-cambridge mb-f8">Membership</p>
          <h1 className="text-display">
            <span className="block">Committees</span>
            <span className="block text-accent">&amp; Councils</span>
          </h1>
          <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
            Chamber membership is more than a listing. Committees are where
            members actually shape the chamber, its programs, advocacy, events,
            and culture. There&apos;s a place for every kind of contributor.
          </p>
        </div>
      </section>

      {/* Committee cards */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <div className="space-y-f21">
          {committees.map((c, i) => (
            <FadeIn key={c.name} delay={i * 40}>
              <div className="p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
                <div className="flex flex-wrap items-start justify-between gap-f8 mb-f8">
                  <h2 className="text-h4">{c.name}</h2>
                  {c.tag && (
                    <span className="shrink-0 px-f8 py-f3 text-caption font-bold bg-cambridge/15 text-cambridge rounded-full">
                      {c.tag}
                    </span>
                  )}
                </div>
                <p className="text-body-sm text-text-secondary leading-relaxed">
                  {c.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* Get involved CTA */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          <div className="p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <div className="grid lg:grid-cols-2 gap-f34 items-center">
              <div>
                <h2 className="text-h2">Ready to get involved?</h2>
                <p className="text-body-lg text-text-secondary mt-f13">
                  Most committees are open to any chamber member. Reach out and
                  let the team know where you&apos;d like to contribute, there&apos;s
                  always room for people who want to show up.
                </p>
              </div>
              <div className="space-y-f13">
                <Link
                  href="/about/contact"
                  className="
                    block w-full text-center py-f13 px-f21
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
                    block w-full text-center py-f13 px-f21
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
          </div>
        </FadeIn>
      </section>
    </>
  );
}
