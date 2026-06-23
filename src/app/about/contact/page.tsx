import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ContactForm } from "./ContactForm";
import { MedinaNetworkMap } from "@/components/about/MedinaNetworkMap";
import { FadeIn } from "@/components/FadeIn";
import { safeJsonLd } from "@/lib/json-ld";
import { chamberOffice, stephanie } from "@/data/staff";
import { mailto } from "@/lib/format";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the Greater Medina Chamber of Commerce. Located at 139 N. Court Street, Suite A, Medina, OH 44256. Call (330) 723-8773 or send us a message.",
  openGraph: {
    title: "Contact | Greater Medina Chamber of Commerce",
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
  email: chamberOffice.email,
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

      {/* ambient gradient + ghosted chamber building (reused from homepage) */}
      <div className="relative isolate overflow-hidden">
        <div className="slow-gradient" aria-hidden="true">
          <div className="slow-gradient__grid" />
        </div>
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/medina-chamber-headquarters-court-street.webp"
            alt=""
            fill
            priority
            className="object-cover opacity-[0.33]"
            sizes="100vw"
          />
        </div>

        <section className="relative mx-auto max-w-7xl px-6 lg:px-8 pt-f144 pb-f89 min-h-[42rem]">
          <div className="max-w-3xl">
            <p className="text-overline text-cambridge mb-f8">Contact</p>
            <h1 className="text-display">
            <span className="block">Get in Touch</span>
            <span className="block text-accent">with the Chamber</span>
          </h1>
            <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
              We&apos;re the hub of Medina County&apos;s business network, {" "}
              500+ members across every community in the area.
              Questions about membership, events, or how we can help?
            </p>
            <div className="mt-f21 flex flex-wrap gap-f13">
              <a
                href="tel:+13307238773"
                className="
                  inline-flex items-center px-f21 py-f13
                  bg-accent hover:bg-accent-hover
                  text-white font-bold text-body
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                Call (330) 723-8773 →
              </a>
              <a
                href={mailto(chamberOffice.email)}
                className="
                  inline-flex items-center px-f21 py-f13
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
                  inline-flex items-center px-f13 py-f13
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

      {/* quick-route strip */}
      <section className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <p className="text-caption text-text-tertiary font-bold uppercase tracking-wider mb-f21">
              Looking for something specific?
            </p>
            <div className="grid sm:grid-cols-3 gap-f21">
              {routes.map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  className="
                    group flex flex-col gap-f8 p-f21
                    bg-bg-primary border border-border-secondary
                    rounded-[var(--radius-lg)]
                    hover:border-cambridge/40
                    hover:shadow-cambridge
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

      {/* form + Stephanie */}
      <section id="contact-form" className="mx-auto max-w-7xl px-6 lg:px-8 py-f89 lg:py-f144">
        <FadeIn>
          <div className="grid lg:grid-cols-2 gap-f34 lg:gap-f55 items-start">
            <ContactForm />

            <aside>
              <div className="bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] p-f34 lg:p-f55">
                <div className="mb-f21 overflow-hidden rounded-[var(--radius-md)]">
                  <Image
                    src="/images/people/staff/stephanie-mueller-membership-events-coordinator-greater-medina-chamber.jpg"
                    alt="Stephanie Mueller, Membership & Events Coordinator at the Greater Medina Chamber of Commerce"
                    width={560}
                    height={420}
                    className="w-full aspect-[4/3] object-cover object-top"
                  />
                </div>

                <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-f3">
                  Membership &amp; Events
                </p>
                <p className="text-h4 text-text-primary">Stephanie Mueller</p>
                <p className="text-body-sm text-text-secondary mt-f8 mb-f21 leading-relaxed">
                  Stephanie is your direct line for membership questions, event
                  sponsorships, and ribbon cuttings. She responds within one
                  business day.
                </p>

                <div className="space-y-f13 border-t border-border-secondary pt-f21">
                  <a
                    href="tel:+13307238773"
                    className="flex items-center gap-f13 text-body-sm text-text-primary hover:text-cambridge transition-colors"
                  >
                    <span className="text-cambridge font-bold">→</span>
                    (330) 723-8773
                  </a>
                  <a
                    href={mailto(stephanie.email)}
                    className="flex items-center gap-f13 text-body-sm text-text-primary hover:text-cambridge transition-colors"
                  >
                    <span className="text-cambridge font-bold">→</span>{stephanie.email}</a>
                  <p className="flex items-center gap-f13 text-body-sm text-text-tertiary">
                    <span className="text-cambridge font-bold">→</span>
                    Mon–Fri · 10:00 AM – 4:00 PM
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </FadeIn>
      </section>

      {/* network map */}
      <section className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            <div className="max-w-3xl mb-f34">
              <p className="text-overline text-cambridge mb-f8">Where we are</p>
              <h2 className="text-h2">
                139 N. Court Street, {" "}
                <span className="text-text-secondary">and 500+ members across Medina County</span>
              </h2>
              <p className="text-body text-text-secondary mt-f13">
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
                  bg-bg-primary backdrop-blur-md
                  border border-cambridge/50
                  rounded-[var(--radius-md)]
                  p-f21 shadow-xl
                "
              >
                <p className="text-caption font-bold text-text-primary mb-f3">Chamber Headquarters</p>
                <p className="text-caption text-text-secondary leading-relaxed">
                  139 N. Court Street, Suite A
                  <br />
                  Medina, OH 44256
                </p>
                <p className="text-caption text-text-tertiary mt-f8">
                  Mon–Fri · 10:00 AM – 4:00 PM
                </p>
                <a
                  href="https://maps.google.com/?q=139+N+Court+Street+Suite+A+Medina+OH+44256"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-f13 inline-flex text-caption font-bold text-cambridge hover:text-cambridge/80 transition-colors"
                >
                  Get directions ↗
                </a>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* membership bookend */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-f55 lg:py-f89">
        <FadeIn>
          <div className="p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <div className="grid lg:grid-cols-2 gap-f34 items-center">
              <div>
                <p className="text-overline text-cambridge mb-f8">Membership</p>
                <h2 className="text-h3">
                  Not sure if membership is right for you?
                </h2>
                <p className="text-body text-text-secondary mt-f13 leading-relaxed">
                  Stephanie can walk you through the options, no pressure. Or
                  browse the benefits and tiers on your own first.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row lg:flex-col gap-f13">
                <Link
                  href="/membership/join"
                  className="
                    inline-flex items-center justify-center px-f21 py-f13
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
                    inline-flex items-center justify-center px-f21 py-f13
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
