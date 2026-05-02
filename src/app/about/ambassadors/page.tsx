import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { ambassadors, ambassadorRoles } from "@/data/ambassadors";
import { domainOnly, mailto } from "@/lib/format";
import { safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Chamber Ambassadors",
  description:
    "Meet the 12 volunteer Chamber Ambassadors of the Greater Medina Chamber of Commerce. Member business representatives who welcome new members, attend ribbon cuttings, and represent the chamber across Medina County, Ohio.",
  openGraph: {
    title: "Chamber Ambassadors | Greater Medina Chamber of Commerce",
    description:
      "Volunteer member representatives who welcome new businesses and represent the chamber across Medina County.",
  },
  alternates: { canonical: "/about/ambassadors" },
};

export default function AmbassadorsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "Chamber Ambassadors | Greater Medina Chamber of Commerce",
    description:
      "Meet the volunteer Chamber Ambassadors of the Greater Medina Chamber of Commerce. Member business representatives who welcome new members, attend ribbon cuttings, and represent the chamber throughout Medina County.",
    url: "https://medinachamber.com/about/ambassadors",
    mainEntity: {
      "@type": "Organization",
      name: "Greater Medina Chamber of Commerce",
      member: ambassadors.map((a) => ({
        "@type": "Person",
        name: a.name,
        jobTitle: a.title,
        email: a.email,
        image: `https://medinachamber.com${a.photo}`,
        worksFor: {
          "@type": "Organization",
          name: a.company,
          ...(a.website ? { url: a.website } : {}),
        },
      })),
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
          <p className="text-overline text-cambridge mb-f8">Volunteers</p>
          <h1 className="text-display">
            Chamber
            <br />
            <span className="text-accent">Ambassadors</span>
          </h1>
          <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
            Ambassadors are volunteer chamber members who serve as the friendly
            face of the Greater Medina Chamber of Commerce. They welcome new
            businesses, cut ribbons, and make sure every member feels at home
            in the Medina County business community.
          </p>
        </div>
      </section>

      {/* What ambassadors do */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          <div className="grid lg:grid-cols-2 gap-f34 lg:gap-f55">
            <div>
              <p className="text-overline text-cambridge mb-f8">The Role</p>
              <h2 className="text-h2">What Ambassadors Do</h2>
              <p className="text-body text-text-secondary mt-f13 leading-relaxed">
                Every chamber needs the people who show up. Ambassadors are the
                ones in the room when a new restaurant cuts its ribbon, the
                ones reaching out to first-time members, the ones bridging
                introductions at networking events.
              </p>
              <p className="text-body text-text-secondary mt-f21 leading-relaxed">
                It&apos;s a volunteer role. The ambassadors below put in real
                time on top of running their own businesses because they
                believe in what a strong chamber does for Medina.
              </p>
            </div>

            <div className="space-y-f21">
              {ambassadorRoles.map((r) => (
                <div
                  key={r.title}
                  className="p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
                >
                  <h3 className="text-h4 mb-f8">{r.title}</h3>
                  <p className="text-body-sm text-text-secondary leading-relaxed">
                    {r.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Ambassador grid */}
      <section className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="mb-f21 flex items-end justify-between gap-f21 flex-wrap">
              <div>
                <p className="text-overline text-cambridge mb-f8">
                  Meet the Team
                </p>
                <h2 className="text-h2">{ambassadors.length} Ambassadors</h2>
              </div>
              <p className="text-body-sm text-text-tertiary">
                Volunteer chamber members serving Medina County, Ohio.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-f21">
              {ambassadors.map((a) => (
                <article
                  key={a.slug}
                  className="group overflow-hidden bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)] hover:border-cambridge/40 transition-colors"
                >
                  <div className="relative w-full aspect-[3/4] overflow-hidden">
                    <Image
                      src={a.photo}
                      alt={`${a.name}, ${a.title} at ${a.company}`}
                      fill
                      className="object-cover object-[center_25%] transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </div>
                  <div className="p-f21">
                    <h3 className="text-body font-bold text-text-primary">
                      {a.name}
                    </h3>
                    <p className="text-body-sm text-text-secondary mt-f3">
                      {a.title}
                    </p>
                    <p className="text-caption font-semibold text-cambridge mt-f3">
                      {a.company}
                    </p>
                    <div className="mt-f13 flex flex-col gap-1">
                      <a
                        href={mailto(a.email)}
                        className="text-caption text-text-tertiary hover:text-cambridge transition-colors truncate"
                      >
                        {a.email}
                      </a>
                      {a.website && (
                        <a
                          href={a.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-caption text-text-tertiary hover:text-cambridge transition-colors truncate"
                        >
                          {domainOnly(a.website)}
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Become an ambassador */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          <div className="p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <div className="grid lg:grid-cols-2 gap-f34 items-center">
              <div>
                <p className="text-overline text-cambridge mb-f8">Get Involved</p>
                <h2 className="text-h2">Become an Ambassador</h2>
                <p className="text-body-lg text-text-secondary mt-f13">
                  Ambassadors are active chamber members who want to give back
                  and grow their network at the same time. If you&apos;re a
                  member and the role sounds like you, reach out to Stephanie
                  Mueller and she&apos;ll walk you through what&apos;s involved.
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
                  Contact the Chamber →
                </Link>
                <a
                  href={mailto("stephanie@medinaohchamber.com", "Becoming a Chamber Ambassador")}
                  className="
                    block w-full text-center py-f13 px-f21
                    border border-border-primary hover:border-text-tertiary
                    text-text-primary font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  Email Stephanie Directly
                </a>
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
