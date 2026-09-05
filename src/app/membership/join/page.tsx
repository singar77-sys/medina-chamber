import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink, ButtonA } from "@/components/ui/Button";
import { FadeIn } from "@/components/FadeIn";
import { VesicaPiscisWatermark } from "@/components/effects/VesicaPiscisWatermark";
import { AutoplayVideo } from "@/components/AutoplayVideo";
import { growthZone } from "@/lib/navigation";
import { safeJsonLd } from "@/lib/json-ld";
import {
  BENEFITS_VIDEO,
  BENEFITS_VIDEO_POSTER,
  benefitsWheelVideoJsonLd,
} from "@/lib/benefits-wheel-video";
import { OG_IMAGE } from "@/lib/og";

export const metadata: Metadata = {
  title: "Join the Greater Medina Chamber of Commerce",
  description:
    "Join the Greater Medina Chamber of Commerce. Membership benefits include networking events, business directory listing, advocacy, savings programs, and community visibility.",
  openGraph: {
    images: OG_IMAGE,
    title: "Join | Greater Medina Chamber of Commerce",
    description:
      "Networking, directory listing, advocacy, savings programs, and community visibility for Medina County businesses.",
  },
  alternates: { canonical: "/membership/join" },
};

// Each card links to the page where that benefit actually lives (staff
// request — mirrors the benefits page pattern).
const benefits = [
  {
    title: "Business Directory Listing",
    description:
      "Your business appears in the Chamber's searchable member directory, one of the first places customers look for local services.",
    href: "/membership/directory",
  },
  {
    title: "Networking Events",
    description:
      "Monthly mixers, Chamber Chats, and after-hours events where you meet the business owners who actually run this town.",
    href: "/events",
  },
  {
    title: "Advocacy & Voice",
    description:
      "The Chamber represents your interests at the local, state, and federal level. Your membership funds the advocacy that protects your business.",
    href: "/about/advocacy",
  },
  {
    title: "Savings Programs",
    description:
      "Member-exclusive programs for group health insurance, workers' compensation, energy, HR services, and the Medina Community Recreation Center.",
    href: "/membership/savings",
  },
  {
    title: "Visibility & Credibility",
    description:
      "The Chamber seal means something in Medina County. Customers trust Chamber members. It's an earned reputation since 1938.",
    href: "/membership/benefits",
  },
  {
    title: "Ribbon Cuttings & Milestones",
    description:
      "New location? Anniversary? Expansion? The Chamber shows up with ambassadors, photos, and social media coverage.",
    href: "/events/sponsorships",
  },
];

const faqs = [
  {
    q: "How much does membership cost?",
    a: "Three flat-rate tiers based on the visibility and access you want: Business Essentials, Visibility Plus, and Community Investor. See our Pricing & Tiers page for current rates. Most new members start with Essentials and upgrade as their visibility and advocacy needs grow.",
  },
  {
    q: "What if I'm a sole proprietor or work from home?",
    a: "Absolutely welcome. A significant portion of our members are solo operators, freelancers, and home-based businesses. The networking is actually more valuable when you don't have a storefront.",
  },
  {
    q: "Can I attend events before joining?",
    a: "Yes. Most events are open to prospective members. Come to a Chamber Chat or mixer first, see if it's your kind of room.",
  },
  {
    q: "How do I get listed in the member directory?",
    a: "Automatically. When your membership is active, your business appears in the online directory with your name, address, website, categories, and description.",
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

export default function JoinPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
        {/* Ghosted forest-ledges backdrop (replaced the covered bridge —
            Mark 2026-08-26, first drop from the image-prompt sheet) */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/medina-county-forest-ledges.webp"
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
          <p className="text-overline text-cambridge mb-f8">Join</p>
          <h1 className="text-display">
            <span className="block">Grow With</span>
            <span className="block text-accent">Medina</span>
          </h1>
          <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
            The Greater Medina Chamber of Commerce has been connecting
            businesses since 1938. Membership means your business has a seat
            at the table, networking, advocacy, visibility, and the
            relationships that actually drive growth in a county this size.
          </p>

          <div className="mt-f34 flex flex-wrap gap-f13">
            <ButtonA href="#apply" size="lg">
              Start Your Application →
            </ButtonA>
            <ButtonLink href="/membership/pricing" variant="emerald" size="lg">
              View Pricing
            </ButtonLink>
          </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="relative overflow-hidden rule-top mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <VesicaPiscisWatermark className="tp-vesica" />
        <FadeIn>
          <div className="mb-f21">
            <p className="text-overline text-cambridge mb-f8">Why Join</p>
            <h2 className="text-h2">What Membership Gets You</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-f21">
            {benefits.map((b) => (
              <Link
                key={b.title}
                href={b.href}
                className="group block p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] hover:border-cambridge/40 hover:shadow-cambridge transition-shadow duration-300"
              >
                <h3 className="text-h4 mb-f8 group-hover:text-cambridge transition-colors">
                  {b.title}
                </h3>
                <p className="text-body-sm text-text-secondary leading-relaxed">
                  {b.description}
                </p>
                <p className="text-caption font-bold text-cambridge mt-f13">
                  Explore →
                </p>
              </Link>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* The five pillars — ambient benefits-wheel loop (same module as the
          directory band, join-page verbiage). Muted + playsInline so autoplay
          is allowed everywhere; poster keeps the LCP honest. */}
      <section className="rule-top relative overflow-hidden py-f55 lg:py-f89">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(benefitsWheelVideoJsonLd) }}
        />
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="grid lg:grid-cols-2 gap-f34 items-center">
              <div>
                <p className="text-overline text-cambridge mb-f8">The Five Pillars</p>
                <h2 className="text-h2">One membership, working five ways.</h2>
                <p className="text-body-lg text-text-secondary mt-f13">
                  Everything above traces back to five pillars — connections,
                  visibility, advocacy, savings, and education — turning from
                  the day you join.
                </p>
                <Link
                  href="/membership/benefits"
                  className="inline-block mt-f21 text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
                >
                  Explore every benefit →
                </Link>
              </div>
              <AutoplayVideo
                className="w-full aspect-video rounded-[var(--radius-lg)] border border-border-secondary bg-bg-secondary object-cover"
                src={BENEFITS_VIDEO}
                poster={BENEFITS_VIDEO_POSTER}
                label="Animated wheel of the five Greater Medina Chamber membership benefits: connections, visibility, advocacy, savings, and education"
              />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative overflow-hidden bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        {/* Ghosted boardroom-discussion backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/backgrounds/boardroom-discussion.webp"
            alt=""
            fill
            className="object-cover opacity-[0.10]"
            sizes="100vw"
            quality={60}
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="mb-f21 max-w-3xl">
              <p className="text-overline text-cambridge mb-f8">
                Common Questions
              </p>
              <h2 className="text-h2">Before You Apply</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-f21 max-w-5xl">
              {faqs.map((faq) => (
                <div
                  key={faq.q}
                  className="p-f21 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)]"
                >
                  <h3 className="text-h4">{faq.q}</h3>
                  <p className="text-body-sm text-text-secondary mt-f13 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Application form */}
      <section
        id="apply"
        className="rule-top mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89 scroll-mt-24"
      >
        <FadeIn>
          <div className="max-w-3xl">
            <p className="text-overline text-cambridge mb-f8">Join</p>
            <h2 className="text-h2 mb-f21">Become a Member</h2>
            {/* Applications are handled in GrowthZone (the live system of record).
                The internal Stripe join flow stays dormant until the cutover. */}
            <ButtonA
              href={growthZone.joinApplication}
              target="_blank"
              rel="noopener noreferrer"
              variant="primary"
              size="lg"
            >
              Apply for Membership →
            </ButtonA>
            <p className="text-body-sm text-text-tertiary mt-f13">
              You&apos;ll complete your application on the chamber&apos;s secure
              membership portal.
            </p>
          </div>

          <div className="mt-f34">
            <Link
              href="/membership"
              className="text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
            >
              ← Back to Membership
            </Link>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
