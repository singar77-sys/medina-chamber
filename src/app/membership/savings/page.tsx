import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Member Savings Programs",
  description:
    "Greater Medina Chamber members get exclusive access to group health insurance, workers' compensation discounts, energy savings programs, HR solutions, and recreation center memberships.",
  openGraph: {
    title: "Member Savings Programs — Greater Medina Chamber of Commerce",
    description:
      "Five member-exclusive savings programs covering health insurance, workers' comp, energy, HR, and recreation.",
  },
  alternates: { canonical: "/membership/savings" },
};

const programs = [
  {
    name: "Group Health Insurance",
    provider: "Anthem / Blue Access PPO",
    tag: "Healthcare",
    description:
      "A group health insurance plan specifically designed for small businesses in Medina, Ohio with 2–49 employees. Medically underwritten plans through the Blue Access PPO Network — includes Cleveland Clinic, Summa Health System, and University Hospitals. HSA and 80/20 options available.",
    eligibility: "Medina-based businesses with fewer than 50 full-time employees",
    howToAccess:
      "Contact the chamber for the list of participating brokers and agents. Applications are submitted via the Form Fire system.",
    contact: null,
  },
  {
    name: "Workers' Compensation Discount",
    provider: "Hunter Consulting",
    tag: "Workers' Comp",
    description:
      "Two discount levels available through the Ohio BWC group experience rating and group retrospective rating programs. Pooling through the Ohio Bureau of Workers' Compensation with periodic refunds or assessments based on group performance.",
    eligibility: "All chamber members with Ohio employees",
    howToAccess: "Contact Jeff Price directly to learn about your options.",
    contact: {
      name: "Jeff Price — Hunter Consulting",
      email: "jprice@hunterconsulting.com",
      phone: "(513) 372-8718",
    },
  },
  {
    name: "Energy & Sustainability Program",
    provider: "CEA (Chamber Energy Program)",
    tag: "Energy",
    description:
      "Energy supply solutions and efficiency improvements with access to federal, state, and local rebates and incentives. Start with a complimentary bill review — no obligation.",
    eligibility: "Open to all chamber members",
    howToAccess:
      "Email your utility bills to billreview@ceateam.com for a free review, or enroll online at chamberenergyprogram.com.",
    contact: {
      name: "CEA Team",
      email: "billreview@ceateam.com",
      phone: "(330) 208-2082",
    },
  },
  {
    name: "HR Solutions",
    provider: "VensureHR",
    tag: "Human Resources",
    description:
      "Full-service HR support including payroll, benefits administration, risk management, and HR compliance — built for businesses that need professional HR without a full in-house team.",
    eligibility: "Open to all chamber members",
    howToAccess: "Contact Don Hicks directly for a consultation.",
    contact: {
      name: "Don Hicks — VensureHR",
      email: "don.hicks@vensure.com",
      phone: "(216) 303-6756",
    },
  },
  {
    name: "Recreation Center Membership",
    provider: "Medina Community Recreation Center",
    tag: "Wellness",
    description:
      "20% discount on MCRC resident-rate membership fees for all employees of member businesses — regardless of where they live. Includes access to pools, fitness facilities, group classes, and youth programs.",
    eligibility: "All employees of chamber member businesses",
    howToAccess:
      "Mention your employer's chamber membership at the MCRC Front Desk. No paperwork required.",
    contact: null,
  },
];

export default function SavingsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <p className="text-overline text-cambridge mb-4">Membership</p>
        <h1 className="text-display">
          Savings
          <br />
          <span className="text-accent">Programs</span>
        </h1>
        <p className="text-body-lg text-text-secondary mt-6 max-w-2xl">
          Chamber membership includes exclusive access to programs that cut
          real costs — health insurance, workers' comp, energy bills, HR, and
          more. Five programs built for small and mid-sized businesses.
        </p>
      </section>

      {/* Programs */}
      <section className="mt-20 space-y-6">
        {programs.map((p) => (
          <div
            key={p.name}
            className="p-8 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <span className="text-caption text-cambridge font-bold uppercase tracking-wider">
                  {p.tag}
                </span>
                <h2 className="text-h3 mt-1">{p.name}</h2>
                <p className="text-body-sm text-text-tertiary mt-0.5">
                  via {p.provider}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-body-sm text-text-secondary leading-relaxed">
                  {p.description}
                </p>
                <div className="mt-4 p-3 bg-bg-primary border border-border-secondary rounded-[var(--radius-md)]">
                  <p className="text-caption text-text-tertiary uppercase tracking-wider mb-1">
                    Eligibility
                  </p>
                  <p className="text-body-sm text-text-primary">{p.eligibility}</p>
                </div>
              </div>

              <div>
                <p className="text-caption text-text-tertiary uppercase tracking-wider mb-2">
                  How to Access
                </p>
                <p className="text-body-sm text-text-secondary leading-relaxed">
                  {p.howToAccess}
                </p>
                {p.contact && (
                  <div className="mt-4 space-y-1.5">
                    <p className="text-body-sm font-bold text-text-primary">
                      {p.contact.name}
                    </p>
                    <a
                      href={`mailto:${p.contact.email}`}
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
          </div>
        ))}
      </section>

      {/* Not a member nudge */}
      <section className="mt-20 p-10 lg:p-16 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)]">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-h2">
              These are member-only programs.
            </h2>
            <p className="text-body-lg text-text-secondary mt-4">
              The savings programs alone can offset — or exceed — the cost of
              annual membership. Health insurance savings for even one employee
              typically covers the full membership investment.
            </p>
          </div>
          <div className="space-y-4">
            <Link
              href="/membership/join"
              className="
                block w-full text-center py-3 px-6
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
                block w-full text-center py-3 px-6
                border border-border-primary hover:border-text-tertiary
                text-text-primary font-bold text-body-sm
                rounded-[var(--radius-md)]
                transition-colors
              "
            >
              See All Member Benefits
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
