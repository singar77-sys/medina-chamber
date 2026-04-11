import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Membership Pricing",
  description:
    "Greater Medina Chamber of Commerce membership is priced by number of employees. Most small businesses invest between $250–$400 per year. Contact us for your exact tier.",
  openGraph: {
    title: "Membership Pricing — Greater Medina Chamber of Commerce",
    description:
      "Tiered membership pricing based on company size. Most small businesses start at $250–$400/year.",
  },
  alternates: { canonical: "/membership/pricing" },
};

const tiers = [
  { employees: "1", label: "Sole Proprietor" },
  { employees: "2–5", label: "Micro Business" },
  { employees: "6–10", label: "Small Business" },
  { employees: "11–25", label: "Growing Business" },
  { employees: "26–50", label: "Mid-Size Business" },
  { employees: "51–100", label: "Established Business" },
  { employees: "100+", label: "Large Organization" },
];

const included = [
  "Searchable member directory listing",
  "Business profile with contact info, website, and categories",
  "Networking events and mixers",
  "Ribbon cutting ceremonies",
  "Chamber advocacy at local, state, and federal levels",
  "Safety Council participation (no additional charge)",
  "Access to all 5 member savings programs",
  "Committee and council participation",
  "Member rate on events and programs",
  "Free notary services at the chamber office",
  "Member news and announcement platform",
  "Social media promotion by the chamber",
];

const visibilityPlus = [
  "Everything in Standard",
  "Featured badge on directory listing",
  "Priority placement in search results",
  "Enhanced directory profile visibility",
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Membership</p>
        <h1 className="text-display">
          Membership
          <br />
          <span className="text-accent">Pricing</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          Membership is priced by the number of people in your organization.
          Most small businesses invest between $250–$400 per year — and the
          savings programs alone often exceed that in the first year.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/membership/join"
            className="
              inline-flex items-center px-8 py-4
              bg-accent hover:bg-accent-hover
              text-white font-bold text-body
              rounded-[var(--radius-md)]
              transition-colors
            "
          >
            Apply for Membership →
          </Link>
          <a
            href="mailto:stephanie@medinaohchamber.com"
            className="
              inline-flex items-center px-6 py-4
              border border-border-primary hover:border-text-tertiary
              text-text-primary font-bold text-body-sm
              rounded-[var(--radius-md)]
              transition-colors
            "
          >
            Ask About Your Rate
          </a>
        </div>
      </section>

      {/* How pricing works */}
      <section className="mt-20 grid lg:grid-cols-2 gap-12 items-start">
        <div>
          <h2 className="text-h2">How It Works</h2>
          <p className="text-body text-text-secondary mt-4 leading-relaxed">
            The chamber uses an employee-count model — the larger your team,
            the more your membership supports chamber operations. Every tier
            gets the same core benefits; the investment scales with your size.
          </p>
          <p className="text-body text-text-secondary mt-4 leading-relaxed">
            Contact Stephanie Mueller for exact pricing on your employee count.
            She&apos;ll walk you through the tiers and help you understand the
            return on your investment before you commit.
          </p>
          <div className="mt-6 space-y-3">
            <a
              href="mailto:stephanie@medinaohchamber.com"
              className="
                inline-flex items-center px-6 py-3
                bg-accent hover:bg-accent-hover
                text-white font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Email Stephanie →
            </a>
            <p className="text-body-sm text-text-tertiary">
              Or call{" "}
              <a href="tel:+13307238773" className="text-cambridge hover:text-cambridge/80 transition-colors">
                (330) 723-8773
              </a>
            </p>
          </div>
        </div>

        {/* Tier list */}
        <div>
          <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-4">
            Pricing Tiers by Employee Count
          </p>
          <div className="space-y-2">
            {tiers.map((t) => (
              <div
                key={t.employees}
                className="flex items-center justify-between px-5 py-3.5 bg-bg-secondary border border-border-secondary rounded-[var(--radius-md)]"
              >
                <div>
                  <span className="text-body font-bold text-text-primary">
                    {t.employees} {t.employees === "1" ? "employee" : "employees"}
                  </span>
                  <span className="text-body-sm text-text-tertiary ml-2">
                    · {t.label}
                  </span>
                </div>
                <a
                  href="mailto:stephanie@medinaohchamber.com"
                  className="text-caption font-bold text-cambridge hover:text-cambridge/80 transition-colors"
                >
                  Get rate →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Membership tiers */}
      <section className="mt-20">
        <h2 className="text-overline text-cambridge mb-8">Membership Tiers</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Standard */}
          <div className="p-8 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <p className="text-caption text-text-tertiary uppercase tracking-wider mb-2">
              Standard
            </p>
            <h3 className="text-h3">Core Membership</h3>
            <p className="text-body-sm text-text-secondary mt-3 leading-relaxed">
              Full chamber membership with every benefit — directory listing,
              events, advocacy, savings programs, committees, and more.
            </p>
            <ul className="mt-5 space-y-2">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-2 text-body-sm text-text-secondary">
                  <svg className="w-4 h-4 text-cambridge shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Visibility Plus */}
          <div className="p-8 bg-oxford text-white rounded-[var(--radius-lg)]">
            <p className="text-caption text-cambridge uppercase tracking-wider mb-2 font-bold">
              Visibility Plus
            </p>
            <h3 className="text-h3 text-white">Premium Membership</h3>
            <p className="text-body-sm text-white/70 mt-3 leading-relaxed">
              Everything in Standard, plus priority positioning in the directory
              and featured placement that puts your business at the top of
              relevant searches.
            </p>
            <ul className="mt-5 space-y-2">
              {visibilityPlus.map((item) => (
                <li key={item} className="flex items-start gap-2 text-body-sm text-white/80">
                  <svg className="w-4 h-4 text-cambridge shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8 pt-6 border-t border-white/20">
              <p className="text-body-sm text-white/60">
                Ask Stephanie about Visibility Plus rates when you inquire about membership.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Special note: Safety Council */}
      <section className="mt-8 p-6 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
        <p className="text-body-sm text-text-secondary leading-relaxed">
          <span className="font-bold text-text-primary">Safety Council note: </span>
          Non-members can join the Medina County Safety Council for $100/year, or
          join the chamber ($295+) and get Safety Council included at no charge.
          The $295 entry level is the most cost-effective path for small businesses
          that want BWC rebate eligibility.{" "}
          <Link href="/programs/safety-council" className="text-cambridge hover:text-cambridge/80 transition-colors">
            Learn about the Safety Council →
          </Link>
        </p>
      </section>

      {/* CTA */}
      <section className="mt-20 p-10 lg:p-16 bg-oxford text-white rounded-[var(--radius-lg)]">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-h2 text-white">Questions before you commit?</h2>
            <p className="text-body-lg text-white/70 mt-4">
              Stephanie will walk you through what's included, what your rate
              would be, and what similar businesses in your industry typically
              get out of membership. No pressure — just a conversation.
            </p>
          </div>
          <div className="space-y-4">
            <a
              href="mailto:stephanie@medinaohchamber.com"
              className="
                block w-full text-center py-3 px-6
                bg-cambridge hover:bg-cambridge/90
                text-white font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Email Stephanie →
            </a>
            <Link
              href="/membership/join"
              className="
                block w-full text-center py-3 px-6
                border border-white/30 hover:border-white/60
                text-white font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Apply Now
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
