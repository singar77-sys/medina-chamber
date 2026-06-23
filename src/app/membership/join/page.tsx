import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink, ButtonA } from "@/components/ui/Button";
import { FadeIn } from "@/components/FadeIn";
import { JoinFlow } from "./JoinFlow";
import { getActiveTiers } from "@/lib/membership-tiers";
import { safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Join the Chamber",
  description:
    "Join the Greater Medina Chamber of Commerce. Membership benefits include networking events, business directory listing, advocacy, savings programs, and community visibility.",
  openGraph: {
    title: "Join | Greater Medina Chamber of Commerce",
    description:
      "Networking, directory listing, advocacy, savings programs, and community visibility for Medina County businesses.",
  },
  alternates: { canonical: "/membership/join" },
};

const benefits = [
  {
    title: "Business Directory Listing",
    description:
      "Your business appears in the Chamber's searchable member directory, one of the first places customers look for local services.",
  },
  {
    title: "Networking Events",
    description:
      "Monthly mixers, Chamber Chats, and after-hours events where you meet the business owners who actually run this town.",
  },
  {
    title: "Advocacy & Voice",
    description:
      "The Chamber represents your interests at the local, state, and federal level. Your membership funds the advocacy that protects your business.",
  },
  {
    title: "Savings Programs",
    description:
      "Member-exclusive discounts on insurance, office supplies, shipping, and more through Chamber partnerships.",
  },
  {
    title: "Visibility & Credibility",
    description:
      "The Chamber seal means something in Medina County. Customers trust Chamber members. It's an earned reputation since 1938.",
  },
  {
    title: "Ribbon Cuttings & Milestones",
    description:
      "New location? Anniversary? Expansion? The Chamber shows up with ambassadors, photos, and social media coverage.",
  },
];

const faqs = [
  {
    q: "How much does membership cost?",
    a: "Three fixed tiers: Business Essentials at $345/year, Visibility Plus at $575/year, and Community Investor at $1,145/year. Most new members start with Essentials and upgrade as their visibility and advocacy needs grow.",
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

export const dynamic = "force-dynamic";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ joined?: string; canceled?: string }>;
}) {
  const [{ joined, canceled }, allTiers] = await Promise.all([searchParams, getActiveTiers()]);
  const tiers = allTiers
    .filter((t) => t.price > 0)
    .map((t) => ({ slug: t.key, name: t.name, price: t.price, tagline: t.tagline, featured: t.featured }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
        {/* Ghosted Medina County covered bridge backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/medina-chamber-join-hero.webp"
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
            <ButtonLink href="/membership/pricing" variant="secondary" size="lg">
              View Pricing
            </ButtonLink>
          </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          <div className="mb-f21">
            <p className="text-overline text-cambridge mb-f8">Why Join</p>
            <h2 className="text-h2">What Membership Gets You</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-f21">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="p-f21 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
              >
                <h3 className="text-h4 mb-f8">{b.title}</h3>
                <p className="text-body-sm text-text-secondary leading-relaxed">
                  {b.description}
                </p>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* FAQ */}
      <section className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
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
        className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89 scroll-mt-24"
      >
        <FadeIn>
          <div className="max-w-3xl">
            <p className="text-overline text-cambridge mb-f8">Join</p>
            <h2 className="text-h2 mb-f21">Become a Member</h2>
            {joined && (
              <div
                className="mb-f21 rounded-[var(--radius-lg)] px-f21 py-f13 text-body-sm"
                style={{ background: "#f0fdf4", color: "#15803d" }}
              >
                ✅ Payment received — welcome to the Chamber! Your membership is active. Check your
                email for your member portal sign-in link.
              </div>
            )}
            {canceled && (
              <div
                className="mb-f21 rounded-[var(--radius-lg)] px-f21 py-f13 text-body-sm"
                style={{ background: "#fff7ed", color: "#c2410c" }}
              >
                Checkout was canceled — you have not been charged. Pick up where you left off below.
              </div>
            )}
            <JoinFlow tiers={tiers} />
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
