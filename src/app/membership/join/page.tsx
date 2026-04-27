import type { Metadata } from "next";
import Link from "next/link";
import { ApplicationForm } from "./ApplicationForm";

import { safeJsonLd } from "@/lib/json-ld";
export const metadata: Metadata = {
  title: "Join the Chamber",
  description:
    "Join the Greater Medina Chamber of Commerce. Membership benefits include networking events, business directory listing, advocacy, savings programs, and community visibility.",
  openGraph: {
    title: "Join — Greater Medina Chamber of Commerce",
    description:
      "Networking, directory listing, advocacy, savings programs, and community visibility for Medina County businesses.",
  },
  alternates: { canonical: "/membership/join" },
};

const benefits = [
  {
    title: "Business Directory Listing",
    description:
      "Your business appears in the Chamber's searchable member directory — one of the first places customers look for local services.",
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
    a: "Yes. Most events are open to prospective members. Come to a Chamber Chat or mixer first — see if it's your kind of room.",
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
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Join</p>
        <h1 className="text-display">
          Grow With
          <br />
          <span className="text-accent">Medina</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          The Greater Medina Chamber of Commerce has been connecting businesses
          since 1938. Membership means your business has a seat at the table —
          networking, advocacy, visibility, and the relationships that actually
          drive growth in a county this size.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <a
            href="#apply"
            className="
              inline-flex items-center px-8 py-4
              bg-accent hover:bg-accent-hover
              text-white font-bold text-body
              rounded-[var(--radius-md)]
              transition-colors
            "
          >
            Start Your Application →
          </a>
          <Link
            href="/membership/pricing"
            className="
              inline-flex items-center px-6 py-4
              bg-bg-tertiary hover:bg-border-primary
              text-text-primary font-bold text-body-sm
              rounded-[var(--radius-md)]
              transition-colors
            "
          >
            View Pricing
          </Link>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="mt-24">
        <h2 className="text-overline text-cambridge mb-8">
          What Membership Gets You
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="
                p-6
                bg-bg-secondary border border-border-secondary
                rounded-[var(--radius-lg)]
              "
            >
              <h3 className="text-h4 mb-3">{b.title}</h3>
              <p className="text-body-sm text-text-secondary">
                {b.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-24 max-w-3xl">
        <h2 className="text-overline text-cambridge mb-8">
          Common Questions
        </h2>
        <div className="space-y-8">
          {faqs.map((faq) => (
            <div key={faq.q}>
              <h3 className="text-h4">{faq.q}</h3>
              <p className="text-body text-text-secondary mt-2">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Application form */}
      <section id="apply" className="mt-24 scroll-mt-24">
        <h2 className="text-overline text-cambridge mb-2">Apply</h2>
        <h3 className="text-h2 mb-8">Membership Application</h3>
        <div className="max-w-3xl">
          <ApplicationForm />
        </div>
      </section>
    </div>
    </>
  );
}
