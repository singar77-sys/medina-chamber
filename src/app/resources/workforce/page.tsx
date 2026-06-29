import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import Link from "next/link";
import { ButtonLink, ButtonA } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Hire & Grow Your Team in Medina County, Workforce Resources",
  description:
    "Workforce resources for Medina County, Ohio employers, post jobs, access OhioMeansJobs, on-the-job training subsidies, Ohio TechCred, workplace safety programs, and the Chamber jobs board.",
  openGraph: {
    title: "Workforce & Hiring Resources, Medina County, Ohio",
    description:
      "Post jobs, find candidates, and train your workforce with Medina County employer resources, OhioMeansJobs, TechCred, JFS subsidies, Safety Council, and more.",
  },
  alternates: { canonical: "/resources/workforce" },
};

const sections = [
  {
    id: "post-jobs",
    label: "Post Jobs",
    title: "Reach Medina County job seekers",
    body: "Chamber members can post open positions on the Medina Chamber jobs board at no additional cost. Listings are visible to job seekers browsing medina-specific openings and are indexed by search engines, putting your opening in front of people actively searching for work in Medina County.",
    action: {
      label: "View Job Board",
      href: "/jobs",
      internal: true,
    },
    secondaryAction: {
      label: "Learn About Membership",
      href: "/membership/join",
      internal: true,
    },
  },
  {
    id: "ohiomeansjobs",
    label: "OhioMeansJobs",
    title: "Ohio's statewide workforce system",
    body: "OhioMeansJobs connects employers with job seekers, workforce programs, and labor market data. The Medina County OhioMeansJobs office provides free job posting, candidate referrals, and access to hiring programs specifically for Medina County employers. On-the-job training (OJT) subsidies, where the county reimburses a portion of wages while a new hire gets up to speed, are coordinated through this office.",
    action: {
      label: "OhioMeansJobs, Ohio Workforce",
      href: "https://ohiomeansjobs.ohio.gov/",
      internal: false,
    },
    secondaryAction: null,
  },
  {
    id: "techecred",
    label: "Ohio TechCred",
    title: "Reimburse your team's tech credentials",
    body: "Ohio TechCred reimburses up to $2,000 per employee per credential for tech-focused certifications and training. The program covers 150+ credentials in IT, cybersecurity, advanced manufacturing, and data. Employers apply quarterly and get reimbursed after employees complete approved credentials. There's no cap on total credentials, a business with 20 employees could receive $40,000 in a single round.",
    action: {
      label: "Apply for TechCred, Ohio",
      href: "https://techcred.ohio.gov/",
      internal: false,
    },
    secondaryAction: null,
  },
  {
    id: "incumbent-workforce",
    label: "Incumbent Workforce",
    title: "Train employees you already have",
    body: "The Ohio Incumbent Workforce Training Voucher Program provides up to $4,000 per employee for training existing workers. The program targets skills upgrades that allow businesses to increase wages or move employees into higher-productivity roles. Applications open periodically, check Ohio Development's site for current round timing.",
    action: {
      label: "Ohio Workforce Training Programs",
      href: "https://development.ohio.gov/",
      internal: false,
    },
    secondaryAction: null,
  },
  {
    id: "safety-council",
    label: "Safety Council",
    title: "Workplace safety training, included with membership",
    body: "Chamber members participate in the Medina County Safety Council at no additional charge. Monthly meetings cover workplace safety regulations, OSHA compliance, and industry-specific hazard management. Participation also qualifies members for the Ohio BWC Group Rebate Program, a percentage refund on workers' comp premiums based on group performance.",
    action: {
      label: "About the Safety Council",
      href: "/programs/safety-council",
      internal: true,
    },
    secondaryAction: null,
  },
];

const quickLinks = [
  { label: "Chamber Jobs Board", href: "/jobs", internal: true },
  { label: "OhioMeansJobs", href: "https://ohiomeansjobs.ohio.gov/", internal: false },
  { label: "Ohio TechCred", href: "https://techcred.ohio.gov/", internal: false },
  { label: "Ohio BWC", href: "https://www.bwc.ohio.gov/", internal: false },
  { label: "Ohio Development, Workforce", href: "https://development.ohio.gov/", internal: false },
  { label: "Safety Council", href: "/programs/safety-council", internal: true },
];

export default function WorkforcePage() {
  return (
    <>
      <PageHero
        overline="Business Resources"
        titleTop="Hire & Grow Your Team"
        titleAccent="in Medina County"
        subtitle="Programs to find candidates, subsidize training, and build a safer, better-equipped workforce, from the Chamber and Ohio's state workforce system."
        image="/images/photos/backgrounds/community-conversation.webp"
        breadcrumb={
          <nav className="flex items-center gap-2 text-caption text-text-tertiary">
            <Link href="/resources" className="hover:text-text-primary transition-colors">
              Resources
            </Link>
            <span>/</span>
            <span className="text-text-secondary">Workforce</span>
          </nav>
        }
      />

      <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-f55 lg:pb-f89">

      {/* Quick links strip */}
      <div className="mt-10 flex flex-wrap gap-f8">
        {quickLinks.map((l) =>
          l.internal ? (
            <Link
              key={l.label}
              href={l.href}
              className="inline-flex items-center px-4 py-2 bg-bg-secondary border border-border-secondary rounded-full text-body-sm text-text-secondary hover:border-border-primary hover:text-text-primary transition-colors"
            >
              {l.label}
            </Link>
          ) : (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-bg-secondary border border-border-secondary rounded-full text-body-sm text-text-secondary hover:border-border-primary hover:text-text-primary transition-colors"
            >
              {l.label}
            </a>
          )
        )}
      </div>

      {/* Sections */}
      <div className="mt-f55 space-y-f21">
        {sections.map((s) => (
          <div
            key={s.id}
            className="p-8 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
          >
            <span className="text-caption font-bold uppercase tracking-wider text-cambridge">
              {s.label}
            </span>
            <h2 className="text-h3 mt-2">{s.title}</h2>
            <p className="text-body text-text-secondary mt-f13 leading-relaxed max-w-3xl">
              {s.body}
            </p>
            <div className="mt-f21 flex flex-wrap gap-f8">
              {s.action.internal ? (
                <ButtonLink href={s.action.href} variant="primary" size="md">
                  {s.action.label} →
                </ButtonLink>
              ) : (
                <ButtonA
                  href={s.action.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="primary"
                  size="md"
                >
                  {s.action.label} →
                </ButtonA>
              )}
              {s.secondaryAction && (
                s.secondaryAction.internal ? (
                  <ButtonLink href={s.secondaryAction.href} variant="ghost" size="md">
                    {s.secondaryAction.label} →
                  </ButtonLink>
                ) : (
                  <ButtonA
                    href={s.secondaryAction.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="ghost"
                    size="md"
                  >
                    {s.secondaryAction.label} →
                  </ButtonA>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <section className="mt-f55 p-f34 lg:p-f55 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
        <div className="max-w-2xl">
          <h2 className="text-h2">Post your open positions free</h2>
          <p className="text-body-lg text-text-secondary mt-f13">
            Chamber members post jobs on the Medina Chamber job board at no
            extra cost. Free job postings are included in all three membership
            tiers. Join for $345/year.
          </p>
          <div className="mt-f21 flex flex-wrap gap-f13">
            <ButtonLink href="/membership/join" variant="primary" size="lg">
              Join the Chamber →
            </ButtonLink>
            <ButtonLink href="/jobs" variant="ghost" size="lg">
              Browse Job Board
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
