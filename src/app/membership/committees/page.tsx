import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Committees & Councils",
  description:
    "Get involved in the Greater Medina Chamber of Commerce through our committees and councils. Business advocacy, marketing, the Safety Council, the Ambassador program, and more.",
  openGraph: {
    title: "Committees & Councils | Greater Medina Chamber of Commerce",
    description:
      "Nine ways to get involved and lead in Medina County's business community.",
  },
  alternates: { canonical: "/membership/committees" },
};

interface Committee {
  name: string;
  tag: string | null;
  description: string;
}

const committees: Committee[] = [
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
      "Plans and executes the chamber's annual golf outing, the chamber's flagship event and a major fundraiser. Responsible for fostering community connections and creating a great experience for every participant.",
  },
  {
    name: "Athena Leadership Awards Committee",
    tag: null,
    description:
      "Organizes the annual Athena Awards alongside WJ Creative Studio, including speaker recruitment, sponsorships, vendor coordination, and full event logistics.",
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
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Greater Medina Chamber of Commerce Committees & Councils",
    description:
      "Volunteer committees and councils where chamber members shape programs, advocacy, events, and culture.",
    url: "https://medinachamber.com/membership/committees",
    numberOfItems: committees.length,
    itemListElement: committees.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Organization",
        name: c.name,
        description: c.description,
        parentOrganization: {
          "@type": "Organization",
          name: "Greater Medina Chamber of Commerce",
        },
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
        {/* Ghosted Lathrop Cooley Memorial Fountain / Public Square backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/membership/medina-chamber-committees-hero.webp"
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
            <p className="text-overline text-cambridge mb-f8">Membership</p>
            <h1 className="text-display">
              <span className="block">Committees</span>
              <span className="block text-accent">&amp; Councils</span>
            </h1>
            <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
              Chamber membership is more than a listing. Committees are where
              members actually shape the chamber, its programs, advocacy,
              events, and culture. There&apos;s a place for every kind of
              contributor.
            </p>
          </div>
        </div>
      </section>

      {/* Committee cards */}
      <section className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="mb-f21 flex items-end justify-between gap-f21 flex-wrap">
              <div>
                <p className="text-overline text-cambridge mb-f8">
                  The Committees
                </p>
                <h2 className="text-h2">{committees.length} Ways to Lead</h2>
              </div>
              <p className="text-body-sm text-text-tertiary">
                Most are open to any chamber member.
              </p>
            </div>
            <div className="space-y-f21">
              {committees.map((c, i) => (
                <FadeIn key={c.name} delay={i * 40}>
                  <article className="p-f21 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)]">
                    <div className="flex flex-wrap items-start justify-between gap-f8 mb-f8">
                      <h3 className="text-h4">{c.name}</h3>
                      {c.tag && (
                        <span className="shrink-0 px-f8 py-f3 text-caption font-bold bg-cambridge/15 text-cambridge rounded-full">
                          {c.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-body-sm text-text-secondary leading-relaxed">
                      {c.description}
                    </p>
                  </article>
                </FadeIn>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Get involved CTA */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          <div className="p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <div className="grid lg:grid-cols-2 gap-f34 items-center">
              <div>
                <p className="text-overline text-cambridge mb-f8">Get Involved</p>
                <h2 className="text-h2">Ready to contribute?</h2>
                <p className="text-body-lg text-text-secondary mt-f13">
                  Most committees are open to any chamber member. Reach out
                  and let the team know where you&apos;d like to contribute.
                  There&apos;s always room for people who want to show up.
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

          <div className="mt-f34">
            <Link
              href="/membership"
              className="text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
            >
              ← Back to Membership
            </Link>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
