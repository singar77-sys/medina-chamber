import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "BWC Safety Council Program — FY26",
  description:
    "Participate in the Medina County Safety Council FY26 program and earn up to 3% back on your Ohio workers' compensation policy. Requirements, credits, and eligibility details.",
  openGraph: {
    title: "BWC Safety Council Program FY26 | Medina Chamber",
    description:
      "Earn up to 3% back on your BWC policy. Join by July 31, attend 10 meetings July 2025 – June 2026. Free for chamber members.",
  },
  alternates: { canonical: "/programs/safety-council/fy26" },
};

const pillars = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    label: "Collaboration",
    desc: "Connect with local employers and share prevention strategies that strengthen workplace safety across Medina County.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    label: "Innovation",
    desc: "Discover new safety techniques and BWC resources that keep your team ahead of emerging workplace hazards.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    label: "Networking",
    desc: "Build relationships with other employers and safety professionals across the county at monthly meetings.",
  },
];

const requirements = [
  {
    step: "01",
    title: "Enroll by July 31",
    desc: "Join your local safety council by July 31, 2025. All companies — new and returning — must enroll to participate in the FY26 BWC rebate program.",
  },
  {
    step: "02",
    title: "Attend 10 Monthly Meetings",
    desc: "Attend 10 in-person safety council meetings between July 1, 2025 and June 30, 2026. Meetings are held the 3rd Tuesday of each month at Williams on the Lake, Medina.",
  },
  {
    step: "03",
    title: "Earn Up to 4 Additional Credits",
    desc: "Supplement your attendance with approved external safety training (up to 2 credits) or a comprehensive BWC onsite consultation visit (up to 2 credits, once every 3 years).",
  },
];

const benefits = [
  "Learn techniques for increasing safety, health, and wellness in your workplace.",
  "Network and collaborate with other employers in your community to share best practices.",
  "Learn about resources that can assist you in your accident prevention efforts.",
  "Discover new and innovative safety techniques.",
];

const additionalCredits = [
  {
    title: "External Training Credits",
    max: "2 credits max",
    desc: "Attending virtual or in-person training including BWC safety training courses (BWC online e-courses and webinars do not qualify), or in-person safety training provided by external sources such as industry associations or third-party administrators that is approved by BWC.",
  },
  {
    title: "BWC Onsite Consultation",
    max: "2 credits max / once per 3 years",
    desc: "Completing a Comprehensive Onsite Consultation visit by a BWC Field Safety Service Consultant. Must include a full hazard assessment and a claims review.",
  },
];

const eligibilityNotes = [
  "A person can represent only one policy number with attendance at safety council meeting(s) or external training event(s).",
  "Safety council monthly meetings do not qualify for meeting credit for any employer not enrolled in that safety council.",
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: "Medina County Safety Council FY26 Program",
  description:
    "Ohio BWC Safety Council Program FY26. Attend 10 meetings and earn up to 3% back on your workers' compensation policy.",
  startDate: "2025-07-01",
  endDate: "2026-06-30",
  location: {
    "@type": "Place",
    name: "Williams on the Lake",
    address: { "@type": "PostalAddress", streetAddress: "787 Lafayette Road", addressLocality: "Medina", addressRegion: "OH" },
  },
  organizer: {
    "@type": "Organization",
    name: "Greater Medina Chamber of Commerce",
    url: "https://medinachamber.com",
  },
};

export default function SafetyCouncilFY26Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
        {/* Ghosted workplace-safety backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/medina-chamber-safety-council-fy26-hero.webp"
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
            <p className="text-overline text-cambridge mb-f8">Safety Council · FY26 Program</p>
            <h1 className="text-display leading-tight">
              <span className="block">BWC Safety</span>
              <span className="block text-accent">Council Program</span>
            </h1>
            <p className="text-body-lg text-text-secondary mt-f13 max-w-xl leading-relaxed">
              Collaborate with local employers, develop workplace prevention strategies,
              and earn meaningful rebates on your Ohio workers&apos; compensation policy.
            </p>
            <div className="mt-f21 flex flex-wrap gap-f13">
              <a
                href="mailto:safety@medinaohchamber.com"
                className="
                  inline-flex items-center px-f21 py-f13
                  bg-accent hover:bg-accent-hover
                  text-white font-bold text-body
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                Enroll for FY26 →
              </a>
              <Link
                href="/programs/safety-council"
                className="
                  inline-flex items-center px-f21 py-f13
                  border border-border-primary hover:border-text-tertiary
                  text-text-primary font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                Safety Council Overview
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Rebate stat + pillars */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pt-f89 pb-f55 lg:pt-f144 lg:pb-f89">
        <FadeIn>
          {/* Benefits */}
          <div className="mb-f55">
            <p className="text-overline text-cambridge mb-f13">How participating benefits you</p>
            <ul className="grid sm:grid-cols-2 gap-f13">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-f13 text-body text-text-primary">
                  <svg className="w-5 h-5 text-cambridge mt-f3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid lg:grid-cols-2 gap-f34 lg:gap-f55 items-center mb-f55">
            {/* Big stat */}
            <div>
              <p className="text-overline text-cambridge mb-f8">The incentive</p>
              <div className="flex items-baseline gap-f8 mb-f13">
                <span className="text-[5rem] font-black leading-none text-text-primary tabular-nums">3%</span>
                <span className="text-h3 text-text-secondary font-medium">back on your policy</span>
              </div>
              <p className="text-body text-text-secondary leading-relaxed">
                Qualifying employers earn up to 3% back on their Ohio BWC workers&apos;
                compensation policy — up to $5,000 annually. Meet the participation
                requirements between July 1, 2025 and June 30, 2026 to qualify.
              </p>
              <p className="mt-f13 text-body-sm text-text-tertiary">
                FY26 period: July 1, 2025 – June 30, 2026 · Enrollment deadline: July 31, 2025
              </p>
            </div>

            {/* Pillars */}
            <div className="space-y-f13">
              <p className="text-caption font-bold text-cambridge uppercase tracking-wider mb-f13">
                Discover the power of
              </p>
              {pillars.map((p) => (
                <div
                  key={p.label}
                  className="flex items-start gap-f13 p-f13 bg-bg-secondary border border-border-secondary rounded-[var(--radius-md)]"
                >
                  <span className="shrink-0 w-10 h-10 flex items-center justify-center rounded-[var(--radius-sm)] bg-cambridge/15 text-cambridge mt-f3">
                    {p.icon}
                  </span>
                  <div>
                    <p className="text-body font-bold text-text-primary">{p.label}</p>
                    <p className="text-body-sm text-text-secondary mt-f3 leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* How to qualify */}
      <section className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <p className="text-overline text-cambridge mb-f8">Participation made simple</p>
            <h2 className="text-h2 mb-f21">How to qualify for the rebate</h2>
            <div className="grid md:grid-cols-3 gap-f21">
              {requirements.map((r) => (
                <div
                  key={r.step}
                  className="relative p-f21 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)]"
                >
                  <span
                    aria-hidden
                    className="absolute top-f13 right-f13 text-[3.5rem] font-black leading-none text-text-primary/[0.05] select-none tabular-nums"
                  >
                    {r.step}
                  </span>
                  <p className="text-caption font-bold text-cambridge uppercase tracking-wider mb-f8">
                    Step {r.step}
                  </p>
                  <h3 className="text-h4 mb-f13">{r.title}</h3>
                  <p className="text-body-sm text-text-secondary leading-relaxed">{r.desc}</p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Additional credits */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          <div className="grid lg:grid-cols-2 gap-f34 lg:gap-f55 items-start">
            <div>
              <p className="text-overline text-cambridge mb-f8">Beyond the monthly meetings</p>
              <h2 className="text-h2 mb-f13">Earning additional credits</h2>
              <p className="text-body text-text-secondary leading-relaxed">
                Members may earn up to 4 additional credits on top of in-person
                monthly meeting attendance. These credits count toward the rebate
                qualification threshold.
              </p>
            </div>
            <div className="space-y-f21">
              {additionalCredits.map((c) => (
                <div
                  key={c.title}
                  className="p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
                >
                  <div className="flex items-start justify-between gap-f8 mb-f8">
                    <h3 className="text-body font-bold text-text-primary">{c.title}</h3>
                    <span className="shrink-0 text-caption font-bold text-cambridge bg-cambridge/10 px-f8 py-f3 rounded-full">
                      {c.max}
                    </span>
                  </div>
                  <p className="text-body-sm text-text-secondary leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Eligibility guidelines */}
      <section className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="max-w-3xl">
              <p className="text-overline text-cambridge mb-f8">Additional guidelines</p>
              <h2 className="text-h2 mb-f21">Rebate eligibility requirements</h2>
              <ul className="space-y-f13 mb-f21">
                {eligibilityNotes.map((note) => (
                  <li key={note} className="flex items-start gap-f13 text-body text-text-primary">
                    <svg className="w-5 h-5 text-cambridge mt-f3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {note}
                  </li>
                ))}
              </ul>

              {/* Fine print */}
              <div className="p-f21 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)]">
                <p className="text-caption font-bold text-text-tertiary uppercase tracking-wider mb-f8">
                  Program fine print
                </p>
                <p className="text-body-sm text-text-tertiary leading-relaxed">
                  * The rebate offer excludes self-insuring employers and state agencies.
                  Limitations apply to professional/alternate employer organizations and
                  their clients. To receive the rebate, not to exceed{" "}
                  <strong className="text-text-secondary">$5,000 annually</strong>, employers&apos;
                  policies must be current with respect to all payments due BWC. Employers
                  may not have cumulative lapses in workers&apos; compensation coverage in
                  excess of{" "}
                  <strong className="text-text-secondary">40 days</strong> within the prior
                  12 months. Additionally, employers must have timely reported actual payroll
                  for the preceding policy year and pay any premium due upon reconciliation
                  of estimated premium and actual premium.
                </p>
              </div>

              <p className="mt-f21 text-body-sm text-text-secondary">
                For full program details, visit the{" "}
                <a
                  href="https://info.bwc.ohio.gov/for-employers/safety-services/safety-councils/safety-councils"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cambridge hover:text-cambridge/80 underline underline-offset-2 transition-colors"
                >
                  Ohio BWC Safety Councils page →
                </a>
              </p>
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
                <h2 className="text-h2">Ready to enroll?</h2>
                <p className="text-body-lg text-text-secondary mt-f13 leading-relaxed">
                  Chamber members enroll at no cost. Contact us to get started — or
                  if you&apos;re not yet a member, joining at Business Essentials
                  ($345/year) includes Safety Council access automatically.
                </p>
              </div>
              <div className="space-y-f13">
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
                    border border-border-primary hover:border-text-tertiary
                    text-text-primary font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  (330) 723-8773
                </a>
                <Link
                  href="/programs/safety-council/attendance"
                  className="
                    block w-full text-center py-f13 px-f21
                    text-cambridge font-bold text-body-sm
                    transition-colors hover:text-cambridge/80
                  "
                >
                  Check FY26 Attendance Records
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-f21 flex flex-wrap gap-f21">
            <Link
              href="/programs/safety-council"
              className="text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
            >
              ← Back to Safety Council
            </Link>
            <Link
              href="/membership/join"
              className="text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
            >
              Join the Chamber
            </Link>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
