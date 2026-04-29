import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { safeJsonLd } from "@/lib/json-ld";
import { getCmsPricing, DEFAULT_PRICING } from "@/lib/cms-store";

/**
 * Membership Pricing — φ spatial system applied throughout.
 *
 * HERO    pt-f144 pb-f89
 * FEATURE py-f89 lg:py-f144 — 3 tier cards (open white, lg:grid-cols-3 gap-f21)
 * BAND    py-f55 lg:py-f89  — Essentials benefits table (bg-secondary)
 * FEATURE py-f89 lg:py-f144 — FAQ 2-col grid (open white)
 * CLOSER  py-f55 lg:py-f89  — Safety Council note + bottom CTA card
 */

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

      {/* ─── HERO ─────────────────────────────────────────────── */}
      {/* pt-f144 pb-f89 (144/89 = φ) — HERO tier */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pt-f144 pb-f89">
        <div className="max-w-3xl">
          {/* mb-f8 (8px) — overline→heading */}
          <p className="text-overline text-cambridge mb-f8">Membership</p>
          <h1 className="text-display">
            Three Tiers.
            <br />
            <span className="text-accent">One Community.</span>
          </h1>
          {/* mt-f13 (13px) — heading→body */}
          <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
            Pick the tier that fits your goals — from first-year essentials to
            investor-level access and recognition. Every membership includes
            the full Chamber network and savings programs.
          </p>
          {/* mt-f21 — body→CTAs; gap-f13 — between buttons */}
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
              href="mailto:stephanie@medinaohchamber.com"
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
      </section>

      {/* ─── FEATURE — Tier cards ─────────────────────────────── */}
      {/* py-f89/f144 — FEATURE tier, open white */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        {/* gap-f21 — between tier cards */}
        <div className="grid lg:grid-cols-3 gap-f21">
          {tiers.map((tier, i) => {
            const isFeatured = !!tier.featured;
            return (
              <FadeIn key={tier.key} delay={i * 80}>
                <div
                  className={`
                    relative flex flex-col p-f21 rounded-[var(--radius-lg)] h-full
                    ${isFeatured
                      ? "bg-oxford [[data-theme=dark]_&]:bg-bg-tertiary text-white border-2 border-cambridge lg:scale-105 lg:shadow-[0_12px_40px_rgba(12,27,51,0.15)]"
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
                  {/* mt-f8 — name→price gap */}
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
                  {/* mt-f13 — price→tagline gap */}
                  <p
                    className={`text-body-sm mt-f13 leading-relaxed ${
                      isFeatured ? "text-white/80" : "text-text-secondary"
                    }`}
                  >
                    {tier.tagline}
                  </p>

                  {/* mt-f13 pt-f13 — divider section */}
                  <div
                    className={`mt-f13 pt-f13 border-t ${
                      isFeatured ? "border-white/15" : "border-border-secondary"
                    }`}
                  >
                    {/* mb-f8 — label→body */}
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
                      {/* mb-f8 — label→list */}
                      <p className="text-caption font-bold text-cambridge mb-f8">
                        {tier.key === "investor"
                          ? "Everything in Visibility Plus, plus"
                          : "Everything in Essentials, plus"}
                      </p>
                      {/* space-y-f8 — between benefit rows */}
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
                      {/* mb-f8 — label→list */}
                      <p className="text-caption font-bold text-cambridge mb-f8">
                        What&apos;s included
                      </p>
                      {/* space-y-f8 — between benefit rows */}
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
                      {/* mt-f8 — list→overflow note */}
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

      {/* ─── BAND — Essentials benefits table ─────────────────── */}
      {/* py-f55/f89 — BAND tier, bg-secondary + border-y */}
      <section className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="max-w-2xl">
              {/* mb-f8 — overline→heading */}
              <p className="text-overline text-cambridge mb-f8">What&apos;s Inside</p>
              <h2 className="text-h2">Every Essentials benefit, in detail</h2>
              {/* mt-f13 — heading→body */}
              <p className="text-body text-text-secondary mt-f13 leading-relaxed">
                Every tier starts with these {essentialsBenefits.length} benefits. Visibility Plus and
                Community Investor build on top — they don&apos;t replace them.
              </p>
            </div>

            {/* mt-f21 — header→grid gap; gap-x-f21 gap-y-f8 — table row gaps */}
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

      {/* ─── FEATURE — FAQ ────────────────────────────────────── */}
      {/* py-f89/f144 — FEATURE tier, open white */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          <div className="max-w-2xl">
            {/* mb-f8 — overline→heading */}
            <p className="text-overline text-cambridge mb-f8">Frequently Asked</p>
            <h2 className="text-h2">Questions before you join</h2>
          </div>
          {/* mt-f21 — header→grid gap; gap-x-f34 gap-y-f21 — FAQ grid gaps */}
          <div className="mt-f21 grid md:grid-cols-2 gap-x-f34 gap-y-f21 max-w-5xl">
            {faqs.map((faq) => (
              <div key={faq.q}>
                <h3 className="text-h4">{faq.q}</h3>
                {/* mt-f8 — question→answer gap */}
                <p className="text-body-sm text-text-secondary mt-f8 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ─── CLOSER — Safety note + bottom CTA ───────────────── */}
      {/* py-f55/f89 — CLOSER taper */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          {/* Safety Council note — p-f21 */}
          <div className="p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <p className="text-body-sm text-text-secondary leading-relaxed">
              <span className="font-bold text-text-primary">Safety Council note: </span>
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
          </div>

          {/* mt-f21 — note→CTA card gap; p-f34/f55 card padding */}
          <div className="mt-f21 p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            {/* gap-f34 — 2-col gap */}
            <div className="grid lg:grid-cols-2 gap-f34 items-center">
              <div>
                <h2 className="text-h2">Questions before you commit?</h2>
                {/* mt-f13 — heading→body */}
                <p className="text-body-lg text-text-secondary mt-f13">
                  Stephanie will walk you through what&apos;s included, which
                  tier fits your goals, and what similar businesses in your
                  industry typically get out of membership. No pressure — just a
                  conversation.
                </p>
              </div>
              {/* space-y-f13 — button stack gap */}
              <div className="space-y-f13">
                <a
                  href="mailto:stephanie@medinaohchamber.com"
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
