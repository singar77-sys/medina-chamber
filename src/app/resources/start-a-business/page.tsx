import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How to Start a Business in Medina County, Ohio",
  description:
    "Step-by-step guide to starting a business in Medina County, Ohio. Register your LLC, get your EIN, obtain licenses, and connect with local resources, from the Greater Medina Chamber of Commerce.",
  openGraph: {
    title: "How to Start a Business in Medina County, Greater Medina Chamber",
    description:
      "Everything you need to launch a business in Medina County, Ohio, structure, registration, licenses, taxes, and local resources.",
  },
  alternates: { canonical: "/resources/start-a-business" },
};

const steps = [
  {
    number: "01",
    title: "Choose your business structure",
    body: "Your structure determines liability, taxation, and paperwork. Most Medina County small businesses choose between sole proprietorship, LLC, S-Corp, or C-Corp. An LLC is the most common starting point, it separates personal and business liability without the complexity of a corporation.",
    resource: {
      label: "Ohio Business Structures Overview, Ohio SOS",
      href: "https://www.ohiosos.gov/businesses/",
    },
  },
  {
    number: "02",
    title: "Register with the Ohio Secretary of State",
    body: "LLCs, corporations, and partnerships must register with the Ohio Secretary of State. Sole proprietors operating under their own name don't need to register, but if you're using a trade name (DBA) you'll need to file a Fictitious Name Registration. Filing fees start at $99 for an LLC.",
    resource: {
      label: "File Online, Ohio Secretary of State",
      href: "https://www.ohiosos.gov/businesses/",
    },
  },
  {
    number: "03",
    title: "Get your federal EIN",
    body: "An Employer Identification Number (EIN) is your business's federal tax ID, required for hiring employees, opening a business bank account, and filing taxes. It's free and takes about 5 minutes to get online through the IRS.",
    resource: {
      label: "Apply for an EIN, IRS",
      href: "https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online",
    },
  },
  {
    number: "04",
    title: "Register for Ohio taxes",
    body: "If you're selling taxable goods or services, you need a vendor's license from the Ohio Department of Taxation (free to obtain). If you'll have employees, you'll also need to register for Ohio employer withholding. Both are handled through the Ohio Business Gateway.",
    resource: {
      label: "Ohio Business Gateway, Tax Registration",
      href: "https://tax.ohio.gov/",
    },
  },
  {
    number: "05",
    title: "Obtain local and industry-specific licenses",
    body: "Medina City and Medina County may require a local business license depending on your type of business and location. Certain industries, contractors, food service, childcare, healthcare, real estate, require state-level professional licenses. Check with the Ohio Department of Commerce and your specific licensing board.",
    resource: {
      label: "Ohio License Center, Ohio Dept. of Commerce",
      href: "https://com.ohio.gov/",
    },
  },
  {
    number: "06",
    title: "Set up workers' compensation if you're hiring",
    body: "Ohio is a state-fund workers' comp state, most employers are required to carry coverage through the Ohio BWC. Coverage must be in place before your first employee's first day. Chamber members get access to BWC group discount programs that can significantly reduce your premiums.",
    resource: {
      label: "Get Coverage, Ohio BWC",
      href: "https://www.bwc.ohio.gov/",
    },
  },
  {
    number: "07",
    title: "Open a business bank account",
    body: "Keep personal and business finances separate from day one. You'll need your EIN and business registration documents. Several banks and credit unions in Medina County offer small business checking accounts, shop for fee structure and online banking capabilities that match how you'll operate.",
    resource: null,
  },
  {
    number: "08",
    title: "Connect with local business resources",
    body: "You don't have to figure this out alone. Medina County has free and low-cost resources specifically for new business owners, from one-on-one consulting to financing tools.",
    resource: null,
    localResources: [
      {
        name: "Ohio Small Business Development Center (SBDC)",
        description: "Free one-on-one consulting for startups and existing businesses. The SBDC helps with business plans, financial projections, licensing, and funding, at no cost.",
      },
      {
        name: "Medina County Economic Development",
        description: "Local economic development office with resources on site selection, incentives, and county-specific business climate information.",
      },
      {
        name: "Team NEO",
        description: "Northeast Ohio's regional economic development organization, labor market data, site selection, and industry intelligence for the region.",
        href: "https://www.teamneo.org/",
      },
      {
        name: "SCORE Northeast Ohio",
        description: "Free mentoring from experienced executives and business owners. SCORE has chapters serving Medina County with both in-person and remote sessions.",
        href: "https://www.score.org/find-location",
      },
    ],
  },
  {
    number: "09",
    title: "Join the Greater Medina Chamber of Commerce",
    body: "Membership gives you an online directory listing seen by every business in the county, access to networking events, advocacy at the local and state level, and savings programs that often more than cover the membership cost. Plus a dedicated onboarding session with Chamber staff.",
    resource: {
      label: "Apply for Membership, from $345/year",
      href: "/membership/join",
      internal: true,
    },
  },
];

const faqs = [
  {
    q: "Do I need a business license in Medina, Ohio?",
    a: "Medina City requires a business registration for businesses operating within city limits. Requirements vary by township and village, check with your local municipality. Some industries (contractors, food service, childcare) also require state licenses regardless of location.",
  },
  {
    q: "How long does it take to start an LLC in Ohio?",
    a: "Online filings with the Ohio Secretary of State are typically processed in 1–3 business days. Expedited processing is available for a fee. Getting your EIN from the IRS takes about 5 minutes online. Most new businesses are legally operational within a week.",
  },
  {
    q: "Do I need a lawyer to start a business in Ohio?",
    a: "Not required, but often worth it for partnerships, complex structures, or any business with significant liability exposure. The Ohio SBDC can help you understand your options, for free, before you decide whether to engage an attorney.",
  },
  {
    q: "What's the difference between an LLC and sole proprietorship?",
    a: "A sole proprietorship is the default if you do business without registering, simple, but your personal assets are exposed to business liability. An LLC creates a legal separation between you and the business. Most small business advisors recommend starting as an LLC.",
  },
];

export default function StartABusinessPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-caption text-text-tertiary mb-10">
        <Link href="/resources" className="hover:text-text-primary transition-colors">
          Resources
        </Link>
        <span>/</span>
        <span className="text-text-secondary">Start a Business</span>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Business Resources</p>
        <h1 className="text-display">
            <span className="block">Start a Business in</span>
            <span className="block text-accent">Medina County</span>
          </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          A practical step-by-step guide to launching a business in Medina
          County, Ohio, from choosing a structure to getting your first
          customer.
        </p>
      </section>

      {/* Steps */}
      <section className="mt-20 space-y-6">
        {steps.map((step) => (
          <div
            key={step.number}
            className="p-8 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
          >
            <div className="flex items-start gap-6">
              <span className="text-display font-bold text-cambridge/30 leading-none shrink-0 hidden sm:block">
                {step.number}
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="text-h3">{step.title}</h2>
                <p className="text-body text-text-secondary mt-3 leading-relaxed">
                  {step.body}
                </p>

                {"localResources" in step && step.localResources && (
                  <div className="mt-6 grid sm:grid-cols-2 gap-4">
                    {step.localResources.map((r) => (
                      <div
                        key={r.name}
                        className="p-4 bg-bg-primary border border-border-secondary rounded-[var(--radius-md)]"
                      >
                        <p className="text-body-sm font-bold text-text-primary">
                          {r.name}
                        </p>
                        <p className="text-body-sm text-text-secondary mt-1 leading-relaxed">
                          {r.description}
                        </p>
                        {"href" in r && r.href && (
                          <a
                            href={r.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
                          >
                            Visit site →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {step.resource && (
                  <div className="mt-4">
                    {"internal" in step.resource && step.resource.internal ? (
                      <Link
                        href={step.resource.href}
                        className="inline-flex items-center gap-2 text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
                      >
                        {step.resource.label} →
                      </Link>
                    ) : (
                      <a
                        href={step.resource.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-body-sm font-bold text-cambridge hover:text-cambridge/80 transition-colors"
                      >
                        {step.resource.label} →
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* FAQ */}
      <section className="mt-24 max-w-3xl">
        <p className="text-overline text-cambridge mb-3">Common Questions</p>
        <h2 className="text-h2">Before you file</h2>
        <div className="mt-10 space-y-8">
          {faqs.map((faq) => (
            <div key={faq.q}>
              <h3 className="text-h4">{faq.q}</h3>
              <p className="text-body text-text-secondary mt-2 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-20 p-10 lg:p-16 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-h2">Ready to launch in Medina County?</h2>
            <p className="text-body-lg text-text-secondary mt-4">
              The Chamber is your first connection to the Medina County business
              community. Directory listing, networking events, savings programs,
              and a dedicated onboarding session, from $345 a year.
            </p>
          </div>
          <div className="space-y-4">
            <Link
              href="/membership/join"
              className="block w-full text-center py-4 px-6 bg-accent hover:bg-accent-hover text-white font-bold text-body rounded-[var(--radius-md)] transition-colors"
            >
              Apply for Membership →
            </Link>
            <Link
              href="/resources/business-grants"
              className="block w-full text-center py-3 px-6 border border-border-primary hover:border-text-tertiary text-text-primary font-bold text-body-sm rounded-[var(--radius-md)] transition-colors"
            >
              Explore Funding & Grants →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
