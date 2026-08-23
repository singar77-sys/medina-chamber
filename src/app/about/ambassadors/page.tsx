import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { VesicaPiscisWatermark } from "@/components/effects/VesicaPiscisWatermark";
import {
  ambassadors,
  ambassadorRoles,
  ambassadorsJsonLd,
  ambassadorsPageDescription,
} from "@/data/ambassadors";
import { stephanie } from "@/data/staff";
import { domainOnly, mailto } from "@/lib/format";
import { safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Chamber Ambassadors",
  description: ambassadorsPageDescription,
  openGraph: {
    title: "Chamber Ambassadors | Greater Medina Chamber of Commerce",
    description:
      "Volunteer member representatives who welcome new businesses and represent the chamber across Medina County.",
  },
  alternates: { canonical: "/about/ambassadors" },
};

export default function AmbassadorsPage() {
  const jsonLd = ambassadorsJsonLd("https://medinachamber.com");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
        {/* Ghosted Medina County Courthouse / Public Square backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/about/medina-chamber-ambassadors-hero.webp"
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
            <p className="text-overline text-cambridge mb-f8">Volunteers</p>
            <h1 className="text-display">
              <span className="block">Chamber</span>
              <span className="block text-accent">Ambassadors</span>
            </h1>
            <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
              Ambassadors are volunteer chamber members who serve as the friendly
              face of the Greater Medina Chamber of Commerce. They welcome new
              businesses, cut ribbons, and make sure every member feels at home
              in the Medina County business community.
            </p>
          </div>
        </div>
      </section>

      {/* What ambassadors do */}
      <section className="relative overflow-hidden rule-top mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <VesicaPiscisWatermark className="tp-vesica" />
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
                <h2 className="text-h2">
                  {ambassadors.length} Ambassador{ambassadors.length === 1 ? "" : "s"}
                </h2>
              </div>
              <p className="text-body-sm text-text-tertiary">
                Volunteer chamber members serving Medina County, Ohio.
              </p>
            </div>

            {ambassadors.length === 0 ? (
              <p className="text-body text-text-tertiary">
                The ambassador roster is being refreshed. Check back soon.
              </p>
            ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-f13">
              {ambassadors.map((a) => (
                <article
                  key={a.slug}
                  style={{ contentVisibility: "auto", containIntrinsicSize: "0 340px" }}
                  className="group overflow-hidden bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)] hover:border-cambridge/40 transition-colors"
                >
                  <div className="relative w-full aspect-[3/4] overflow-hidden">
                    <Image
                      src={a.photo}
                      alt={`${a.name}, ${a.title} at ${a.company}`}
                      fill
                      className="object-cover object-[center_25%] motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 214px"
                    />
                  </div>
                  <div className="p-f13">
                    <h3 className="text-body font-bold text-text-primary">
                      {a.name}
                    </h3>
                    <p className="text-body-sm text-text-secondary mt-f3">
                      {a.title}
                    </p>
                    <p className="text-caption font-bold text-cambridge mt-f3">
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
            )}
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
                  member and the role sounds like you, reach out to{" "}
                  {stephanie.name} and she&apos;ll walk you through what&apos;s
                  involved.
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
                  href={mailto(stephanie.email, "Becoming a Chamber Ambassador")}
                  className="
                    block w-full text-center py-f13 px-f21
                    bg-emerald hover:bg-emerald/90
                    text-white font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  Email {stephanie.shortName} Directly
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
