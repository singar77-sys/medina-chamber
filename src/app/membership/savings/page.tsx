import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "@/components/FadeIn";
import { VesicaPiscisWatermark } from "@/components/effects/VesicaPiscisWatermark";
import { savingsPrograms } from "@/data/savings-programs";
import { mailto } from "@/lib/format";
import { safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Member Savings Programs",
  description:
    "Greater Medina Chamber members get exclusive access to group health insurance, workers' compensation discounts, energy savings programs, HR solutions, and recreation center memberships.",
  openGraph: {
    title: "Member Savings Programs | Greater Medina Chamber of Commerce",
    description:
      "Five member-exclusive savings programs covering health insurance, workers' comp, energy, HR, and recreation.",
  },
  alternates: { canonical: "/membership/savings" },
};

export default function SavingsPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Greater Medina Chamber of Commerce Member Savings Programs",
    description:
      "Member-exclusive savings programs covering health insurance, workers' compensation, energy, HR, and recreation.",
    url: "https://medinachamber.com/membership/savings",
    numberOfItems: savingsPrograms.length,
    itemListElement: savingsPrograms.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Service",
        name: p.name,
        description: p.description,
        category: p.tag,
        provider: { "@type": "Organization", name: p.provider },
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden pt-f144 pb-f89 min-h-[42rem]">
        {/* Ghosted Medina Chamber etched-seal glass-door backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/membership/medina-chamber-savings-hero.webp"
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
              <span className="block">Savings</span>
              <span className="block text-accent">Programs</span>
            </h1>
            <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
              Chamber membership includes exclusive access to programs that cut
              real costs. Health insurance, workers&apos; comp, energy bills,
              HR, and more. Five programs built for small and mid-sized
              businesses.
            </p>
          </div>
        </div>
      </section>

      {/* Program cards */}
      <section className="relative overflow-hidden bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <VesicaPiscisWatermark className="tp-vesica" />
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="mb-f21 flex items-end justify-between gap-f21 flex-wrap">
              <div>
                <p className="text-overline text-cambridge mb-f8">The Programs</p>
                <h2 className="text-h2">{savingsPrograms.length} Member-Only Benefits</h2>
              </div>
              <p className="text-body-sm text-text-tertiary">
                Available the moment your membership is active.
              </p>
            </div>
            <div className="space-y-f21">
              {savingsPrograms.map((p, i) => (
                <FadeIn key={p.slug} delay={i * 60}>
                  <article className="p-f21 lg:p-f34 bg-bg-primary border border-border-secondary rounded-[var(--radius-lg)]">
                    <header className="mb-f13">
                      <span className="text-caption text-cambridge font-bold uppercase tracking-wider">
                        {p.tag}
                      </span>
                      <h3 className="text-h3 mt-f3">{p.name}</h3>
                      <p className="text-body-sm text-text-tertiary mt-f3">
                        via {p.provider}
                      </p>
                    </header>

                    <div className="grid md:grid-cols-2 gap-f21">
                      <div>
                        <p className="text-body-sm text-text-secondary leading-relaxed">
                          {p.description}
                        </p>
                        <div className="mt-f13 p-f13 bg-bg-secondary border border-border-secondary rounded-[var(--radius-md)]">
                          <p className="text-caption text-text-tertiary uppercase tracking-wider mb-f3">
                            Eligibility
                          </p>
                          <p className="text-body-sm text-text-primary">
                            {p.eligibility}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-caption text-text-tertiary uppercase tracking-wider mb-f8">
                          How to Access
                        </p>
                        <p className="text-body-sm text-text-secondary leading-relaxed">
                          {p.howToAccess}
                        </p>
                        {p.contact && (
                          <div className="mt-f13 space-y-f3">
                            <p className="text-body-sm font-bold text-text-primary">
                              {p.contact.name}
                            </p>
                            <a
                              href={mailto(p.contact.email)}
                              className="block text-body-sm text-cambridge hover:text-cambridge/80 transition-colors"
                            >
                              {p.contact.email}
                            </a>
                            <a
                              href={`tel:${p.contact.phone.replace(/\D/g, "")}`}
                              className="block text-body-sm text-text-secondary hover:text-text-primary transition-colors"
                            >
                              {p.contact.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                </FadeIn>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Member-only CTA */}
      <section className="relative overflow-hidden py-f55 lg:py-f89">
        {/* Ghosted community backdrop */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/sneak-peeks/medina-chamber-community-012.webp"
            alt=""
            fill
            className="object-cover object-top opacity-[0.18]"
            sizes="100vw"
            quality={60}
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
          <div className="p-f34 lg:p-f55 bg-bg-secondary/75 border border-border-secondary rounded-[var(--radius-lg)]">
            <div className="grid lg:grid-cols-2 gap-f34 items-center">
              <div>
                <p className="text-overline text-cambridge mb-f8">Join</p>
                <h2 className="text-h2">These are member-only programs.</h2>
                <p className="text-body-lg text-text-secondary mt-f13">
                  The savings programs alone can offset, or exceed, the cost
                  of annual membership. Health insurance savings for even one
                  employee typically covers the full membership investment.
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
                  Join the Chamber →
                </Link>
                <Link
                  href="/membership/benefits"
                  className="
                    block w-full text-center py-f13 px-f21
                    bg-emerald hover:bg-emerald/90
                    text-white font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  See All Member Benefits
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
        </div>
      </section>
    </>
  );
}
