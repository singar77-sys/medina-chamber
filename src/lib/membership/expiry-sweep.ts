/**
 * Expiry sweep for abandoned self-serve joins.
 *
 * /api/join writes the full entity chain BEFORE payment so the Stripe Checkout
 * metadata can carry real ids:
 *   organizations(prospect) → contacts → memberships(pending) → invoices(pending)
 * When a visitor abandons checkout (or a bot probes the endpoint), those rows
 * persist forever. Two harms this sweep undoes:
 *
 *   1. Email lockout — contacts.email is UNIQUE, so a stranded pending row holds
 *      the applicant's email hostage; the real owner gets a 409 and can never join.
 *   2. Junk accumulation — every attempt writes 4 rows.
 *
 * An org is swept only when it is unmistakably an abandoned join AND old enough
 * that no payment can still arrive:
 *
 *   • status = 'prospect'                  — joins start here; a paid join → 'active'
 *   • gz_id IS NULL                        — NOT a GrowthZone-synced prospect
 *   • deleted_at IS NULL                   — never touch soft-deleted rows
 *   • its only membership(s) are 'pending' — any non-pending membership excludes it
 *   • no paid / partially-paid invoice and no ledger payment at all
 *   • created_at older than the cutoff (default 48h)
 *
 * Why 48h and not 24h: Stripe Checkout sessions expire 24h after creation (the
 * join route doesn't override expires_at), so once an org is >48h old its session
 * is long dead and no payment_intent.succeeded webhook can ever fire for it. That
 * makes the sweep race-free against activation — by the time a row qualifies, the
 * only thing that could have rescued it (a completed payment) is impossible.
 *
 * Deletion order mirrors the checkout-failure cleanup in /api/join: invoices have
 * NO onDelete cascade to organizations (and payments reference invoices), so the
 * invoice rows must go first; deleting the org then cascades its contacts +
 * memberships. The org delete re-asserts status='prospect' as defense-in-depth
 * against a row flipping to active between the SELECT and the DELETE.
 *
 * Idempotent + safe to re-run: a run with no qualifying orgs is a single read and
 * a no-op (no transaction is opened).
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import { db, type DB } from "@/lib/db";
import { organizations, invoices } from "@/lib/db/schema";

/** Abandoned joins older than this are eligible for sweeping. See the file header
 *  for why 48h is the race-safe floor (Stripe Checkout sessions die at 24h). */
export const DEFAULT_ABANDONED_JOIN_TTL_HOURS = 48;

export interface SweepResult {
  /** Orgs that matched the abandoned-join predicate. */
  candidates: number;
  /** Orgs actually deleted (≤ candidates if a TOCTOU flip left one out). */
  orgsDeleted: number;
  cutoffHours: number;
  durationMs: number;
}

/**
 * Delete abandoned, unpaid self-serve joins older than `olderThanHours`
 * (default 48h). Returns counts for the cron log. Accepts an injected `database`
 * so the orchestration is unit-testable without a live Postgres.
 */
export async function sweepAbandonedJoins(
  database: DB = db,
  opts: { olderThanHours?: number } = {},
): Promise<SweepResult> {
  const started = Date.now();
  const cutoffHours = opts.olderThanHours ?? DEFAULT_ABANDONED_JOIN_TTL_HOURS;

  const rows = (await database.execute(sql`
    SELECT o.id AS id
    FROM organizations o
    WHERE o.status = 'prospect'
      AND o.gz_id IS NULL
      AND o.deleted_at IS NULL
      AND o.created_at < now() - make_interval(hours => ${cutoffHours}::int)
      AND EXISTS (
        SELECT 1 FROM memberships m
        WHERE m.organization_id = o.id AND m.status = 'pending'
      )
      AND NOT EXISTS (
        SELECT 1 FROM memberships m
        WHERE m.organization_id = o.id AND m.status <> 'pending'
      )
      AND NOT EXISTS (
        SELECT 1 FROM invoices i
        WHERE i.organization_id = o.id
          AND (i.status = 'paid' OR i.amount_paid_cents > 0)
      )
      AND NOT EXISTS (
        SELECT 1 FROM payments p WHERE p.organization_id = o.id
      )
  `)) as Array<{ id: string }>;

  const orgIds = rows.map((r) => r.id);
  if (orgIds.length === 0) {
    return {
      candidates: 0,
      orgsDeleted: 0,
      cutoffHours,
      durationMs: Date.now() - started,
    };
  }

  // Invoices have no cascade to organizations (and payments reference invoices),
  // so delete invoices first; deleting the org then cascades its contacts +
  // memberships. Re-assert status='prospect' so any row that flipped to active
  // between the SELECT above and here is left untouched.
  const orgsDeleted = await database.transaction(async (tx) => {
    await tx.delete(invoices).where(inArray(invoices.organizationId, orgIds));
    const removed = await tx
      .delete(organizations)
      .where(
        and(inArray(organizations.id, orgIds), eq(organizations.status, "prospect")),
      )
      .returning({ id: organizations.id });
    return removed.length;
  });

  return {
    candidates: orgIds.length,
    orgsDeleted,
    cutoffHours,
    durationMs: Date.now() - started,
  };
}
