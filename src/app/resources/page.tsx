import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import Link from "next/link";
import { VesicaPiscisWatermark } from "@/components/effects/VesicaPiscisWatermark";

export const metadata: Metadata = {
  title: "Business Resources, Medina County, Ohio",
  description:
    "Practical resources for Medina County, Ohio businesses, how to start a business, funding and grants, and workforce hiring programs.",
  openGraph: {
    title: "Business Resources | Greater Medina Chamber of Commerce",
    description:
      "Start a business, find funding, and build your team in Medina County, Ohio.",
  },
  alternates: { canonical: "/resources" },
};

const resources = [
  {
    href: "/resources/start-a-business",
    label: "Starting Up",
    title: "Start a Business in Medina County",
    description:
      "Step-by-step guide to launching, business structure, Ohio registration, EIN, licenses, taxes, and the local resources that help new businesses get off the ground.",
    cta: "Read the guide",
  },
  {
    href: "/resources/business-grants",
    label: "Funding",
    title: "Business Grants & Funding",
    description:
      "State, federal, and local programs for Medina County businesses, SBA loans, JobsOhio incentives, USDA Rural Development, Ohio TechCred, and Chamber savings programs.",
    cta: "Explore funding",
  },
  {
    href: "/resources/workforce",
    label: "Hiring",
    title: "Hire & Grow Your Team",
    description:
      "Post jobs, access OhioMeansJobs, find on-the-job training subsidies, and connect your team with safety and credentials programs, all available to Medina County employers.",
    cta: "Workforce resources",
  },
  {
    href: "/resources/library",
    label: "Library",
    title: "Browse the Resource Library",
    description:
      "A curated collection of tools, programs, forms, and links, organized by topic and kept current by the chamber, beyond the guides above.",
    cta: "Open the library",
  },
];

export default function ResourcesPage() {
  return (
    <>
      <PageHero
        overline="Greater Medina Chamber"
        titleTop="Business Resources"
        titleAccent="for Medina County"
        subtitle="Practical guides to the programs, registrations, and funding sources available to businesses starting or growing in Medina County, Ohio."
        image="/images/photos/industry-medina.jpg"
      />

      <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-16 lg:pb-24">

      {/* Resource cards */}
      <section className="relative overflow-hidden mt-20 grid md:grid-cols-3 gap-6">
        <VesicaPiscisWatermark className="tp-vesica" />
        {resources.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="group flex flex-col p-8 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] hover:border-border-primary transition-colors"
          >
            <span className="text-caption font-bold uppercase tracking-wider text-cambridge">
              {r.label}
            </span>
            <h2 className="text-h3 mt-3">{r.title}</h2>
            <p className="text-body-sm text-text-secondary mt-4 leading-relaxed flex-1">
              {r.description}
            </p>
            <p className="mt-6 text-body-sm font-bold text-cambridge group-hover:translate-x-1 transition-transform">
              {r.cta} →
            </p>
          </Link>
        ))}
      </section>

      {/* Chamber CTA */}
      <section className="mt-20 p-10 lg:p-16 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-h2">The Chamber is your first resource</h2>
            <p className="text-body-lg text-text-secondary mt-4">
              Membership connects you to every other business owner in Medina
              County, and to the staff who know which programs actually apply to
              your situation. From $345/year.
            </p>
          </div>
          <div className="space-y-4">
            <Link
              href="/membership/join"
              className="block w-full text-center py-4 px-6 bg-accent hover:bg-accent-hover text-white font-bold text-body rounded-[var(--radius-md)] transition-colors"
            >
              Join the Chamber →
            </Link>
            <Link
              href="/membership/benefits"
              className="block w-full text-center py-3 px-6 bg-emerald hover:bg-emerald/90 text-white font-bold text-body-sm rounded-[var(--radius-md)] transition-colors"
            >
              See Member Benefits
            </Link>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
