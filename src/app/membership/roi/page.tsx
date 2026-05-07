import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { RoiCalculator } from "./RoiCalculator";

export const metadata: Metadata = {
  title: "Membership ROI Calculator",
  description:
    "Calculate what not being a Greater Medina Chamber member is actually costing your business — BWC Safety Council savings, energy rebates, and more.",
  openGraph: {
    title: "What's Non-Membership Costing You? | Greater Medina Chamber",
    description:
      "Enter your BWC premium and energy spend to see your estimated annual savings from chamber membership. Most businesses break even in under 30 days.",
  },
  alternates: { canonical: "/membership/roi" },
};

export default function RoiPage() {
  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pt-f144 pb-f89">
        <div className="max-w-3xl">
          <p className="text-overline text-cambridge mb-f8">ROI Calculator</p>
          <h1 className="text-display">
            <span className="block">What&apos;s non-membership</span>
            <span className="block text-accent">costing you?</span>
          </h1>
          <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl leading-relaxed">
            Most Medina businesses recoup their membership dues in the first month
            — just through BWC Safety Council savings alone. See where you stand.
          </p>
          <div className="mt-f21 flex flex-wrap gap-f13 text-body-sm text-text-tertiary">
            <span className="inline-flex items-center gap-f5">
              <span className="w-1.5 h-1.5 rounded-full bg-cambridge inline-block" />
              Conservative estimates
            </span>
            <span className="inline-flex items-center gap-f5">
              <span className="w-1.5 h-1.5 rounded-full bg-cambridge inline-block" />
              Verified program rates
            </span>
            <span className="inline-flex items-center gap-f5">
              <span className="w-1.5 h-1.5 rounded-full bg-cambridge inline-block" />
              No email required
            </span>
          </div>
        </div>
      </section>

      {/* Calculator */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pb-f89 lg:pb-f144">
        <FadeIn>
          <RoiCalculator />
        </FadeIn>
      </section>

      {/* Bottom context */}
      <section className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="grid md:grid-cols-3 gap-f34">
              <div>
                <p className="text-h3 text-cambridge mb-f8">$100/year</p>
                <p className="text-body font-semibold text-text-primary mb-f5">Safety Council fee for non-members</p>
                <p className="text-body-sm text-text-secondary leading-relaxed">
                  Chamber members participate at no cost. That&apos;s $100
                  you&apos;re paying right now if you attend as a non-member.
                </p>
              </div>
              <div>
                <p className="text-h3 text-cambridge mb-f8">18%</p>
                <p className="text-body font-semibold text-text-primary mb-f5">Typical BWC group experience rating savings</p>
                <p className="text-body-sm text-text-secondary leading-relaxed">
                  Ohio employers who meet Safety Council attendance requirements
                  qualify for the Ohio BWC group rebate program.
                </p>
              </div>
              <div>
                <p className="text-h3 text-cambridge mb-f8">511</p>
                <p className="text-body font-semibold text-text-primary mb-f5">Members currently accessing these programs</p>
                <p className="text-body-sm text-text-secondary leading-relaxed">
                  Every one of them made the same calculation you&apos;re running
                  right now — and decided the math worked.
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Still have questions */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          <div className="max-w-2xl">
            <h2 className="text-h2">Still not sure which tier fits?</h2>
            <p className="text-body-lg text-text-secondary mt-f13 leading-relaxed">
              Stephanie will walk you through what similar businesses in your
              industry typically get out of membership, and which programs are
              most relevant to your situation. No pitch — just a real conversation.
            </p>
            <div className="mt-f21 flex flex-wrap gap-f13">
              <Link
                href="/membership/pricing"
                className="inline-flex items-center px-f21 py-f13 bg-accent hover:bg-accent-hover text-white font-bold text-body rounded-[var(--radius-md)] transition-colors"
              >
                Compare all tiers →
              </Link>
              <a
                href="mailto:stephanie@medinaohchamber.com"
                className="inline-flex items-center px-f21 py-f13 border border-border-primary hover:border-text-tertiary text-text-primary font-bold text-body-sm rounded-[var(--radius-md)] transition-colors"
              >
                Email Stephanie
              </a>
            </div>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
