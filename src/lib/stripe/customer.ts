/**
 * ensureStripeCustomer — idempotently link an organization to a Stripe customer.
 *
 * If the org already has a stripeCustomerId we return it untouched. Otherwise we
 * create exactly one Stripe customer, persist its id, and return it. The unique
 * constraint on organizations.stripeCustomerId is the backstop: this function is
 * the single writer of that column, so a given org never gets a second customer.
 */

import { eq } from "drizzle-orm";
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

  await db
    .update(organizations)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(organizations.id, organizationId));

  return customer.id;
}
