import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Business Grants & Funding, Medina County, Ohio",
  description:
    "Business grants, loans, and funding programs available to Medina County, Ohio businesses, SBA loans, JobsOhio incentives, USDA programs, Ohio SBDC, and Chamber savings programs.",
  openGraph: {
    title: "Business Grants & Funding in Medina County, Greater Medina Chamber",
    description:
      "State, federal, and local funding programs for Medina County small businesses, grants, loans, incentives, and free consulting.",
  },
  alternates: { canonical: "/resources/business-grants" },
};

const programs = [
  {
    category: "State of Ohio",
    items: [
      {
        name: "JobsOhio Economic Development Grant",
        description:
          "Grants and loans for projects that create or retain jobs in Ohio. JobsOhio focuses on specific industries, advanced manufacturing, technology, financial services, logistics, and healthcare. Best suited for growth-stage businesses adding significant headcount.",
        eligibility: "Job creation/retention projects in targeted industries",
        href: "https://www.jobsohio.com/",
        cta: "JobsOhio.com",
      },
      {
        name: "Ohio Department of Development Programs",
        description:
          "Ohio Development administers several small business programs including the 166 Direct Loan Program (below-market loans for fixed assets), the Innovation Ohio Loan Fund (R&D and commercialization), and various workforce training incentives.",
        eligibility: "Ohio businesses meeting program-specific criteria",
        href: "https://development.ohio.gov/",
        cta: "Ohio Development Programs",
      },
      {
        name: "Ohio TechCred",
        description:
          "Employer reimbursements of up to $2,000 per credential for employees completing tech-focused certifications. Covers 150+ credentials in IT, advanced manufacturing, and cybersecurity. Businesses apply each quarter.",
        eligibility: "Ohio employers with at least one Ohio employee",
        href: "https://techcred.ohio.gov/",
        cta: "TechCred Program",
      },
      {
        name: "Ohio Third Frontier",
        description:
          "Grant programs targeting Ohio technology companies and research commercialization, particularly for startups and companies with a tech or manufacturing R&D component.",
        eligibility: "Ohio tech and innovation-focused businesses",
        href: "https://thirdfrontier.com/",
        cta: "Ohio Third Frontier",
      },
    ],
  },
  {
    category: "Federal Programs",
    items: [
      {
        name: "SBA 7(a) Loan Program",
        description:
          "The most common SBA loan, up to $5 million for working capital, equipment, real estate, and debt refinancing. Government-guaranteed through local lenders. Rates and terms are more favorable than conventional small business loans.",
        eligibility: "For-profit small businesses meeting SBA size standards",
        href: "https://www.sba.gov/funding-programs/loans/7a-loans",
        cta: "SBA 7(a) Details",
      },
      {
        name: "SBA 504 Loan Program",
        description:
          "Long-term, fixed-rate financing for major fixed assets, real estate and heavy equipment. Typically structured as 50% conventional lender / 40% SBA / 10% borrower. Designed for expansion projects.",
        eligibility: "Businesses with tangible net worth under $15M and net income under $5M",
        href: "https://www.sba.gov/funding-programs/loans/504-loans",
        cta: "SBA 504 Details",
      },
      {
        name: "USDA Rural Development, Business Programs",
        description:
          "USDA offers several programs for businesses in rural areas of Ohio, including the Business & Industry (B&I) Loan Guarantee and the Rural Energy for America Program (REAP), energy efficiency grants for agricultural and rural businesses.",
        eligibility: "Businesses in rural areas (population under 50,000); parts of Medina County qualify",
        href: "https://www.rd.usda.gov/about-rd/state-offices/ohio",
        cta: "USDA Rural Development Ohio",
      },
      {
        name: "SBA Microloan Program",
        description:
          "Loans up to $50,000 for very small businesses and startups that may not qualify for traditional financing. Delivered through local nonprofit intermediaries, often with business training included.",
        eligibility: "Startups and small businesses with limited credit history",
        href: "https://www.sba.gov/funding-programs/loans/microloans",
        cta: "SBA Microloan Details",
      },
    ],
  },
  {
    category: "Free Consulting & Local Resources",
    items: [
      {
        name: "Ohio Small Business Development Center (SBDC)",
        description:
          "The SBDC provides free, one-on-one consulting for businesses at any stage. They help you identify what funding you actually qualify for, build the application, and structure the financials. Many businesses find the consulting more valuable than any single grant.",
        eligibility: "Open to all Ohio businesses and startups",
        href: "https://www.ohiosbdc.org/",
        cta: "Find Your Local SBDC",
      },
      {
        name: "SCORE Northeast Ohio",
        description:
          "Free mentoring from retired executives and business owners. SCORE mentors can help with grant applications, financial modeling, and connecting you to the right programs.",
        eligibility: "Open to all small business owners",
        href: "https://www.score.org/find-location",
        cta: "Find a SCORE Mentor",
      },
      {
        name: "Medina County Economic Development",
        description:
          "The county's economic development office works with businesses on site selection, local incentives, and navigating county-specific programs. Contact them directly to learn about programs targeted at Medina County.",
        eligibility: "Businesses locating or expanding in Medina County",
        href: null,
        cta: null,
      },
    ],
  },
];

export default function BusinessGrantsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-caption text-text-tertiary mb-10">
        <Link href="/resources" className="hover:text-text-primary transition-colors">
          Resources
        </Link>
        <span>/</span>
        <span className="text-text-secondary">Business Grants & Funding</span>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Business Resources</p>
        <h1 className="text-display">
            <span className="block">Business Grants &amp;</span>
            <span className="block text-accent">Funding in Medina County</span>
          </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          State, federal, and local programs that help Medina County businesses
          start, grow, and hire.
        </p>
      </section>

      {/* Honest framing callout */}
      <div className="mt-12 p-6 bg-bg-secondary border border-cambridge/20 rounded-[var(--radius-lg)]">
        <p className="text-body font-bold text-text-primary mb-2">
          A note on grants vs. loans
        </p>
        <p className="text-body-sm text-text-secondary leading-relaxed">
          True grants, money you don&apos;t repay, are rare for general small
          businesses. Most &ldquo;business funding&rdquo; programs are
          government-backed loans with favorable rates, tax credits, or
          workforce incentives. The programs below are legitimate and worth
          pursuing. A good first step is contacting the Ohio SBDC, they&apos;ll
          help you figure out what you actually qualify for before you spend time
          on applications.
        </p>
      </div>

      {/* Programs by category */}
      <div className="mt-16 space-y-16">
        {programs.map((group) => (
          <section key={group.category}>
            <p className="text-overline text-cambridge mb-8">{group.category}</p>
            <div className="space-y-6">
              {group.items.map((item) => (
                <div
                  key={item.name}
                  className="p-8 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
                >
                  <div className="grid md:grid-cols-[1fr_auto] gap-6 items-start">
                    <div>
                      <h2 className="text-h3">{item.name}</h2>
                      <p className="text-body text-text-secondary mt-3 leading-relaxed">
                        {item.description}
                      </p>
                      <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-bg-primary border border-border-secondary rounded-[var(--radius-sm)]">
                        <span className="text-caption text-text-tertiary uppercase tracking-wider font-bold">
                          Eligibility:
                        </span>
                        <span className="text-body-sm text-text-secondary">
                          {item.eligibility}
                        </span>
                      </div>
                    </div>
                    {item.href && item.cta && (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center px-5 py-2.5 border border-border-primary hover:border-text-tertiary text-text-primary font-bold text-body-sm rounded-[var(--radius-md)] transition-colors whitespace-nowrap"
                      >
                        {item.cta} →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Chamber savings as alternative */}
      <section className="mt-20 p-10 lg:p-16 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <p className="text-overline text-cambridge mb-3">Chamber Membership</p>
            <h2 className="text-h2">Savings that don&apos;t require an application</h2>
            <p className="text-body-lg text-text-secondary mt-4 leading-relaxed">
              Chamber membership includes access to group health insurance,
              workers&apos; comp discount programs, energy savings, and HR
              solutions. For many small businesses, the savings on these programs
              outweigh any grant they&apos;d qualify for, and there&apos;s no
              competitive application.
            </p>
            <div className="mt-8 space-y-4">
              <Link
                href="/membership/savings"
                className="block w-full text-center py-3 px-6 bg-accent hover:bg-accent-hover text-white font-bold text-body-sm rounded-[var(--radius-md)] transition-colors"
              >
                View Savings Programs →
              </Link>
              <Link
                href="/membership/join"
                className="block w-full text-center py-3 px-6 border border-border-primary hover:border-text-tertiary text-text-primary font-bold text-body-sm rounded-[var(--radius-md)] transition-colors"
              >
                Join the Chamber, from $345/year →
              </Link>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { name: "Group Health Insurance", detail: "Anthem Blue Access PPO for businesses with 2–49 employees" },
              { name: "Workers' Comp Discounts", detail: "BWC group rating through Hunter Consulting" },
              { name: "Energy Program", detail: "Free bill review, efficiency rebates, supply savings" },
              { name: "HR Solutions", detail: "Payroll, compliance, and benefits admin through VensureHR" },
              { name: "Recreation Center", detail: "20% discount for all employees of member businesses" },
            ].map((s) => (
              <div
                key={s.name}
                className="flex items-start gap-3 p-4 bg-bg-primary border border-border-secondary rounded-[var(--radius-md)]"
              >
                <svg className="w-4 h-4 shrink-0 mt-0.5 text-cambridge" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <div>
                  <p className="text-body-sm font-bold text-text-primary">{s.name}</p>
                  <p className="text-caption text-text-tertiary mt-0.5">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
