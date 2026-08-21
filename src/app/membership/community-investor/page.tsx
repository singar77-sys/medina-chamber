import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { safeJsonLd } from "@/lib/json-ld";
import { getCmsPricing, DEFAULT_PRICING } from "@/lib/cms-store";
import { stephanie, jaclyn } from "@/data/staff";
import { mailto } from "@/lib/format";
import { CommunityInvestors } from "@/components/CommunityInvestors";

export const metadata: Metadata = {
  title: "Community Investor Membership",
  description:
    "The Greater Medina Chamber's top-tier membership. Community Investors shape local policy, receive premier visibility, and sit at the table where Medina County's business direction is set.",
  openGraph: {
    title: "Community Investor | Greater Medina Chamber of Commerce",
    description:
      "Chamber membership at the leadership level. $1,145/year — direct access to legislators, investor spotlights, VIP luncheons, and a seat at the policy table.",
  },
  alternates: { canonical: "/membership/community-investor" },
};

export const dynamic = "force-dynamic";

const ciExclusives = [
  {
    title: "Investor Member Spotlight",
    where: "Social media, email newsletter, and chamber website",
    description:
      "Your business is featured across all three of the chamber's primary channels — not just one. Social posts, email placement, and a dedicated website spotlight that stays live. This is the chamber actively promoting your brand to its full member network and the broader Medina County audience.",
  },
  {
    title: "Complimentary Member Luncheon Tickets",
    where: "Member Luncheons",
    description:
      "Complimentary tickets to chamber member luncheons — events that Business Essentials and Visibility Plus members pay to attend. Over a membership year, that's real savings and consistent face time with the chamber's most active and engaged members.",
  },
  {
    title: "Anytime Access to Member Mailing List",
    where: "Full member directory",
    description:
      "Community Investors can access the chamber's full member mailing list at any time — not just on request cycles. Direct outreach to Medina County businesses when you need it, for partnerships, promotions, or vendor sourcing.",
  },
  {
    title: "Exclusive Special Events Invitations",
    where: "Investor-only events",
    description:
      "Invitations to events and gatherings that aren't on the public calendar. This is where chamber leadership connects with legislators, regional business leaders, and policy stakeholders in settings that aren't open to the general membership.",
  },
];

const whoItsFor = [
  "CEOs and founders of mid-to-large Medina County employers",
  "Businesses whose success is tied to local policy — developers, manufacturers, financial services, healthcare",
  "Organizations that want their name attached to the chamber's public work",
  "Leaders who want a direct voice in which policy issues the chamber champions each year",
  "Multi-location operators building regional presence",
  "Businesses that send multiple people to chamber events each month",
];

export default async function CommunityInvestorPage() {
  const tiers = ((await getCmsPricing()) ?? DEFAULT_PRICING).tiers;
  const ciTier = tiers.find((t) => t.key === "investor");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Community Investor Membership",
    description:
      "Greater Medina Chamber of Commerce top-tier membership with investor spotlights, complimentary luncheon tickets, anytime mailing list access, and exclusive event invitations.",
    url: "https://medinachamber.com/membership/community-investor",
    offers: {
      "@type": "Offer",
      price: ciTier?.price ?? 1145,
      priceCurrency: "USD",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: ciTier?.price ?? 1145,
        priceCurrency: "USD",
        unitText: "year",
      },
    },
    brand: {
      "@type": "Organization",
      name: "Greater Medina Chamber of Commerce",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
        {/* Ghosted Public Square gazebo backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/membership/medina-chamber-community-investor-hero.webp"
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
            <p className="text-overline text-cambridge mb-f8">Membership · Top Tier</p>
            <h1 className="text-display">
              <span className="block">Community</span>
              <span className="block text-accent">Investor</span>
            </h1>
            <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
              This is where chamber leadership lives. The CEOs, founders, and
              owners who don&apos;t just join the chamber, but shape Medina
              County&apos;s business direction.
            </p>
            <div className="mt-f21 flex flex-wrap items-center gap-f13">
              <div className="text-text-secondary text-body-sm font-mono">
                $1,145 <span className="text-text-tertiary">/year</span>
              </div>
              <div className="w-px h-4 bg-border-primary" />
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
                Apply for Community Investor →
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

      {/* What sets CI apart */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pt-f89 pb-f55 lg:pt-f144 lg:pb-f89">
        <FadeIn>
          <div className="max-w-2xl mb-f34">
            <p className="text-overline text-cambridge mb-f8">At the leadership level</p>
            <h2 className="text-h2">The benefits of investing deeper</h2>
            <p className="text-body text-text-secondary mt-f13 leading-relaxed">
              Community Investor builds on everything in Business Essentials and
              Visibility Plus, then adds four ways to invest more deeply in
              Medina County&apos;s business community.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-f21">
            {ciExclusives.map((item, i) => (
              <FadeIn key={item.title} delay={i * 70}>
                <div className="flex flex-col p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] h-full">
                  <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-f8">
                    {item.where}
                  </p>
                  <h3 className="text-h4 mb-f13">{item.title}</h3>
                  <p className="text-body-sm text-text-secondary leading-relaxed flex-1">
                    {item.description}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* Who it's for */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          <div className="max-w-2xl">
            <p className="text-overline text-cambridge mb-f8">Is this the right fit?</p>
            <h2 className="text-h2">Who belongs at this level</h2>
            <p className="text-body text-text-secondary mt-f13 leading-relaxed">
              Community Investor isn&apos;t the right tier for every business.
              It&apos;s designed for leaders who want their name attached to
              the chamber&apos;s public work — and who can put the visibility
              and access to use.
            </p>
            <ul className="mt-f21 space-y-f13">
              {whoItsFor.map((item) => (
                <li key={item} className="flex items-start gap-f13 text-body-sm text-text-primary">
                  <span className="mt-[0.35em] w-1.5 h-1.5 rounded-full bg-cambridge shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-f21 text-body-sm text-text-secondary leading-relaxed">
              Not sure it&apos;s the right fit yet? That&apos;s exactly what a
              conversation is for. Wherever you&apos;re starting from, there&apos;s
              a place for you at the chamber — reach out and we&apos;ll help you
              find where you belong.
            </p>
          </div>
        </FadeIn>
      </section>

      {/* Community Investors — the full logo wall, mirroring the home page */}
      <CommunityInvestors />

      {/* CTA */}
      <section className="bg-oxford border-t border-white/10 py-f55 lg:py-f89">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="grid lg:grid-cols-2 gap-f34 items-center">
              <div>
                <p className="text-overline text-cambridge mb-f8">Ready to lead</p>
                <h2 className="text-h2 text-white">Join as a Community Investor</h2>
                <p className="text-body-lg text-white/70 mt-f13 leading-relaxed">
                  $1,145/year. Questions about fit or what to expect?
                  Stephanie or Jaclyn can walk you through it — no pressure,
                  just a conversation.
                </p>
              </div>
              <div className="space-y-f13">
                <Link
                  href="/membership/join"
                  className="
                    block w-full text-center py-f13 px-f21
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
                    block w-full text-center py-f13 px-f21
                    border border-white/20 hover:border-white/40
                    text-white/80 hover:text-white font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  Email Stephanie
                </a>
                <a
                  href={mailto(jaclyn.email)}
                  className="
                    block w-full text-center py-f13 px-f21
                    text-white/50 hover:text-white/80 font-bold text-body-sm
                    transition-colors
                  "
                >
                  Email Jaclyn (Executive Director)
                </a>
              </div>
            </div>

            <div className="mt-f34 pt-f21 border-t border-white/10 flex flex-wrap gap-f21">
              <Link
                href="/membership/pricing"
                className="text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
              >
                ← Compare all tiers
              </Link>
              <Link
                href="/membership/benefits"
                className="text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
              >
                View all member benefits
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
