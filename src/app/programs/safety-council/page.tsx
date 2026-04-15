import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Medina County Safety Council",
  description:
    "The Medina County Safety Council is a partnership between the Ohio Bureau of Workers' Compensation and the Greater Medina Chamber of Commerce — offering workplace safety education and BWC rebate opportunities for Medina County employers.",
  openGraph: {
    title: "Medina County Safety Council — Greater Medina Chamber of Commerce",
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
  "Enroll by the annual deadline (July 31 for FY26)",
  "Attend 10 in-person safety council meetings during the fiscal year",
  "Earn up to 4 additional credits via approved safety training or BWC consultation visits",
  "Pre-register for each meeting by 5:00 PM on the Friday before",
];

export default function SafetyCouncilPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Programs</p>
        <h1 className="text-display">
          Safety
          <br />
          <span className="text-accent">Council</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          Workplace safety education for every business in Medina County —
          and a path to meaningful BWC rebates for companies that participate.
        </p>
        <p className="text-body-sm text-text-tertiary mt-4">
          A partnership between the{" "}
          <span className="text-text-secondary font-semibold">
            Ohio Bureau of Workers&apos; Compensation
          </span>{" "}
          and the{" "}
          <span className="text-text-secondary font-semibold">
            Greater Medina Chamber of Commerce
          </span>
        </p>
      </section>

      {/* What it is */}
      <section className="mt-20 grid lg:grid-cols-2 gap-12 items-start">
        <div>
          <h2 className="text-h2">What Is the Safety Council?</h2>
          <p className="text-body text-text-secondary mt-4 leading-relaxed">
            The Medina County Safety Council provides education in all areas of
            workplace safety — from OSHA compliance and injury prevention to
            ergonomics and emergency preparedness. It&apos;s open to all
            businesses in Medina County, regardless of size or industry.
          </p>
          <p className="text-body text-text-secondary mt-4 leading-relaxed">
            Participation in the Safety Council also qualifies businesses for
            the Ohio BWC Group Rebate Program, which can return a meaningful
            percentage of workers&apos; compensation premiums to compliant
            employers.
          </p>
        </div>

        {/* Meeting details */}
        <div className="p-8 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
          <p className="text-overline text-cambridge mb-4">Monthly Meetings</p>
          <div className="space-y-4">
            <div>
              <p className="text-caption text-text-tertiary uppercase tracking-wider">Location</p>
              <p className="text-body font-semibold text-text-primary mt-1">Williams on the Lake</p>
              <p className="text-body-sm text-text-secondary">787 Lafayette Road, Medina</p>
            </div>
            <div>
              <p className="text-caption text-text-tertiary uppercase tracking-wider">Schedule</p>
              <p className="text-body font-semibold text-text-primary mt-1">Third Tuesday of each month</p>
              <p className="text-body-sm text-text-secondary">11:30 AM – 1:00 PM</p>
            </div>
            <div>
              <p className="text-caption text-text-tertiary uppercase tracking-wider">Per-Meeting Cost</p>
              <p className="text-body font-semibold text-text-primary mt-1">$20 per person</p>
            </div>
            <div className="pt-2 border-t border-border-secondary">
              <p className="text-body-sm text-text-tertiary">
                Pre-registration required by 5:00 PM on the Friday before
                each meeting. Walk-in registrations are not available.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Enrollment tiers */}
      <section className="mt-20">
        <h2 className="text-overline text-cambridge mb-8">Participation Options — FY26</h2>
        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl">
          {tiers.map((t) => (
            <div
              key={t.label}
              className={`p-6 rounded-[var(--radius-lg)] border ${
                t.highlight
                  ? "bg-oxford [[data-theme=dark]_&]:bg-bg-tertiary text-white border-oxford [[data-theme=dark]_&]:border-cambridge"
                  : "bg-bg-secondary border-border-secondary"
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
                className={`text-body font-bold mt-1 ${
                  t.highlight ? "text-white" : "text-text-primary"
                }`}
              >
                {t.label}
              </p>
              <p
                className={`text-body-sm mt-3 leading-relaxed ${
                  t.highlight ? "text-white/70" : "text-text-secondary"
                }`}
              >
                {t.description}
              </p>
            </div>
          ))}
        </div>
        <p className="text-body-sm text-text-tertiary mt-4">
          All companies — new and returning — must register to participate in the FY26 BWC Rebate Program.
        </p>
      </section>

      {/* BWC requirements */}
      <section className="mt-20">
        <h2 className="text-overline text-cambridge mb-8">BWC Rebate Requirements</h2>
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-body text-text-secondary leading-relaxed">
              To qualify for the BWC Group Rebate, member companies must meet
              the participation requirements for the fiscal year (July 1 –
              June 30). Meeting all requirements positions your company for a
              meaningful rebate on Ohio workers&apos; compensation premiums.
            </p>
            <ul className="mt-6 space-y-3">
              {requirements.map((r) => (
                <li key={r} className="flex items-start gap-3 text-body text-text-primary">
                  <svg
                    className="w-5 h-5 text-cambridge mt-0.5 shrink-0"
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

          <div className="p-8 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <h3 className="text-h3">Ready to enroll?</h3>
            <p className="text-body text-text-secondary mt-3 leading-relaxed">
              Contact the chamber to get started with Safety Council enrollment
              for FY26. Chamber members enroll at no cost — non-members can
              join the chamber and get the Safety Council included.
            </p>
            <div className="mt-6 space-y-3">
              <a
                href="mailto:safety@medinaohchamber.com"
                className="
                  block w-full text-center py-3 px-6
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
                  block w-full text-center py-3 px-6
                  border border-border-primary hover:border-text-tertiary
                  text-text-primary font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                (330) 723-8773
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Not a member nudge */}
      <section className="mt-20 p-10 lg:p-16 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-h2">Chamber members enroll free.</h2>
            <p className="text-body-lg text-text-secondary mt-4">
              If you&apos;re not already a Greater Medina Chamber member,
              joining at Business Essentials ($345/year) gets you Safety
              Council membership, plus access to networking events, the
              member directory, advocacy, and much more.
            </p>
          </div>
          <div className="space-y-4">
            <Link
              href="/membership/join"
              className="
                block w-full text-center py-3 px-6
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
                block w-full text-center py-3 px-6
                border border-border-primary hover:border-text-tertiary
                text-text-primary font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              See Member Benefits
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
