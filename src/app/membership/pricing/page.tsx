import type { Metadata } from "next";
import Link from "next/link";

import { safeJsonLd } from "@/lib/json-ld";
import { getCmsPricing, DEFAULT_PRICING } from "@/lib/cms-store";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const pricing = (await getCmsPricing()) ?? DEFAULT_PRICING;
  const [e, p, i] = pricing.tiers;
  const desc = `Three Greater Medina Chamber of Commerce membership tiers: ${e.name} ($${e.price}/year), ${p.name} ($${p.price}/year), and ${i.name} ($${i.price}/year). Choose the level that fits your goals.`;
  return {
    title: "Membership Pricing",
    description: desc,
    openGraph: {
      title: "Membership Pricing — Greater Medina Chamber of Commerce",
      description: `Three tiers: ${e.name} ($${e.price}), ${p.name} ($${p.price}), ${i.name} ($${i.price}). Pick the level that fits your business.`,
    },
    alternates: { canonical: "/membership/pricing" },
  };
}

export default async function PricingPage() {
  const pricing = (await getCmsPricing()) ?? DEFAULT_PRICING;
  const tiers = pricing.tiers;
  const faqs = pricing.faqs;
  const essentialsTier = tiers.find((t) => t.key === "essentials");
  const essentialsBenefits = essentialsTier?.benefits ?? [];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
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
            const isFeatured = !!tier.featured;
            return (
              <div
                key={tier.key}
                className={`
                  relative flex flex-col p-8 rounded-[var(--radius-lg)]
                  ${isFeatured
                    ? "bg-oxford [[data-theme=dark]_&]:bg-bg-tertiary text-white border-2 border-cambridge lg:scale-105 lg:shadow-[0_12px_40px_rgba(12,27,51,0.15)]"
                    : "bg-bg-secondary border border-border-secondary"
                  }
                `}
              >
                {isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald text-white text-caption font-bold uppercase tracking-wider rounded-full">
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
                      {tier.key === "investor"
                        ? "Everything in Visibility Plus, plus"
                        : "Everything in Essentials, plus"}
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

                {!tier.addedBenefits && (
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
              className="text-cambridge hover:text-cambridge/80 underline underline-offset-2 transition-colors"
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
