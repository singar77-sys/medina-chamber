/**
 * Chamber staff contacts. Single source of truth for outbound mail
 * routing across the site. Update once, propagates to every CTA.
 */

export interface StaffMember {
  name: string;
  /** First name, used in casual CTA copy ("Email Stephanie Directly"). */
  shortName: string;
  title: string;
  email: string;
}

export const stephanie: StaffMember = {
  name: "Stephanie Mueller",
  shortName: "Stephanie",
  title: "Membership & Events Coordinator",
  email: "stephanie@medinaohchamber.com",
};

export const jaclyn: StaffMember = {
  name: "Jaclyn Ringstmeier",
  shortName: "Jaclyn",
  title: "Executive Director",
  email: "jaclyn@medinaohchamber.com",
};

export const chamberOffice = {
  email: "office@medinaohchamber.com",
  phone: "(330) 723-8773",
} as const;
