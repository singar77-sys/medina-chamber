import type { Metadata } from "next";
import Link from "next/link";

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
];

export default function ResourcesPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Greater Medina Chamber</p>
        <h1 className="text-display">
          Business Resources
          <br />
          <span className="text-accent">for Medina County</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          Practical guides to the programs, registrations, and funding sources
          available to businesses starting or growing in Medina County, Ohio.
        </p>
      </section>

      {/* Resource cards */}
      <section className="mt-20 grid md:grid-cols-3 gap-6">
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
              className="block w-full text-center py-3 px-6 border border-border-primary hover:border-text-tertiary text-text-primary font-bold text-body-sm rounded-[var(--radius-md)] transition-colors"
            >
              See Member Benefits
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
