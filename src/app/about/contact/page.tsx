import type { Metadata } from "next";
import { ContactForm } from "./ContactForm";

import { safeJsonLd } from "@/lib/json-ld";
import { headers } from "next/headers";
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

const info = [
  {
    label: "Address",
    value: "139 N. Court Street, Suite A\nMedina, OH 44256",
    href: "https://maps.google.com/?q=139+N+Court+Street+Suite+A+Medina+OH+44256",
  },
  {
    label: "Phone",
    value: "(330) 723-8773",
    href: "tel:+13307238773",
  },
  {
    label: "Email",
    value: "office@medinaohchamber.com",
    href: "mailto:office@medinaohchamber.com",
  },
  {
    label: "Hours",
    value: "Monday–Friday\n10:00 AM – 4:00 PM",
    href: null,
  },
];

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

export default async function ContactPage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: safeJsonLd(contactJsonLd) }}
      />
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Contact</p>
        <h1 className="text-display">
          Get in Touch
          <br />
          <span className="text-accent">with the Chamber</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          Questions about membership, events, or how the Chamber can help your
          business? We&apos;d love to hear from you.
        </p>
      </section>

      <div className="mt-16 grid lg:grid-cols-[1fr_400px] gap-12 lg:gap-16">
        {/* ── Contact form ── */}
        <ContactForm />

        {/* ── Contact info ── */}
        <aside className="space-y-8">
          {info.map((item) => (
            <div key={item.label}>
              <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-1">
                {item.label}
              </p>
              {item.href ? (
                <a
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="text-body text-text-primary hover:text-cambridge transition-colors whitespace-pre-line"
                >
                  {item.value}
                </a>
              ) : (
                <p className="text-body text-text-primary whitespace-pre-line">{item.value}</p>
              )}
            </div>
          ))}

          {/* Staff contact callout */}
          <div className="mt-8 p-6 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
            <p className="text-body-sm font-bold text-text-primary mb-1">
              Membership &amp; Events
            </p>
            <p className="text-body-sm text-text-secondary">
              Contact{" "}
              <span className="font-semibold text-text-primary">
                Stephanie Mueller
              </span>{" "}
              for questions about joining, event sponsorships, or ribboncuttings.
            </p>
          </div>
        </aside>
      </div>
    </div>
    </>
  );
}
