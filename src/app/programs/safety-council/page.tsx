import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { VesicaPiscisWatermark } from "@/components/effects/VesicaPiscisWatermark";
import { safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Medina County Safety Council",
  description:
    "The Medina County Safety Council is a partnership between the Ohio Bureau of Workers' Compensation and the Greater Medina Chamber of Commerce, offering workplace safety education and BWC rebate opportunities for Medina County employers.",
  openGraph: {
    title: "Medina County Safety Council | Greater Medina Chamber of Commerce",
    description:
      "Workplace safety education and BWC rebate program for Medina County employers. Monthly meetings at Williams on the Lake.",
  },
  alternates: { canonical: "/programs/safety-council" },
};

const tiers = [
  {
    price: "$0",
    label: "Chamber Members",
    description:
      "Greater Medina Chamber members participate at no cost. Enrollment is still required.",
    highlight: true,
  },
  {
    price: "$100",
    label: "Non-Members",
    description: "Annual membership fee for employers not currently in the chamber.",
    highlight: false,
  },
];

const requirements = [
  "Enroll by the annual deadline for the program year",
  "Attend 10 in-person safety council meetings during the fiscal year",
  "Earn up to 4 additional credits via approved safety training or BWC consultation visits",
  "Advance registration required for each meeting — no walk-in registration on event day",
];

export default function SafetyCouncilPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Medina County Safety Council",
    description:
      "Workplace safety education and Ohio BWC Group Rebate program for Medina County employers. Monthly meetings covering OSHA compliance, injury prevention, ergonomics, and emergency preparedness.",
    provider: {
      "@type": "Organization",
      name: "Greater Medina Chamber of Commerce",
      url: "https://medinachamber.com",
    },
    areaServed: { "@type": "AdministrativeArea", name: "Medina County, Ohio" },
    offers: [
      {
        "@type": "Offer",
        name: "Chamber Members",
        price: "0",
        priceCurrency: "USD",
        description: "Free for Greater Medina Chamber members",
      },
      {
        "@type": "Offer",
        name: "Non-Members",
        price: "100",
        priceCurrency: "USD",
        description: "Annual membership fee for non-chamber employers",
      },
    ],
    serviceType: "Workplace Safety Education",
    url: "https://medinachamber.com/programs/safety-council",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      
      <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
        {/* Ghosted safety-worker (hard hat + hi-vis) backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/medina-chamber-safety-council-hero.webp"
            alt=""
            fill
            priority
            className="object-cover object-[center_25%] opacity-[0.33]"
            sizes="100vw"
            quality={60}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-3xl">
          <p className="text-overline text-cambridge mb-f8">Programs</p>
          <h1 className="text-display">
            <span className="block">Safety</span>
            <span className="block text-accent">Council</span>
          </h1>
          <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
            Workplace safety education for every business in Medina County, 
            and a path to meaningful BWC rebates for companies that participate.
          </p>
          <div className="mt-f21">
            <Link
              href="/programs/safety-council/attendance"
              className="
                inline-flex items-center px-f21 py-f13
                bg-accent hover:bg-accent-hover
                text-white font-bold text-body
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Safety Council Attendance →
            </Link>
          </div>

          <p className="text-body-sm text-text-tertiary mt-f8">
            A partnership between the{" "}
            <span className="text-text-secondary font-bold">
              Ohio Bureau of Workers&apos; Compensation
            </span>{" "}
            and the{" "}
            <span className="text-text-secondary font-bold">
              Greater Medina Chamber of Commerce
            </span>
          </p>
        </div>
        </div>
      </section>

      {/* What Is It + Meeting Details */}
      <section className="relative overflow-hidden rule-top mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <VesicaPiscisWatermark className="tp-vesica" />
        <FadeIn>
          <div className="grid lg:grid-cols-2 gap-f34 lg:gap-f55 items-start">
            <div>
              <h2 className="text-h2">What Is the Safety Council?</h2>
              <div className="mt-f13 space-y-f21 text-body text-text-secondary leading-relaxed">
                <p>
                  The Medina County Safety Council provides education in all areas of
                  workplace safety, from OSHA compliance and injury prevention to
                  ergonomics and emergency preparedness. It&apos;s open to all
                  businesses in Medina County, regardless of size or industry.
                </p>
                <p>
                  Participation in the Safety Council also qualifies businesses for
                  the Ohio BWC Group Rebate Program, which can return a meaningful
                  percentage of workers&apos; compensation premiums to compliant
                  employers.
                </p>
              </div>
            </div>

            {/* Meeting details card — p-f21 */}
            <div className="p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
              <p className="text-overline text-cambridge mb-f21">Monthly Meetings</p>
              <div className="space-y-f21">
                <div>
                  <p className="text-caption text-text-tertiary uppercase tracking-wider">Location</p>
                  <p className="text-body font-bold text-text-primary mt-f3">Williams on the Lake</p>
                  <p className="text-body-sm text-text-secondary">787 Lafayette Road, Medina</p>
                </div>
                <div>
                  <p className="text-caption text-text-tertiary uppercase tracking-wider">Schedule</p>
                  <p className="text-body font-bold text-text-primary mt-f3">Third Tuesday of each month</p>
                  <p className="text-body-sm text-text-secondary">11:30 AM – 1:00 PM</p>
                </div>
                <div>
                  <p className="text-caption text-text-tertiary uppercase tracking-wider">Per-Meeting Cost</p>
                  <p className="text-body font-bold text-text-primary mt-f3">$24 per person</p>
                </div>
                <div className="pt-f13 border-t border-border-secondary">
                  <p className="text-body-sm text-text-tertiary">
                    Advance registration required — walk-in registrations are
                    not available. Cancellations must be received by 2:00 PM
                    the Friday prior to avoid being billed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Enrollment tiers */}
      <section className="relative overflow-hidden bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        {/* Ghosted safety-training seminar backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/medina-chamber-workshop-seminar.webp"
            alt=""
            fill
            className="object-cover object-top opacity-[0.10]"
            sizes="100vw"
            quality={60}
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-overline text-cambridge mb-f21">
              Participation Options, FY27
            </h2>
            <div className="grid sm:grid-cols-2 gap-f21 max-w-3xl">
              {tiers.map((t) => (
                <div
                  key={t.label}
                  className={`p-f21 rounded-[var(--radius-lg)] border ${
                    t.highlight
                      ? "bg-oxford text-white border-oxford [[data-theme=dark]_&]:border-cambridge"
                      : "bg-bg-primary border-border-secondary"
                  }`}
                >
                  <p
                    className={`text-display font-bold ${
                      t.highlight ? "text-cambridge" : "text-text-primary"
                    }`}
                  >
                    {t.price}
                  </p>
                  <p
                    className={`text-body font-bold mt-f3 ${
                      t.highlight ? "text-white" : "text-text-primary"
                    }`}
                  >
                    {t.label}
                  </p>
                  <p
                    className={`text-body-sm mt-f13 leading-relaxed ${
                      t.highlight ? "text-white/70" : "text-text-secondary"
                    }`}
                  >
                    {t.description}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-body-sm text-text-tertiary mt-f13">
              All companies, new and returning, must register to participate in the FY27 BWC Rebate Program.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* BWC Requirements */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          <h2 className="text-overline text-cambridge mb-f21">BWC Rebate Requirements</h2>
          <div className="grid lg:grid-cols-2 gap-f34 lg:gap-f55 items-start">
            <div>
              <p className="text-body text-text-secondary leading-relaxed">
                To qualify for the BWC Group Rebate, member companies must meet
                the participation requirements for the fiscal year (July 1 –
                June 30). Meeting all requirements positions your company for a
                meaningful rebate on Ohio workers&apos; compensation premiums.
              </p>
              <ul className="mt-f21 space-y-f13">
                {requirements.map((r) => (
                  <li key={r} className="flex items-start gap-f13 text-body text-text-primary">
                    <svg
                      className="w-5 h-5 text-cambridge mt-f3 shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            {/* Enroll card — p-f21 */}
            <div className="p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
              <h3 className="text-h3">Ready to enroll?</h3>
              <p className="text-body text-text-secondary mt-f8 leading-relaxed">
                Contact the chamber to get started with Safety Council enrollment
                for FY27. Chamber members enroll at no cost, non-members can
                join the chamber and get the Safety Council included.
              </p>
              <div className="mt-f21 space-y-f13">
                <a
                  href="mailto:safety@medinaohchamber.com"
                  className="
                    block w-full text-center py-f13 px-f21
                    bg-accent hover:bg-accent-hover
                    text-white font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  Email safety@medinaohchamber.com →
                </a>
                <a
                  href="tel:+13307238773"
                  className="
                    block w-full text-center py-f13 px-f21
                    bg-emerald hover:bg-emerald/90
                    text-white font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  (330) 723-8773
                </a>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Chamber members enroll free — ghosted safety-gear section background */}
      <section className="rule-top relative overflow-hidden py-f55 lg:py-f89">
        {/* Ghosted safety-gear backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/medina-chamber-safety-council-bg.webp"
            alt=""
            fill
            className="object-cover object-[center_25%] opacity-[0.10]"
            sizes="100vw"
            quality={60}
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="grid lg:grid-cols-2 gap-f34 items-center">
              <div>
                <h2 className="text-h2">Chamber members enroll free.</h2>
                <p className="text-body-lg text-text-secondary mt-f13">
                  If you&apos;re not already a Greater Medina Chamber member,
                  joining at Business Essentials ($345/year) gets you Safety
                  Council membership, plus access to networking events, the
                  member directory, advocacy, and much more.
                </p>
              </div>
              <div className="space-y-f13">
                <Link
                  href="/membership/join"
                  className="
                    block w-full text-center py-f13 px-f21
                    bg-accent hover:bg-accent-hover
                    text-white font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  Join the Chamber →
                </Link>
                <Link
                  href="/membership/benefits"
                  className="
                    block w-full text-center py-f13 px-f21
                    bg-emerald hover:bg-emerald/90
                    text-white font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  See Member Benefits
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
