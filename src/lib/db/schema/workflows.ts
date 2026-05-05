/**
 * workflows       — automation rules (renewal sequences, welcome flows, dunning)
 * workflow_steps  — ordered actions within a workflow
 * workflow_runs   — execution log per-org per-trigger
 *
 * Executed by Inngest — durable, serverless, survives cold starts.
 */

import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizations, contacts } from "./organizations";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SendEmailConfig {
  templateId?: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  htmlBody: string;
}

export interface WaitConfig {
  hours: number;
}

export interface UpdateMembershipConfig {
  status: string;
}

export type WorkflowActionConfig =
  | { type: "send_email"; config: SendEmailConfig }
  | { type: "wait"; config: WaitConfig }
  | { type: "create_task"; config: { description: string } }
  | { type: "update_membership"; config: UpdateMembershipConfig };

// ── Enums ──────────────────────────────────────────────────────────────────────

export const workflowTrigger = pgEnum("workflow_trigger", [
  "member_joined",            // new membership activated
  "renewal_approaching_30d",  // 30 days before renewal date
  "renewal_approaching_14d",
  "renewal_approaching_7d",
  "renewal_due",              // renewal date reached, no payment
  "payment_failed",           // Stripe payment_intent.payment_failed
  "payment_recovered",        // payment caught up after failure
  "membership_lapsed",        // grace period expired
  "event_registered",         // contact registered for an event
  "event_attended",           // contact checked in at an event
  "member_inactive_90d",      // no engagement events in 90 days
  "member_portal_claimed",    // contact claimed their portal account
]);

export const workflowActionType = pgEnum("workflow_action_type", [
  "send_email",
  "wait",
  "create_task",
  "add_tag",
  "update_membership_status",
]);

export const workflowRunStatus = pgEnum("workflow_run_status", [
  "running",
  "completed",
  "failed",
  "cancelled",
]);

// ── workflows ──────────────────────────────────────────────────────────────────

export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),

  name: text("name").notNull(),
  description: text("description"),
  trigger: workflowTrigger("trigger").notNull(),

  // Only runs when this filter matches (null = always)
  tierFilter: text("tier_filter"), // e.g. "gold" — only for gold members

  isActive: boolean("is_active").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── workflow_steps ─────────────────────────────────────────────────────────────

export const workflowSteps = pgTable("workflow_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id, { onDelete: "cascade" }),

  stepOrder: integer("step_order").notNull(),
  actionType: workflowActionType("action_type").notNull(),
  actionConfig: jsonb("action_config").$type<WorkflowActionConfig>(),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── workflow_runs ──────────────────────────────────────────────────────────────

export const workflowRuns = pgTable("workflow_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id),
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "cascade",
  }),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),

  status: workflowRunStatus("status").notNull().default("running"),
  currentStep: integer("current_step").notNull().default(0),

  // Inngest function ID for cancellation
  inngestRunId: text("inngest_run_id"),

  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),

  error: text("error"),

  // Context passed to the workflow at trigger time
  context: jsonb("context").$type<Record<string, unknown>>(),
});

// ── Relations ──────────────────────────────────────────────────────────────────

export const workflowsRelations = relations(workflows, ({ many }) => ({
  steps: many(workflowSteps),
  runs: many(workflowRuns),
}));

export const workflowStepsRelations = relations(workflowSteps, ({ one }) => ({
  workflow: one(workflows, {
    fields: [workflowSteps.workflowId],
    references: [workflows.id],
  }),
}));

export const workflowRunsRelations = relations(workflowRuns, ({ one }) => ({
  workflow: one(workflows, {
    fields: [workflowRuns.workflowId],
    references: [workflows.id],
  }),
  organization: one(organizations, {
    fields: [workflowRuns.organizationId],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [workflowRuns.contactId],
    references: [contacts.id],
  }),
}));
