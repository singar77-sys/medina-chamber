/**
 * ledger — the write path for the immutable payments ledger.
 *
 * INVARIANT (see schema/payments.ts): payments rows are NEVER updated. A refund,
 * credit, or writeoff is a new row with a NEGATIVE amountCents. The amount paid on
 * an invoice is DERIVED: SUM(payments.amountCents) WHERE invoiceId. That sum — not
 * any running counter — is the source of truth, so we recompute it from the table
 * after every insert rather than incrementing a column.
 *
 * Idempotency: Stripe retries webhook deliveries, so the same charge/refund event
 * may arrive more than once. We guard with the UNIQUE constraints on
 * stripeChargeId / stripeRefundId: check-first on select, and also catch the
 * unique-violation on insert (the race where two deliveries land concurrently).
 * Either way we never write a duplicate ledger row.
 */

import { eq, sql } from "drizzle-orm";
import type { DB } from "@/lib/db";
import {
  payments,
  invoices,
  type paymentType,
  type paymentMethod,
} from "@/lib/db/schema";

export type PaymentType = (typeof paymentType.enumValues)[number];
export type PaymentMethod = (typeof paymentMethod.enumValues)[number];

export interface RecordPaymentInput {
  organizationId: string;
  invoiceId: string;
  type: PaymentType;
  /** Defaults to "card" when omitted. */
  method?: PaymentMethod;
  /** Negative for refund / credit / writeoff; positive for charge. */
  amountCents: number;
  stripeChargeId?: string;
  stripeRefundId?: string;
  stripePaymentMethodId?: string;
  memo?: string;
  recordedByStaffId?: string;
  occurredAt?: Date;
}

export interface RecordPaymentResult {
  paymentId: string;
  invoiceStatus: string;
  amountPaidCents: number;
  idempotentHit: boolean;
}

/**
 * Pure status derivation for the happy path. "paid" only when the invoice has a
 * positive total and is fully covered; otherwise "pending". The terminal states
 * (past_due / void / uncollectible) are owned by other code paths, not here.
 */
export function deriveInvoiceStatus(
  amountCents: number,
  amountPaidCents: number,
): "paid" | "pending" {
  if (amountCents > 0 && amountPaidCents >= amountCents) return "paid";
  return "pending";
}

// Postgres unique-violation SQLSTATE.
const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === UNIQUE_VIOLATION
  );
}

/**
 * Look up an already-recorded payment by its Stripe charge or refund id.
 * Returns the row (plus the invoice's current derived totals) or null.
 */
async function findExistingByStripeId(
  db: DB,
  input: RecordPaymentInput,
): Promise<RecordPaymentResult | null> {
  if (input.stripeChargeId) {
    const [row] = await db
      .select({ id: payments.id, invoiceId: payments.invoiceId })
      .from(payments)
      .where(eq(payments.stripeChargeId, input.stripeChargeId))
      .limit(1);
    if (row) return await buildHitResult(db, row.id, row.invoiceId);
  }
  if (input.stripeRefundId) {
    const [row] = await db
      .select({ id: payments.id, invoiceId: payments.invoiceId })
      .from(payments)
      .where(eq(payments.stripeRefundId, input.stripeRefundId))
      .limit(1);
    if (row) return await buildHitResult(db, row.id, row.invoiceId);
  }
  return null;
}

async function buildHitResult(
  db: DB,
  paymentId: string,
  invoiceId: string,
): Promise<RecordPaymentResult> {
  const [inv] = await db
    .select({
      status: invoices.status,
      amountPaidCents: invoices.amountPaidCents,
    })
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  return {
    paymentId,
    invoiceStatus: inv?.status ?? "pending",
    amountPaidCents: inv?.amountPaidCents ?? 0,
    idempotentHit: true,
  };
}

/**
 * Insert one ledger row and atomically recompute the parent invoice's paid total
 * and status. Insert + recompute happen in a single transaction so the derived
 * total can never observe a partial write.
 */
export async function recordPayment(
  db: DB,
  input: RecordPaymentInput,
): Promise<RecordPaymentResult> {
  // Fast path: if this Stripe id was already recorded, return its info.
  const preExisting = await findExistingByStripeId(db, input);
  if (preExisting) return preExisting;

  try {
    return await db.transaction(async (tx) => {
      // Lock the parent invoice for the life of the transaction FIRST. Two
      // concurrent deliveries with DIFFERENT stripe ids against the same invoice
      // (a dues charge + a manual/event charge, a retry that minted a new charge,
      // a split payment) both run at Postgres' default READ COMMITTED, so without
      // this lock each SUM would miss the other's uncommitted insert and the
      // second UPDATE would clobber the first's amountPaidCents. FOR UPDATE forces
      // the second txn to wait and re-read — same pattern as confirmEventRegistration.
      const [inv] = await tx
        .select({
          amountCents: invoices.amountCents,
          status: invoices.status,
          paidAt: invoices.paidAt,
        })
        .from(invoices)
        .where(eq(invoices.id, input.invoiceId))
        .limit(1)
        .for("update");

      if (!inv) {
        throw new Error(`invoice not found: ${input.invoiceId}`);
      }

      const [inserted] = await tx
        .insert(payments)
        .values({
          organizationId: input.organizationId,
          invoiceId: input.invoiceId,
          type: input.type,
          method: input.method ?? "card",
          amountCents: input.amountCents,
          stripeChargeId: input.stripeChargeId ?? null,
          stripeRefundId: input.stripeRefundId ?? null,
          stripePaymentMethodId: input.stripePaymentMethodId ?? null,
          memo: input.memo ?? null,
          recordedByStaffId: input.recordedByStaffId ?? null,
          ...(input.occurredAt ? { occurredAt: input.occurredAt } : {}),
        })
        .returning({ id: payments.id });

      // SUM(amountCents) over the whole invoice is the source of truth.
      const [{ sum }] = await tx
        .select({
          sum: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int`,
        })
        .from(payments)
        .where(eq(payments.invoiceId, input.invoiceId));

      const newPaidCents = sum;

      const nextStatus = deriveInvoiceStatus(inv.amountCents, newPaidCents);

      // Stamp paidAt only on the transition INTO paid — never overwrite an
      // existing paidAt, and never set it while still pending.
      const becamePaid = nextStatus === "paid" && inv.status !== "paid";

      await tx
        .update(invoices)
        .set({
          amountPaidCents: newPaidCents,
          status: nextStatus,
          ...(becamePaid ? { paidAt: new Date() } : {}),
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, input.invoiceId));

      return {
        paymentId: inserted.id,
        invoiceStatus: nextStatus,
        amountPaidCents: newPaidCents,
        idempotentHit: false,
      };
    });
  } catch (err) {
    // Concurrent duplicate delivery: another tx inserted the same Stripe id
    // between our check and our insert. Re-resolve to the now-existing row.
    if (isUniqueViolation(err)) {
      const existing = await findExistingByStripeId(db, input);
      if (existing) return existing;
    }
    throw err;
  }
}
