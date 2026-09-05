import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ContactForm } from "./ContactForm";
import { MedinaNetworkMap } from "@/components/about/MedinaNetworkMap";
import { FadeIn } from "@/components/FadeIn";
import { MouseGradient } from "@/components/MouseGradient";
import { VesicaPiscisWatermark } from "@/components/effects/VesicaPiscisWatermark";
import { safeJsonLd } from "@/lib/json-ld";
import { chamberOffice } from "@/data/staff";
import { mailto } from "@/lib/format";
import { getPageContent } from "@/lib/cms-content";
import { OG_IMAGE } from "@/lib/og";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the Greater Medina Chamber of Commerce. Located at 139 N. Court Street, Suite A, Medina, OH 44256. Call (330) 723-8773 or send us a message.",
  openGraph: {
    images: OG_IMAGE,
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

export default async function ContactPage() {
  // Admin-editable hours caption (Content editor). The structured-data hours
  // in contactJsonLd above stay code-managed — they need opens/closes fields,
  // not a display string.
  const hoursCaption = await getPageContent("contact", "hours");
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
              We&apos;re the hub of Medina County&apos;s business network,
              serving every community in the area.
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
                  bg-emerald hover:bg-emerald/90
                  text-white font-bold text-body-sm
                  rounded-[var(--radius-md)]
                  transition-colors
                "
              >
                Email the office
              </a>
            </div>
          </div>
        </section>
      </div>

      {/* quick-route strip — cursor-flashlight glow follows the pointer
          across the three route cards (same effect as the home stats strip) */}
      <MouseGradient
        className="overflow-hidden bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89"
        color="rgba(92, 149, 183, 0.22)"
      >
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
      </MouseGradient>

      {/* contact form — breathing Vesica watermark sits centered behind the
          whole band; the form stays in its narrow max-w-2xl column above it */}
      <section id="contact-form" className="relative overflow-hidden py-f89 lg:py-f144">
        <VesicaPiscisWatermark className="tp-vesica" />
        <div className="relative mx-auto max-w-2xl px-6 lg:px-8">
          <FadeIn>
            <ContactForm />
          </FadeIn>
        </div>
      </section>

      {/* network map */}
      <section className="bg-bg-secondary border-y border-border-secondary py-f55 lg:py-f89">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
            {/* The address sits in the header rather than floating over the
                map: it used to cover the map's bottom-left corner (and half
                the map on narrower screens), and this header row had unused
                space to its right anyway. Suite/zip, hours and the
                directions link live ONLY here — the h2 carries the street
                alone — so don't drop this block without rehoming them. */}
            <div className="mb-f34 flex flex-col gap-f21 md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl">
                <p className="text-overline text-cambridge mb-f8">Where we are</p>
                <h2 className="text-h2">
                  139 N. Court Street, {" "}
                  <span className="text-text-secondary">across Medina County</span>
                </h2>
                <p className="text-body text-text-secondary mt-f13">
                  The network radiates from our downtown Medina hub across every
                  community we serve.
                </p>
              </div>
              <div className="shrink-0 md:text-right">
                <p className="text-caption font-bold text-text-primary mb-f3">Chamber Headquarters</p>
                <p className="text-caption text-text-secondary leading-relaxed">
                  139 N. Court Street, Suite A
                  <br />
                  Medina, OH 44256
                </p>
                <p className="text-caption text-text-tertiary mt-f8">
                  {hoursCaption}
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

            <MedinaNetworkMap />
          </FadeIn>
        </div>
      </section>

      {/* membership bookend */}
      <section className="relative overflow-hidden py-f55 lg:py-f89">
        {/* Ghosted misty-lake-sunrise backdrop (was the vintage gazebo, which
            also ghosts medina-means-business — de-twinned 2026-08-26) */}
        <div
          className="absolute inset-0 pointer-events-none select-none"
          aria-hidden="true"
        >
          <Image
            src="/images/photos/medina-county-lake-sunrise.webp"
            alt=""
            fill
            className="object-cover object-center opacity-[0.18]"
            sizes="100vw"
            quality={60}
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <FadeIn>
          <div className="p-f34 lg:p-f55 bg-bg-secondary/75 border border-border-secondary rounded-[var(--radius-lg)]">
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
                    bg-emerald hover:bg-emerald/90
                    text-white font-bold text-body-sm
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
        </div>
      </section>
    </>
  );
}
