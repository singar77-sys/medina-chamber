import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Member Benefits",
  description:
    "Greater Medina Chamber of Commerce member benefits, directory listing, networking events, business advocacy, exclusive savings programs, free notary services, and more for Medina County businesses.",
  openGraph: {
    title: "Member Benefits | Greater Medina Chamber of Commerce",
    description:
      "What you get as a Greater Medina Chamber member, advocacy, networking, visibility, savings programs, and more.",
  },
  alternates: { canonical: "/membership/benefits" },
};

const coreBenefits = [
  {
    title: "Business Directory Listing",
    description:
      "Your business appears in our searchable online member directory, one of the first places people in Medina County look when they need a local service or product. Full profile with contact info, website, categories, and description.",
    link: { label: "Browse the directory", href: "/membership/directory" },
  },
  {
    title: "Advocacy & Policy Voice",
    description:
      "The chamber is your voice at the table, representing member interests in local, state, and federal policy discussions. From candidate interview programs to issue mobilization, we fight for a pro-business environment so you can focus on your business.",
    link: { label: "About our advocacy", href: "/about/advocacy" },
  },
  {
    title: "Networking Events",
    description:
      "Access to regular member meetings, mixers, Social Connect at Foundry Social, the annual Golf Outing, Athena Awards, and more. These are the rooms where Medina County business gets done.",
    link: { label: "See upcoming events", href: "/events" },
  },
  {
    title: "Education & Resources",
    description:
      "Business development programming, workshops, and committee involvement that sharpen skills and expand perspective. The Compass Professional Development Program offers a full five-session professional development experience.",
    link: { label: "View programs", href: "/programs" },
  },
  {
    title: "Exclusive Savings Programs",
    description:
      "Member-only access to group health insurance, workers' compensation discounts, energy programs, HR services, and recreation center memberships. Real dollar savings on the things every business needs.",
    link: { label: "View savings programs", href: "/membership/savings" },
  },
  {
    title: "Marketing & Visibility",
    description:
      "Exposure through the member directory, sponsorship opportunities, social media promotion, featured placement in chamber communications, and the Medina Means Business magazine.",
    link: { label: "Sponsorship opportunities", href: "/events/sponsorships" },
  },
  {
    title: "Committee Participation",
    description:
      "Nine committees and councils where members actively shape chamber programs, events, advocacy, and culture. From the Marketing Committee to the Ambassador Committee, there's a role for every kind of contributor.",
    link: { label: "Explore committees", href: "/membership/committees" },
  },
  {
    title: "Safety Council Access",
    description:
      "Chamber members participate in the Medina County Safety Council at no additional charge, monthly workplace safety education meetings and eligibility for the Ohio BWC Group Rebate Program.",
    link: { label: "About the Safety Council", href: "/programs/safety-council" },
  },
];

const extraBenefits = [
  {
    title: "Free Notary Services",
    description:
      "Public notary services are available at the chamber office at no charge to members. Common uses include estates, deeds, and powers of attorney.",
  },
  {
    title: "Certificates of Origin",
    description:
      "International trade documentation assistance for businesses involved in import/export. Free for non-freight forwarders on Visibility Plus and Community Investor tiers. Freight forwarders: pricing on request.",
  },
  {
    title: "Ribbon Cuttings",
    description:
      "Grand openings, new locations, renovations, and milestone events celebrated with chamber staff, ambassadors, ceremonial scissors, and social media coverage.",
  },
  {
    title: "Member Rate on Events",
    description:
      "Discounted registration for chamber events including the Golf Outing and Athena Awards. Safety Council membership is included at no additional charge.",
  },
];

export default function BenefitsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Greater Medina Chamber of Commerce Member Benefits",
    description:
      "What you get as a Greater Medina Chamber member. Directory listing, networking, advocacy, savings programs, and more.",
    url: "https://medinachamber.com/membership/benefits",
    numberOfItems: coreBenefits.length + extraBenefits.length,
    itemListElement: [...coreBenefits, ...extraBenefits].map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: { "@type": "Thing", name: b.title, description: b.description },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
        {/* Ghosted "Medina Means Business" branding backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/membership/medina-chamber-member-benefits-hero.webp"
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
              <span className="block">Member</span>
              <span className="block text-accent">Benefits</span>
            </h1>
            <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
              Chamber membership isn&apos;t just a badge, it&apos;s access to the
              relationships, resources, and advocacy that help Medina County
              businesses grow.
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
                Join the Chamber →
              </Link>
              <Link
                href="/membership/pricing"
                className="
                  inline-flex items-center px-f21 py-f13
                  border border-border-primary hover:border-text-tertiary
                  text-text-primary font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Core benefits */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          <h2 className="text-overline text-cambridge mb-f21">What&apos;s Included</h2>
          <div className="grid md:grid-cols-2 gap-f21">
            {coreBenefits.map((b, i) => (
              <FadeIn key={b.title} delay={i * 50}>
                <div className="flex flex-col p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] h-full">
                  <h3 className="text-h4 mb-f8">{b.title}</h3>
                  <p className="text-body-sm text-text-secondary leading-relaxed flex-1">
                    {b.description}
                  </p>
                  {b.link && (
                    <Link
                      href={b.link.href}
                      className="mt-f13 text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
                    >
                      {b.link.label} →
                    </Link>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* Additional perks */}
      <section className="relative overflow-hidden bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        {/* Ghosted Medina Chamber branded-buttons backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/membership/medina-chamber-member-perks-bg.webp"
            alt=""
            fill
            className="object-cover opacity-[0.33]"
            sizes="100vw"
            quality={60}
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <h2 className="text-overline text-cambridge mb-f21">Additional Member Perks</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-f21">
              {extraBenefits.map((b, i) => (
                <FadeIn key={b.title} delay={i * 60}>
                  <div className="p-f21 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)] h-full">
                    <h3 className="text-body font-bold mb-f8">{b.title}</h3>
                    <p className="text-body-sm text-text-secondary leading-relaxed">
                      {b.description}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Join CTA */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          <div className="p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <div className="grid lg:grid-cols-2 gap-f34 items-center">
              <div>
                <h2 className="text-h2">Ready to put these to work?</h2>
                <p className="text-body-lg text-text-secondary mt-f13">
                  Three tiers: Business Essentials at $345/year, Visibility Plus at
                  $575/year, or Community Investor at $1,145/year. Membership pays
                  for itself with one good referral, one saved contract, or one
                  connection made at a mixer.
                </p>
              </div>
              <div className="space-y-f13">
                <Link
                  href="/membership/join"
                  className="
                    block w-full text-center py-f13 px-f21
                    bg-accent hover:bg-accent-hover
                    text-white font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  Apply for Membership →
                </Link>
                <Link
                  href="/membership/pricing"
                  className="
                    block w-full text-center py-f13 px-f21
                    border border-border-primary hover:border-text-tertiary
                    text-text-primary font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  View Pricing Tiers
                </Link>
              </div>
            </div>
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
