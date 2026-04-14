import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Membership Pricing",
  description:
    "Three Greater Medina Chamber of Commerce membership tiers: Business Essentials ($345/year), Visibility Plus ($575/year), and Community Investor ($1,145/year). Choose the level that fits your goals.",
  openGraph: {
    title: "Membership Pricing — Greater Medina Chamber of Commerce",
    description:
      "Three tiers: Business Essentials ($345), Visibility Plus ($575), Community Investor ($1,145). Pick the level that fits your business.",
  },
  alternates: { canonical: "/membership/pricing" },
};

interface Tier {
  key: "essentials" | "plus" | "investor";
  name: string;
  price: number;
  tagline: string;
  who: string;
  benefits: string[];
  /** Benefits added on top of the previous tier */
  addedBenefits?: string[];
  cta: string;
}

const essentialsBenefits = [
  "Online directory listing",
  "Ribbon cutting ceremony",
  "Member mailing address list",
  "Post sharing on Chamber socials",
  "Business advocacy & economic development support",
  "Access to coworking space",
  "Member Portal account",
  "Custom digital membership badge",
  "Free job postings",
  "Share company announcements in Member Portal",
  "Referral network access",
  "Personalized onboarding with Chamber staff",
  "Free notary service",
  "Group health insurance (2–50 employees)",
  "20% discount at Medina Recreation Center",
  "Workers' compensation program",
  "Member-only event pricing",
];

const plusAdded = [
  "Directory listing enhanced with logo",
  "Member spotlight (social & email)",
  "Custom digital membership sticker video",
  "E-newsletter ad placement (4 per year)",
  "Free certificate of origin (non-freight forwarders)",
];

const investorAdded = [
  "Investor member spotlight (social, email, & website)",
  "2 free tickets to monthly luncheons",
  "Access to local & state legislator events & introductions",
  "Recognition at all events as Investor",
];

const tiers: Tier[] = [
  {
    key: "essentials",
    name: "Business Essentials",
    price: 345,
    tagline:
      "Everything you need to plug into the Medina business community — visibility, advocacy, and member pricing — at a starter-friendly rate.",
    who: "Solopreneurs and small teams needing credibility, network access, and baseline marketing boosts.",
    benefits: essentialsBenefits,
    cta: "Join Essentials",
  },
  {
    key: "plus",
    name: "Visibility Plus",
    price: 575,
    tagline:
      "Turn up your reach with logo-enhanced directory, member spotlights, and four newsletter ads per year — done-for-you visibility.",
    who: "Growth-minded small and mid-sized businesses seeking more impressions and owned media slots.",
    benefits: essentialsBenefits,
    addedBenefits: plusAdded,
    cta: "Upgrade to Plus",
  },
  {
    key: "investor",
    name: "Community Investor",
    price: 1145,
    tagline:
      "Lead from the front: VIP spotlights, two luncheon tickets monthly, and direct access to legislator events — with recognition at every Chamber event.",
    who: "Established firms prioritizing policy access, high-profile recognition, and year-round VIP presence.",
    benefits: [...essentialsBenefits, ...plusAdded],
    addedBenefits: investorAdded,
    cta: "Become an Investor",
  },
];

const faqs = [
  {
    q: "Do I qualify for group health insurance?",
    a: "Available for employers with 2–50 employees. Details provided during onboarding.",
  },
  {
    q: "What's included in member spotlights?",
    a: "Visibility Plus spotlights run on social and email. Community Investor spotlights run on social, email, and the chamber website.",
  },
  {
    q: "Do Investors get ongoing event perks?",
    a: "Yes — two free luncheon tickets every month plus recognition at all events.",
  },
  {
    q: "What's the Certificate of Origin benefit?",
    a: "Free for non-freight forwarders on Visibility Plus and Community Investor tiers.",
  },
  {
    q: "How do I upgrade later?",
    a: "Contact Stephanie Mueller at any time. Upgrades are prorated based on where you are in your membership year.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
        {/* Hero */}
        <section className="max-w-3xl">
          <p className="text-overline text-cambridge mb-4">Membership</p>
          <h1 className="text-display">
            Three Tiers.
            <br />
            <span className="text-accent">One Community.</span>
          </h1>
          <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
            Pick the tier that fits your goals — from first-year essentials to
            investor-level access and recognition. Every membership includes
            the full Chamber network and savings programs.
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
              Talk to Stephanie
            </a>
          </div>
        </section>

        {/* Tier cards */}
        <section className="mt-20 grid lg:grid-cols-3 gap-6">
          {tiers.map((tier) => {
            const isFeatured = tier.key === "plus";
            return (
              <div
                key={tier.key}
                className={`
                  relative flex flex-col p-8 rounded-[var(--radius-lg)]
                  ${isFeatured
                    ? "bg-oxford text-white border-2 border-cambridge lg:scale-105 lg:shadow-[0_12px_40px_rgba(12,27,51,0.15)]"
                    : "bg-bg-secondary border border-border-secondary"
                  }
                `}
              >
                {isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cambridge text-white text-caption font-bold uppercase tracking-wider rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <p
                  className={`text-caption font-bold uppercase tracking-wider ${
                    isFeatured ? "text-cambridge" : "text-text-tertiary"
                  }`}
                >
                  {tier.name}
                </p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span
                    className={`text-display leading-none ${
                      isFeatured ? "text-white" : "text-text-primary"
                    }`}
                  >
                    ${tier.price.toLocaleString("en-US")}
                  </span>
                  <span
                    className={`text-body-sm ${
                      isFeatured ? "text-white/60" : "text-text-tertiary"
                    }`}
                  >
                    /year
                  </span>
                </div>
                <p
                  className={`text-body-sm mt-4 leading-relaxed ${
                    isFeatured ? "text-white/80" : "text-text-secondary"
                  }`}
                >
                  {tier.tagline}
                </p>

                <div
                  className={`mt-5 pt-5 border-t ${
                    isFeatured ? "border-white/15" : "border-border-secondary"
                  }`}
                >
                  <p
                    className={`text-caption font-bold mb-3 ${
                      isFeatured ? "text-cambridge" : "text-text-tertiary"
                    }`}
                  >
                    Best for
                  </p>
                  <p
                    className={`text-body-sm leading-relaxed ${
                      isFeatured ? "text-white/70" : "text-text-secondary"
                    }`}
                  >
                    {tier.who}
                  </p>
                </div>

                {tier.addedBenefits && (
                  <div
                    className={`mt-5 pt-5 border-t ${
                      isFeatured ? "border-white/15" : "border-border-secondary"
                    }`}
                  >
                    <p
                      className={`text-caption font-bold mb-3 ${
                        isFeatured ? "text-cambridge" : "text-cambridge"
                      }`}
                    >
                      {tier.key === "plus"
                        ? "Everything in Essentials, plus"
                        : "Everything in Visibility Plus, plus"}
                    </p>
                    <ul className="space-y-2">
                      {tier.addedBenefits.map((item) => (
                        <li
                          key={item}
                          className={`flex items-start gap-2 text-body-sm ${
                            isFeatured ? "text-white/90" : "text-text-primary"
                          }`}
                        >
                          <svg
                            className={`w-4 h-4 shrink-0 mt-0.5 ${
                              isFeatured ? "text-cambridge" : "text-cambridge"
                            }`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {tier.key === "essentials" && (
                  <div className="mt-5 pt-5 border-t border-border-secondary">
                    <p className="text-caption font-bold text-cambridge mb-3">
                      What&apos;s included
                    </p>
                    <ul className="space-y-2">
                      {tier.benefits.slice(0, 8).map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2 text-body-sm text-text-secondary"
                        >
                          <svg
                            className="w-4 h-4 shrink-0 mt-0.5 text-cambridge"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                    <p className="text-caption text-text-tertiary mt-3">
                      + {tier.benefits.length - 8} more benefits below
                    </p>
                  </div>
                )}

                <div className="mt-auto pt-6">
                  <Link
                    href="/membership/join"
                    className={`
                      block w-full text-center py-3 px-6 font-bold text-body-sm
                      rounded-[var(--radius-md)] transition-colors
                      ${isFeatured
                        ? "bg-accent hover:bg-accent-hover text-white"
                        : "border border-border-primary hover:border-text-tertiary text-text-primary"
                      }
                    `}
                  >
                    {tier.cta} →
                  </Link>
                </div>
              </div>
            );
          })}
        </section>

        {/* Full benefits table — Essentials breakdown */}
        <section className="mt-24">
          <div className="max-w-2xl">
            <p className="text-overline text-cambridge mb-3">What&apos;s Inside</p>
            <h2 className="text-h2">Every Essentials benefit, in detail</h2>
            <p className="text-body text-text-secondary mt-4 leading-relaxed">
              Every tier starts with these 17 benefits. Visibility Plus and
              Community Investor build on top — they don&apos;t replace them.
            </p>
          </div>

          <div className="mt-10 grid sm:grid-cols-2 gap-x-8 gap-y-3">
            {essentialsBenefits.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 py-2 border-b border-border-secondary"
              >
                <svg
                  className="w-5 h-5 shrink-0 mt-0.5 text-cambridge"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span className="text-body-sm text-text-primary">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-24">
          <div className="max-w-2xl">
            <p className="text-overline text-cambridge mb-3">
              Frequently Asked
            </p>
            <h2 className="text-h2">Questions before you join</h2>
          </div>
          <div className="mt-10 grid md:grid-cols-2 gap-x-12 gap-y-8 max-w-5xl">
            {faqs.map((faq) => (
              <div key={faq.q}>
                <h3 className="text-h4">{faq.q}</h3>
                <p className="text-body-sm text-text-secondary mt-2 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Safety Council note */}
        <section className="mt-16 p-6 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
          <p className="text-body-sm text-text-secondary leading-relaxed">
            <span className="font-bold text-text-primary">
              Safety Council note:
            </span>{" "}
            Medina County Safety Council participation is available to chamber
            members at no additional charge. If your business wants BWC rebate
            eligibility, chamber membership is the most cost-effective path.{" "}
            <Link
              href="/programs/safety-council"
              className="text-cambridge hover:text-cambridge/80 transition-colors"
            >
              Learn about the Safety Council →
            </Link>
          </p>
        </section>

        {/* Bottom CTA */}
        <section className="mt-20 p-10 lg:p-16 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-h2">Questions before you commit?</h2>
              <p className="text-body-lg text-text-secondary mt-4">
                Stephanie will walk you through what&apos;s included, which
                tier fits your goals, and what similar businesses in your
                industry typically get out of membership. No pressure — just a
                conversation.
              </p>
            </div>
            <div className="space-y-4">
              <a
                href="mailto:stephanie@medinaohchamber.com"
                className="
                  block w-full text-center py-4 px-6
                  bg-accent hover:bg-accent-hover
                  text-white font-bold text-body
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                Email Stephanie →
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
                Call (330) 723-8773
              </a>
              <Link
                href="/membership/join"
                className="
                  block w-full text-center py-3 px-6
                  text-cambridge font-bold text-body-sm
                  transition-colors hover:text-cambridge/80
                "
              >
                Apply Online
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
