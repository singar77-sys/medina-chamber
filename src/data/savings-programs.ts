/**
 * Member-exclusive savings programs offered through chamber partnerships.
 * Edit this file to add or update programs. The /membership/savings page
 * renders these in order.
 *
 * Vendor contacts here are partner contacts (not chamber staff). For
 * chamber staff use src/data/staff.ts instead.
 */

export interface VendorContact {
  name: string;
  email: string;
  phone: string;
}

export interface SavingsProgram {
  /** Unique slug for stable React keys and section anchors. */
  slug: string;
  name: string;
  /** Service-provider partner shown on the card subhead. */
  provider: string;
  /** Short pill tag, e.g. "Healthcare", "Energy". */
  tag: string;
  description: string;
  eligibility: string;
  /** Plain-prose instructions for accessing the benefit. */
  howToAccess: string;
  /** Direct partner contact, when applicable. */
  contact: VendorContact | null;
}

export const savingsPrograms: SavingsProgram[] = [
  {
    slug: "group-health-insurance",
    name: "Group Health Insurance",
    provider: "Anthem / Blue Access PPO",
    tag: "Healthcare",
    description:
      "A group health insurance plan specifically designed for small businesses in Medina, Ohio with 2–49 employees. Medically underwritten plans through the Blue Access PPO Network, includes Cleveland Clinic, Summa Health System, and University Hospitals. HSA and 80/20 options available.",
    eligibility: "Medina-based businesses with fewer than 50 full-time employees",
    howToAccess:
      "Contact the chamber for the list of participating brokers and agents. Applications are submitted via the Form Fire system.",
    contact: null,
  },
  {
    slug: "workers-comp",
    name: "Workers' Compensation Discount",
    provider: "Hunter Consulting",
    tag: "Workers' Comp",
    description:
      "Two discount levels available through the Ohio BWC group experience rating and group retrospective rating programs. Pooling through the Ohio Bureau of Workers' Compensation with periodic refunds or assessments based on group performance.",
    eligibility: "All chamber members with Ohio employees",
    howToAccess: "Contact Jeff Price directly to learn about your options.",
    contact: {
      name: "Jeff Price, Hunter Consulting",
      email: "jprice@hunterconsulting.com",
      phone: "(513) 372-8718",
    },
  },
  {
    slug: "energy-sustainability",
    name: "Energy & Sustainability Program",
    provider: "CEA (Chamber Energy Program)",
    tag: "Energy",
    description:
      "Energy supply solutions and efficiency improvements with access to federal, state, and local rebates and incentives. Start with a complimentary bill review, no obligation.",
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
    slug: "hr-solutions",
    name: "HR Solutions",
    provider: "VensureHR",
    tag: "Human Resources",
    description:
      "Full-service HR support including payroll, benefits administration, risk management, and HR compliance, built for businesses that need professional HR without a full in-house team.",
    eligibility: "Open to all chamber members",
    howToAccess: "Contact Don Hicks directly for a consultation.",
    contact: {
      name: "Don Hicks, VensureHR",
      email: "don.hicks@vensure.com",
      phone: "(216) 303-6756",
    },
  },
  {
    slug: "recreation-center",
    name: "Recreation Center Membership",
    provider: "Medina Community Recreation Center",
    tag: "Wellness",
    description:
      "20% discount on MCRC resident-rate membership fees for all employees of member businesses, regardless of where they live. Includes access to pools, fitness facilities, group classes, and youth programs.",
    eligibility: "All employees of chamber member businesses",
    howToAccess:
      "Mention your employer's chamber membership at the MCRC Front Desk. No paperwork required.",
    contact: null,
  },
];
