/**
 * Database row types inferred from the Drizzle schema.
 *
 * Select = what you get back from a SELECT query (all columns, with nulls)
 * Insert = what you pass to an INSERT (optional columns omitted or defaulted)
 *
 * Usage:
 *   import type { Organization, NewOrganization } from "@/lib/db/types";
 */

import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

import type {
  organizations,
  contacts,
  categories,
  organizationCategories,
} from "./schema/organizations";

import type {
  membershipTiers,
  memberships,
  invoices,
} from "./schema/memberships";

import type {
  events,
  eventTickets,
  eventRegistrations,
} from "./schema/events";

import type {
  emailCampaigns,
  emailSends,
} from "./schema/email";

import type {
  workflows,
  workflowSteps,
  workflowRuns,
} from "./schema/workflows";

import type {
  engagementEvents,
  syncLog,
} from "./schema/analytics";

// ── Organizations ──────────────────────────────────────────────────────────────
export type Organization    = InferSelectModel<typeof organizations>;
export type NewOrganization = InferInsertModel<typeof organizations>;

export type Contact    = InferSelectModel<typeof contacts>;
export type NewContact = InferInsertModel<typeof contacts>;

export type Category    = InferSelectModel<typeof categories>;
export type NewCategory = InferInsertModel<typeof categories>;

export type OrganizationCategory    = InferSelectModel<typeof organizationCategories>;
export type NewOrganizationCategory = InferInsertModel<typeof organizationCategories>;

// ── Memberships ────────────────────────────────────────────────────────────────
export type MembershipTier    = InferSelectModel<typeof membershipTiers>;
export type NewMembershipTier = InferInsertModel<typeof membershipTiers>;

export type Membership    = InferSelectModel<typeof memberships>;
export type NewMembership = InferInsertModel<typeof memberships>;

export type Invoice    = InferSelectModel<typeof invoices>;
export type NewInvoice = InferInsertModel<typeof invoices>;

// ── Events ─────────────────────────────────────────────────────────────────────
export type Event    = InferSelectModel<typeof events>;
export type NewEvent = InferInsertModel<typeof events>;

export type EventTicket    = InferSelectModel<typeof eventTickets>;
export type NewEventTicket = InferInsertModel<typeof eventTickets>;

export type EventRegistration    = InferSelectModel<typeof eventRegistrations>;
export type NewEventRegistration = InferInsertModel<typeof eventRegistrations>;

// ── Email ──────────────────────────────────────────────────────────────────────
export type EmailCampaign    = InferSelectModel<typeof emailCampaigns>;
export type NewEmailCampaign = InferInsertModel<typeof emailCampaigns>;

export type EmailSend    = InferSelectModel<typeof emailSends>;
export type NewEmailSend = InferInsertModel<typeof emailSends>;

// ── Workflows ──────────────────────────────────────────────────────────────────
export type Workflow    = InferSelectModel<typeof workflows>;
export type NewWorkflow = InferInsertModel<typeof workflows>;

export type WorkflowStep    = InferSelectModel<typeof workflowSteps>;
export type NewWorkflowStep = InferInsertModel<typeof workflowSteps>;

export type WorkflowRun    = InferSelectModel<typeof workflowRuns>;
export type NewWorkflowRun = InferInsertModel<typeof workflowRuns>;

// ── Analytics ──────────────────────────────────────────────────────────────────
export type EngagementEvent    = InferSelectModel<typeof engagementEvents>;
export type NewEngagementEvent = InferInsertModel<typeof engagementEvents>;

export type SyncLog    = InferSelectModel<typeof syncLog>;
export type NewSyncLog = InferInsertModel<typeof syncLog>;

// ── Re-export JSONB interface types (useful for consumers) ─────────────────────
export type {
  InvoiceLineItem,
} from "./schema/memberships";

export type {
  CampaignSegment,
} from "./schema/email";

export type {
  WorkflowActionConfig,
  SendEmailConfig,
  WaitConfig,
  UpdateMembershipConfig,
} from "./schema/workflows";
