import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ContactForm } from "./ContactForm";
import { MedinaNetworkMap } from "@/components/about/MedinaNetworkMap";
import { FadeIn } from "@/components/FadeIn";
import { totalCount } from "@/data/members";
import { safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the Greater Medina Chamber of Commerce. Located at 139 N. Court Street, Suite A, Medina, OH 44256. Call (330) 723-8773 or send us a message.",
  openGraph: {
    title: "Contact — Greater Medina Chamber of Commerce",
    description:
      "Reach out with questions about membership, events, or anything else. We're here to help.",
  },
  alternates: { canonical: "/about/contact" },
};

const contactJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://medinachamber.com/#organization",
  name: "Greater Medina Chamber of Commerce",
  telephone: "+1-330-723-8773",
  email: "office@medinaohchamber.com",
  url: "https://medinachamber.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "139 N. Court Street, Suite A",
    addressLocality: "Medina",
    addressRegion: "OH",
    postalCode: "44256",
    addressCountry: "US",
  },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "10:00",
    closes: "16:00",
  },
};

const routes = [
  {
    href: "/membership/join",
    title: "Joining the Chamber",
    desc: "Membership tiers, pricing, and the application process.",
    cta: "Explore membership",
  },
  {
    href: "/events",
    title: "Events & Networking",
    desc: "Upcoming events, registration, and sponsorship opportunities.",
    cta: "View events",
  },
  {
    href: "/programs/rental-space",
    title: "Meeting Space",
    desc: "Book one of our two downtown meeting rooms.",
    cta: "See availability",
  },
];

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(contactJsonLd) }}
      />

      {/* ─── Hero — ambient gradient, no bg band ─────────────── */}
      <div className="relative isolate overflow-hidden">
        <div className="slow-gradient" aria-hidden="true">
          <div className="slow-gradient__grid" />
        </div>

        <section className="relative mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-overline text-cambridge mb-4">Contact</p>
            <h1 className="text-display">
              Get in Touch
              <br />
              <span className="text-accent">with the Chamber</span>
            </h1>
            <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
              We&apos;re the hub of Medina County&apos;s business network —{" "}
              {totalCount}+ members across every community in the area.
              Questions about membership, events, or how we can help?
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="tel:+13307238773"
                className="
                  inline-flex items-center px-8 py-4
                  bg-accent hover:bg-accent-hover
                  text-white font-bold text-body
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                Call (330) 723-8773 →
              </a>
              <a
                href="mailto:office@medinaohchamber.com"
                className="
                  inline-flex items-center px-6 py-4
                  border border-border-primary hover:border-text-tertiary
                  text-text-primary font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                Email the office
              </a>
              <a
                href="#contact-form"
                className="
                  inline-flex items-center px-4 py-4
                  text-cambridge font-bold text-body-sm
                  hover:text-cambridge/80 transition-colors
                "
              >
                Or send a message ↓
              </a>
            </div>
          </div>
        </section>
      </div>

      {/* ─── Quick-route strip ────────────────────────────────── */}
      <section className="bg-bg-secondary border-y border-border-secondary py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <p className="text-caption text-text-tertiary font-bold uppercase tracking-wider mb-6">
              Looking for something specific?
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {routes.map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  className="
                    group flex flex-col gap-2 p-6
                    bg-bg-primary border border-border-secondary
                    rounded-[var(--radius-lg)]
                    hover:border-cambridge/40
                    hover:shadow-[0_8px_32px_rgba(131,188,169,0.10)]
                    transition-all duration-200
                  "
                >
                  <p className="text-body-sm font-bold text-text-primary">{r.title}</p>
                  <p className="text-caption text-text-tertiary flex-1 leading-relaxed">{r.desc}</p>
                  <p className="text-caption font-bold text-cambridge group-hover:translate-x-1 transition-transform">
                    {r.cta} →
                  </p>
                </Link>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── Form + Stephanie ─────────────────────────────────── */}
      <section id="contact-form" className="mx-auto max-w-7xl px-6 lg:px-8 py-20 lg:py-28">
        <FadeIn>
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <ContactForm />

            <aside>
              <div className="bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] p-8 lg:p-10">
                <div className="mb-6 overflow-hidden rounded-[var(--radius-md)]">
                  <Image
                    src="/images/people/staff/stephanie-mueller-membership-events-coordinator-greater-medina-chamber.jpg"
                    alt="Stephanie Mueller, Membership & Events Coordinator at the Greater Medina Chamber of Commerce"
                    width={560}
                    height={420}
                    className="w-full aspect-[4/3] object-cover object-top"
                    priority
                  />
                </div>

                <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-1">
                  Membership &amp; Events
                </p>
                <p className="text-h4 text-text-primary">Stephanie Mueller</p>
                <p className="text-body-sm text-text-secondary mt-2 mb-6 leading-relaxed">
                  Stephanie is your direct line for membership questions, event
                  sponsorships, and ribbon cuttings. She responds within one
                  business day.
                </p>

                <div className="space-y-3 border-t border-border-secondary pt-6">
                  <a
                    href="tel:+13307238773"
                    className="flex items-center gap-3 text-body-sm text-text-primary hover:text-cambridge transition-colors"
                  >
                    <span className="text-cambridge font-bold">→</span>
                    (330) 723-8773
                  </a>
                  <a
                    href="mailto:stephanie@medinaohchamber.com"
                    className="flex items-center gap-3 text-body-sm text-text-primary hover:text-cambridge transition-colors"
                  >
                    <span className="text-cambridge font-bold">→</span>
                    stephanie@medinaohchamber.com
                  </a>
                  <p className="flex items-center gap-3 text-body-sm text-text-tertiary">
                    <span className="text-cambridge font-bold">→</span>
                    Mon–Fri · 10:00 AM – 4:00 PM
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </FadeIn>
      </section>

      {/* ─── Network map — banded section ────────────────────── */}
      <section className="bg-bg-secondary border-y border-border-secondary py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="max-w-3xl mb-10">
              <p className="text-overline text-cambridge mb-3">Where we are</p>
              <h2 className="text-h2">
                139 N. Court Street —{" "}
                <span className="text-text-secondary">and {totalCount}+ members across Medina County</span>
              </h2>
              <p className="text-body text-text-secondary mt-4">
                Click the hub to open directions, or explore the network
                radiating across every community we serve.
              </p>
            </div>

            {/* Relative wrapper so the address card can float over the map */}
            <div className="relative">
              <MedinaNetworkMap />
              <div
                className="
                  absolute bottom-5 left-5 z-10
                  max-w-[260px]
                  bg-[rgba(12,27,51,0.90)] backdrop-blur-md
                  border border-cambridge/20
                  rounded-[var(--radius-md)]
                  p-5 shadow-xl
                "
              >
                <p className="text-caption font-bold text-white mb-1">Chamber Headquarters</p>
                <p className="text-caption text-white/65 leading-relaxed">
                  139 N. Court Street, Suite A
                  <br />
                  Medina, OH 44256
                </p>
                <p className="text-caption text-white/50 mt-1.5">
                  Mon–Fri · 10:00 AM – 4:00 PM
                </p>
                <a
                  href="https://maps.google.com/?q=139+N+Court+Street+Suite+A+Medina+OH+44256"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex text-caption font-bold text-cambridge hover:text-cambridge/80 transition-colors"
                >
                  Get directions ↗
                </a>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── Bookend closer — route back to membership ────────── */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-20">
        <FadeIn>
          <div className="p-8 lg:p-10 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <p className="text-overline text-cambridge mb-3">Membership</p>
                <h2 className="text-h3">
                  Not sure if membership is right for you?
                </h2>
                <p className="text-body text-text-secondary mt-3 leading-relaxed">
                  Stephanie can walk you through the options — no pressure. Or
                  browse the benefits and tiers on your own first.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                <Link
                  href="/membership/join"
                  className="
                    inline-flex items-center justify-center px-6 py-3
                    bg-accent hover:bg-accent-hover
                    text-white font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  Apply for Membership →
                </Link>
                <Link
                  href="/membership/benefits"
                  className="
                    inline-flex items-center justify-center px-6 py-3
                    border border-border-primary hover:border-text-tertiary
                    text-text-primary font-bold text-body-sm
                    rounded-[var(--radius-md)]
                    transition-colors
                  "
                >
                  See All Benefits
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
