import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Advocacy",
  description:
    "The Greater Medina Chamber of Commerce advocates for pro-business policies at the local, state, and federal level, mobilizing the business community on issues that matter.",
  openGraph: {
    title: "Advocacy | Greater Medina Chamber of Commerce",
    description:
      "Pro-business advocacy at every level of government. The chamber fights for Medina County's business community.",
  },
  alternates: { canonical: "/about/advocacy" },
};

const levels = [
  {
    level: "Local",
    description:
      "We engage with city and county government to ensure local policy supports a thriving business environment, from zoning and infrastructure to economic development.",
  },
  {
    level: "State",
    description:
      "The chamber works with Ohio legislators and state agencies to advance policies that reduce regulatory burden, support workforce development, and promote business growth.",
  },
  {
    level: "Federal",
    description:
      "We stay connected to federal legislative issues that affect small and mid-sized businesses, including tax policy, healthcare, and trade, and make sure Medina's voice is heard.",
  },
];

const activities = [
  {
    title: "Candidate Interviews",
    description:
      "Each election cycle, the chamber interviews candidates for local and state office, giving the business community objective insight into where candidates stand on issues that matter.",
  },
  {
    title: "Voter Education",
    description:
      "We equip chamber members with the information they need to make informed decisions, on candidates, issues, and referendums affecting business.",
  },
  {
    title: "Government Relations",
    description:
      "Chamber leadership maintains active relationships with elected officials at every level, ensuring Medina's business community always has a seat at the table.",
  },
  {
    title: "Issue Mobilization",
    description:
      "When issues arise that could significantly impact our members, we mobilize the business community to speak with one voice to lawmakers and regulators.",
  },
];

export default function AdvocacyPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Business Advocacy | Greater Medina Chamber of Commerce",
    description:
      "The Greater Medina Chamber of Commerce advocates for pro-business policies at the local, state, and federal level, mobilizing Medina County's business community on issues that matter.",
    url: "https://medinachamber.com/about/advocacy",
    about: {
      "@type": "Organization",
      name: "Greater Medina Chamber of Commerce",
      url: "https://medinachamber.com",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pt-f144 pb-f89">
        <div className="max-w-3xl">
          <p className="text-overline text-cambridge mb-f8">About</p>
          <h1 className="text-display">
            <span className="block">Business</span>
            <span className="block text-accent">Advocacy</span>
          </h1>
          <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
            The chamber promotes pro-business, quality government at the local,
            state, and federal level, mobilizing support for the issues that
            shape our community and our economy.
          </p>
        </div>
      </section>

      {/* Your Voice in Government */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          <div className="grid lg:grid-cols-2 gap-f34 lg:gap-f55">
            <div>
              <h2 className="text-h2">Your Voice in Government</h2>
              <p className="text-body text-text-secondary mt-f13 leading-relaxed">
                Businesses don&apos;t have time to track every policy issue, we
                do it for them. The Greater Medina Chamber of Commerce stays
                engaged at every level of government so our members can stay
                focused on running their businesses.
              </p>
              <p className="text-body text-text-secondary mt-f21 leading-relaxed">
                Whether it&apos;s a local zoning decision, a state regulatory
                change, or a federal bill working through Congress, the chamber
                is watching, and when it matters, we act.
              </p>
            </div>

            <div className="space-y-f21">
              {levels.map((item) => (
                <div
                  key={item.level}
                  className="p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
                >
                  <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-f8">
                    {item.level} Government
                  </p>
                  <p className="text-body-sm text-text-secondary leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* How We Advocate */}
      <section className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-overline text-cambridge mb-f21">How We Advocate</h2>
            <div className="grid md:grid-cols-2 gap-f21">
              {activities.map((a) => (
                <div
                  key={a.title}
                  className="p-f21 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)]"
                >
                  <h3 className="text-h4 mb-f8">{a.title}</h3>
                  <p className="text-body-sm text-text-secondary leading-relaxed">
                    {a.description}
                  </p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Candidate interview program */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          <div className="p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <div className="grid lg:grid-cols-2 gap-f34 items-center">
              <div>
                <p className="text-overline text-cambridge mb-f8">Election Season</p>
                <h2 className="text-h2">Candidate Interview Program</h2>
                <p className="text-body-lg text-text-secondary mt-f13">
                  Every election cycle, the chamber conducts structured candidate
                  interviews and shares the results with the business community.
                  We&apos;ve hosted documented interviews in 2019, 2020, 2021,
                  2023, 2024, and 2025, giving members consistent, objective
                  information when it matters most.
                </p>
              </div>
              <div className="space-y-f21">
                <p className="text-body text-text-secondary">
                  Interested in the chamber&apos;s positions on business-related
                  legislation or upcoming candidate interviews? Contact us to
                  get involved.
                </p>
                <Link
                  href="/about/contact"
                  className="
                    inline-flex items-center px-f21 py-f13
                    bg-accent hover:bg-accent-hover
                    text-white font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  Contact the Chamber →
                </Link>
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
