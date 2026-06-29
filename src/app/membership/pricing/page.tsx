import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { safeJsonLd } from "@/lib/json-ld";
import { getActiveTiers } from "@/lib/membership-tiers";
import { stephanie } from "@/data/staff";
import { mailto } from "@/lib/format";

const PRICING_FAQS = [
  {
    q: "Do I qualify for group health insurance?",
    a: "Available for employers with 2–49 employees. Details provided during onboarding.",
  },
  {
    q: "What's included in member spotlights?",
    a: "Visibility Plus spotlights run on social and email. Community Investor spotlights run on social, email, and the chamber website.",
  },
  {
    q: "Do Investors get ongoing event perks?",
    a: "Yes, two free luncheon tickets every month plus recognition at all events.",
  },
  {
    q: "What's the Certificate of Origin benefit?",
    a: "Free for non-freight forwarders on Visibility Plus and Community Investor tiers.",
  },
  {
    q: "How do I upgrade later?",
    a: "Contact Stephanie Mueller at any time. Upgrades are prorated based on where you are in your membership year.",
  },
] as const;

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const tiers = await getActiveTiers();
  const [e, p, i] = tiers;
  const desc = e && p && i
    ? `Three Greater Medina Chamber of Commerce membership tiers: ${e.name} ($${e.price}/year), ${p.name} ($${p.price}/year), and ${i.name} ($${i.price}/year). Choose the level that fits your goals.`
    : "Greater Medina Chamber of Commerce membership tiers. Choose the level that fits your goals.";
  return {
    title: "Membership Pricing",
    description: desc,
    openGraph: {
      title: "Membership Pricing | Greater Medina Chamber of Commerce",
      description: e && p && i
        ? `Three tiers: ${e.name} ($${e.price}), ${p.name} ($${p.price}), ${i.name} ($${i.price}). Pick the level that fits your business.`
        : desc,
    },
    alternates: { canonical: "/membership/pricing" },
  };
}

export default async function PricingPage() {
  const tiers = await getActiveTiers();
  const faqs = PRICING_FAQS;
  const essentialsTier = tiers.find((t) => t.key === "standard");
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

      {/* Hero */}
      <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
        {/* Ghosted downtown Medina backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/downtown-medina.jpg"
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
            <span className="block">Three Tiers.</span>
            <span className="block text-accent">One Community.</span>
          </h1>
          <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
            Pick the tier that fits your goals, from first-year essentials to
            investor-level access and recognition. Every membership includes
            the full Chamber network and savings programs.
          </p>
          <div className="mt-f21 flex flex-wrap gap-f13">
            <Link
              href="/membership/join"
              className="
                inline-flex items-center px-f21 py-f13
                bg-accent hover:bg-accent-hover
                text-white font-bold text-body
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Apply for Membership →
            </Link>
            <a
              href={mailto(stephanie.email)}
              className="
                inline-flex items-center px-f21 py-f13
                border border-border-primary hover:border-text-tertiary
                text-text-primary font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              Talk to Stephanie
            </a>
          </div>
          </div>
        </div>
      </section>

      {/* Tier cards */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <div className="grid lg:grid-cols-3 gap-f21">
          {tiers.map((tier, i) => {
            const isFeatured = !!tier.featured;
            return (
              <FadeIn key={tier.key} delay={i * 80}>
                <div
                  className={`
                    relative flex flex-col p-f21 rounded-[var(--radius-lg)] h-full
                    ${isFeatured
                      ? "bg-oxford text-white border-2 border-cambridge lg:scale-105 lg:shadow-[0_12px_40px_rgba(12,27,51,0.15)]"
                      : "bg-bg-secondary border border-border-secondary"
                    }
                  `}
                >
                  {isFeatured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-f5 px-f8 py-f3 bg-emerald text-white text-caption font-bold uppercase tracking-wider rounded-full">
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
                  <div className="mt-f8 flex items-baseline gap-f3">
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
                    className={`text-body-sm mt-f13 leading-relaxed ${
                      isFeatured ? "text-white/80" : "text-text-secondary"
                    }`}
                  >
                    {tier.tagline}
                  </p>

                  <div
                    className={`mt-f13 pt-f13 border-t ${
                      isFeatured ? "border-white/15" : "border-border-secondary"
                    }`}
                  >
                    <p
                      className={`text-caption font-bold mb-f8 ${
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
                      className={`mt-f13 pt-f13 border-t ${
                        isFeatured ? "border-white/15" : "border-border-secondary"
                      }`}
                    >
                      <p className="text-caption font-bold text-cambridge mb-f8">
                        {tier.key === "community_investor"
                          ? "Everything in Visibility Plus, plus"
                          : "Everything in Essentials, plus"}
                      </p>
                      <ul className="space-y-f8">
                        {tier.addedBenefits.map((item) => (
                          <li
                            key={item}
                            className={`flex items-start gap-f8 text-body-sm ${
                              isFeatured ? "text-white/90" : "text-text-primary"
                            }`}
                          >
                            <svg
                              className="w-4 h-4 shrink-0 mt-f3 text-cambridge"
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
                    <div className="mt-f13 pt-f13 border-t border-border-secondary">
                      <p className="text-caption font-bold text-cambridge mb-f8">
                        What&apos;s included
                      </p>
                      <ul className="space-y-f8">
                        {tier.benefits.slice(0, 8).map((item) => (
                          <li
                            key={item}
                            className="flex items-start gap-f8 text-body-sm text-text-secondary"
                          >
                            <svg
                              className="w-4 h-4 shrink-0 mt-f3 text-cambridge"
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
                      <p className="text-caption text-text-tertiary mt-f8">
                        + {tier.benefits.length - 8} more benefits below
                      </p>
                    </div>
                  )}

                  {/* mt-auto pt-f21 — CTA pinned to bottom */}
                  <div className="mt-auto pt-f21">
                    <Link
                      href="/membership/join"
                      className={`
                        block w-full text-center py-f13 px-f21 font-bold text-body-sm
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
              </FadeIn>
            );
          })}
        </div>
      </section>

      {/* Essentials benefits table */}
      <section className="relative overflow-hidden bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        {/* Ghosted networking backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/networking.webp"
            alt=""
            fill
            className="object-cover opacity-[0.10]"
            sizes="100vw"
            quality={60}
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="max-w-2xl">
              <p className="text-overline text-cambridge mb-f8">What&apos;s Inside</p>
              <h2 className="text-h2">Every Essentials benefit, in detail</h2>
              <p className="text-body text-text-secondary mt-f13 leading-relaxed">
                Every tier starts with these {essentialsBenefits.length} benefits. Visibility Plus and
                Community Investor build on top, they don&apos;t replace them.
              </p>
            </div>

            <div className="mt-f21 grid sm:grid-cols-2 gap-x-f21 gap-y-f8">
              {essentialsBenefits.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-f8 py-f8 border-b border-border-secondary"
                >
                  <svg
                    className="w-5 h-5 shrink-0 mt-f3 text-cambridge"
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
          </FadeIn>
        </div>
      </section>

      {/* Faq */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          <div className="max-w-2xl">
            <p className="text-overline text-cambridge mb-f8">Frequently Asked</p>
            <h2 className="text-h2">Questions before you join</h2>
          </div>
          <div className="mt-f21 grid md:grid-cols-2 gap-x-f34 gap-y-f21 max-w-5xl">
            {faqs.map((faq) => (
              <div key={faq.q}>
                <h3 className="text-h4">{faq.q}</h3>
                <p className="text-body-sm text-text-secondary mt-f8 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* Bottom CTA */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          <div className="p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <div className="grid lg:grid-cols-2 gap-f34 items-center">
              <div>
                <h2 className="text-h2">Questions before you commit?</h2>
                <p className="text-body-lg text-text-secondary mt-f13">
                  Stephanie will walk you through what&apos;s included, which
                  tier fits your goals, and what similar businesses in your
                  industry typically get out of membership. No pressure, just a
                  conversation.
                </p>
              </div>
              <div className="space-y-f13">
                <a
                  href={mailto(stephanie.email)}
                  className="
                    block w-full text-center py-f13 px-f21
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
                    block w-full text-center py-f13 px-f21
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
                    block w-full text-center py-f13 px-f21
                    text-cambridge font-bold text-body-sm
                    transition-colors hover:text-cambridge/80
                  "
                >
                  Apply Online
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
