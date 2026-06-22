import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { safeJsonLd } from "@/lib/json-ld";
import { getActiveTiers } from "@/lib/membership-tiers";
import { stephanie, jaclyn } from "@/data/staff";
import { mailto } from "@/lib/format";

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
      "Your business is featured across all three of the chamber's primary channels — not just one. Social posts, email placement, and a dedicated website spotlight that stays live. This is the chamber actively promoting your brand to its full 500+ member network and the broader Medina County audience.",
  },
  {
    title: "2 Complimentary Luncheon Tickets Monthly",
    where: "Member Luncheons",
    description:
      "Two free tickets to chamber member luncheons every month — events that Business Essentials and Visibility Plus members pay to attend. Over a membership year, that's meaningful savings and consistent face time with the chamber's most active and engaged members.",
  },
  {
    title: "Anytime Access to Member Mailing List",
    where: "Full member directory",
    description:
      "Community Investors can access the chamber's full member mailing list at any time — not just on request cycles. Direct outreach to 500+ Medina County businesses when you need it, for partnerships, promotions, or vendor sourcing.",
  },
  {
    title: "Exclusive Special Events Invitations",
    where: "Investor-only events",
    description:
      "Invitations to events and gatherings that aren't on the public calendar. This is where chamber leadership connects with legislators, regional business leaders, and policy stakeholders in settings that aren't open to the general membership.",
  },
];

const alsoIncluded = [
  "Everything in Business Essentials (14 benefits)",
  "Everything in Visibility Plus (4 additional benefits)",
  "E-Newsletter Ad Placement (4/year)",
  "Free Certificate of Origin (Non-Freight Forwarders)",
  "Enhanced Online Directory Listing",
  "Custom Digital Membership Sticker Video",
];

const whoItsFor = [
  "CEOs and founders of mid-to-large Medina County employers",
  "Businesses whose success is tied to local policy — developers, manufacturers, financial services, healthcare",
  "Organizations that want their name attached to the chamber's public work",
  "Leaders who want a direct voice in which policy issues the chamber champions each year",
  "Multi-location operators building regional presence",
  "Businesses that send multiple people to chamber events each month",
];

const notableMembers = [
  "Summa Health",
  "Cleveland Clinic",
  "Westfield Insurance",
  "Rea & Associates",
  "Sandridge Food Corporation",
  "SFS Group",
];

export default async function CommunityInvestorPage() {
  const tiers = await getActiveTiers();
  const ciTier = tiers.find((t) => t.key === "community_investor");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Community Investor Membership",
    description:
      "Greater Medina Chamber of Commerce top-tier membership with investor spotlights, monthly luncheon tickets, anytime mailing list access, and exclusive event invitations.",
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

      {/* Hero — oxford background signals premium tier; same in both themes
          to avoid a brighter shade leaking in dark mode. Ghosted gazebo
          backdrop sits under an oxford scrim to keep the dark tier intact. */}
      <section className="relative overflow-hidden bg-oxford border-b border-white/10">
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
            className="object-cover object-center opacity-[0.33]"
            sizes="100vw"
            quality={70}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-oxford via-oxford/80 to-oxford/40" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8 pt-f144 pb-f89">
          <div className="max-w-3xl">
            <p className="text-overline text-cambridge mb-f8">Membership · Top Tier</p>
            <h1 className="text-display text-white">
              <span className="block">Community</span>
              <span className="block text-cambridge">Investor</span>
            </h1>
            <p className="text-body-lg text-white/70 mt-f13 max-w-2xl leading-relaxed">
              This is where chamber leadership lives. The CEOs, founders, and
              owners who don&apos;t just join the chamber — they shape Medina
              County&apos;s business direction.
            </p>
            <div className="mt-f21 flex flex-wrap items-center gap-f13">
              <div className="text-white/50 text-body-sm font-mono">
                $1,145 <span className="text-white/30">/year</span>
              </div>
              <div className="w-px h-4 bg-white/20" />
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
                  border border-white/20 hover:border-white/40
                  text-white/80 hover:text-white font-bold text-body-sm
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
            <p className="text-overline text-cambridge mb-f8">Exclusive to this tier</p>
            <h2 className="text-h2">What you get that no one else does</h2>
            <p className="text-body text-text-secondary mt-f13 leading-relaxed">
              Community Investor builds on everything in Business Essentials and
              Visibility Plus, then adds four benefits that exist only at this
              level.
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

      {/* Full benefit stack */}
      <section className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="max-w-2xl mb-f21">
              <p className="text-overline text-cambridge mb-f8">The complete picture</p>
              <h2 className="text-h2">Everything included at $1,145/year</h2>
              <p className="text-body text-text-secondary mt-f13">
                Community Investor doesn&apos;t replace lower-tier benefits —
                it adds to them. You get all 22 benefits across all three tiers.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-f21">
              {/* Essentials base */}
              <div className="p-f21 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)]">
                <p className="text-caption font-bold text-text-tertiary uppercase tracking-wider mb-f13">
                  Business Essentials (14)
                </p>
                <ul className="space-y-f8">
                  {(ciTier
                    ? tiers.find((t) => t.key === "standard")?.benefits ?? []
                    : []
                  ).map((b) => (
                    <li key={b} className="flex items-start gap-f8 text-body-sm text-text-secondary">
                      <svg className="w-4 h-4 shrink-0 mt-f3 text-cambridge" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visibility Plus adds */}
              <div className="p-f21 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)]">
                <p className="text-caption font-bold text-text-tertiary uppercase tracking-wider mb-f13">
                  Visibility Plus adds (4)
                </p>
                <ul className="space-y-f8">
                  {(ciTier
                    ? tiers.find((t) => t.key === "visibility_plus")?.addedBenefits ?? []
                    : []
                  ).map((b) => (
                    <li key={b} className="flex items-start gap-f8 text-body-sm text-text-secondary">
                      <svg className="w-4 h-4 shrink-0 mt-f3 text-cambridge" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CI exclusive adds */}
              <div className="p-f21 bg-oxford border border-cambridge/30 rounded-[var(--radius-lg)]">
                <p className="text-caption font-bold text-cambridge uppercase tracking-wider mb-f13">
                  Community Investor adds (4)
                </p>
                <ul className="space-y-f8">
                  {(ciTier?.addedBenefits ?? []).map((b) => (
                    <li key={b} className="flex items-start gap-f8 text-body-sm text-white/80">
                      <svg className="w-4 h-4 shrink-0 mt-f3 text-cambridge" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Who it's for */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          <div className="grid lg:grid-cols-2 gap-f34 items-start">
            <div>
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
                If you&apos;re a first-year member or a small team still finding
                your footing,{" "}
                <Link href="/membership/pricing" className="text-cambridge hover:text-cambridge/80 transition-colors">
                  Business Essentials
                </Link>{" "}
                is the right starting point. There&apos;s no pressure to start
                at the top — but when you&apos;re ready to lead, this is the tier.
              </p>
            </div>

            {/* Notable members */}
            <div className="p-f21 lg:p-f34 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
              <p className="text-caption font-bold text-cambridge uppercase tracking-wider mb-f13">
                Organizations at this tier
              </p>
              <p className="text-body-sm text-text-secondary mb-f21 leading-relaxed">
                Many of Medina County&apos;s largest employers, most visible
                brands, and longest-tenured chamber members are Community
                Investors.
              </p>
              <div className="grid grid-cols-2 gap-f8">
                {notableMembers.map((name) => (
                  <div
                    key={name}
                    className="px-f13 py-f8 bg-bg-primary border border-border-secondary rounded-[var(--radius-md)] text-body-sm font-medium text-text-primary"
                  >
                    {name}
                  </div>
                ))}
              </div>
              <p className="mt-f13 text-caption text-text-tertiary">
                + many more across healthcare, finance, manufacturing, and professional services
              </p>
            </div>
          </div>
        </FadeIn>
      </section>

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
