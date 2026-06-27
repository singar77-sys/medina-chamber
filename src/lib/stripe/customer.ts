/**
 * ensureStripeCustomer — idempotently link an organization to a Stripe customer.
 *
 * If the org already has a stripeCustomerId we return it untouched. Otherwise we
 * create a Stripe customer and persist it with a guarded conditional UPDATE (only
 * when stripeCustomerId IS NULL). Two concurrent callers each create a customer,
 * but only the first write wins; the loser re-reads the winner's id and deletes
 * its now-orphaned customer. The .unique() constraint can't help here — the two
 * racing writes hold DIFFERENT ids, so it never fires.
 */

import { and, eq, isNull } from "drizzle-orm";
import type { DB } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { stripe } from "./client";

export async function ensureStripeCustomer(
  db: DB,
  organizationId: string,
): Promise<string> {
  const [org] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      email: organizations.email,
      gzId: organizations.gzId,
      stripeCustomerId: organizations.stripeCustomerId,
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) {
    throw new Error(`organization not found: ${organizationId}`);
  }

  // Already linked — never create a second customer.
  if (org.stripeCustomerId) {
    return org.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    name: org.name,
    email: org.email ?? undefined,
    metadata: {
      organizationId: org.id,
      gzId: org.gzId ?? "",
    },
  });

  // Persist only if no id was set in the meantime. A concurrent call may have won
  // the race and written a DIFFERENT customer id (so the unique constraint never
  // fires) — guard the write and clean up the loser's orphan.
  const [linked] = await db
    .update(organizations)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(and(eq(organizations.id, organizationId), isNull(organizations.stripeCustomerId)))
    .returning({ stripeCustomerId: organizations.stripeCustomerId });

  if (linked?.stripeCustomerId) return linked.stripeCustomerId;

  // Lost the race: another call already linked a customer. Delete the duplicate we
  // just created (best-effort) and return the winner's id.
  try {
    await stripe.customers.del(customer.id);
  } catch (err) {
    console.error(`[stripe] failed to delete orphaned customer ${customer.id}:`, err);
  }
  const [current] = await db
    .select({ stripeCustomerId: organizations.stripeCustomerId })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  return current?.stripeCustomerId ?? customer.id;
}
