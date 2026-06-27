/**
 * Join helpers — create a brand-new (pending) member, and activate them on
 * payment. Used by /api/join (create) and the Stripe webhook (activate).
 *
 * A join creates the full entity chain BEFORE payment so the Checkout metadata
 * can carry real ids: organizations(prospect) → contacts(primary) →
 * memberships(pending) → invoices(pending). The first-dues payment is a
 * one-time charge (Phase 7 owns recurring subscriptions); the webhook records it
 * via the ledger and flips membership pending→active + org prospect→active.
 *
 * Activation is idempotent: the flip is guarded on status='pending', so a
 * redelivered webhook is a no-op and the welcome email fires exactly once.
 */

import { and, eq } from "drizzle-orm";
import type { DB } from "@/lib/db";
import { organizations, contacts, memberships, invoices } from "@/lib/db/schema";

/** kebab-case an org name for use as a slug; never empty. */
export function kebabCase(name: string): string {
  const k = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return k || "member";
}

/** Generate a unique organizations.slug from a name (-2, -3, … on collision). */
export async function generateOrgSlug(db: DB, name: string): Promise<string> {
  const base = kebabCase(name);
  let slug = base;
  let n = 1;
  // Bounded loop — a handful of collisions at most for a chamber.
  while (n < 100) {
    const [existing] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);
    if (!existing) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
  // Extremely unlikely fallback: suffix with a timestamp-free random-ish counter.
  return `${base}-${Date.now().toString(36)}`;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface CreatePendingMemberInput {
  businessName: string;
  slug: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  title?: string | null;
  website?: string | null;
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  tierId: string;
  tierName: string;
  amountCents: number;
}

export interface CreatePendingMemberResult {
  organizationId: string;
  contactId: string;
  membershipId: string;
  invoiceId: string;
}

/**
 * Insert org → contact → membership(pending) → invoice(pending) atomically.
 * The org carries the contact email/phone/site so the public listing + Stripe
 * customer (Phase 7) have something to work with.
 */
export async function createPendingMember(
  db: DB,
  input: CreatePendingMemberInput,
): Promise<CreatePendingMemberResult> {
  const today = new Date();
  // Build the renewal date from UTC parts so it agrees with isoDate()'s UTC
  // serialization — a local-time `new Date(y, m, d)` shifts the stored date by a
  // day on any non-UTC host. (A Feb-29 join normalizes to Mar-1 in a non-leap
  // year, matching addYears() used for periodEnd elsewhere.)
  const renewal = new Date(
    Date.UTC(today.getUTCFullYear() + 1, today.getUTCMonth(), today.getUTCDate()),
  );

  return db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({
        name: input.businessName,
        slug: input.slug,
        status: "prospect",
        email: input.email,
        phone: input.phone ?? null,
        websiteUrl: input.website ?? null,
        address1: input.address1 ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        zip: input.zip ?? null,
      })
      .returning({ id: organizations.id });

    const [contact] = await tx
      .insert(contacts)
      .values({
        organizationId: org.id,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone ?? null,
        title: input.title ?? null,
        isPrimaryContact: true,
      })
      .returning({ id: contacts.id });

    const [membership] = await tx
      .insert(memberships)
      .values({
        organizationId: org.id,
        tierId: input.tierId,
        status: "pending",
        billingCycle: "annual",
        startDate: isoDate(today),
        renewalDate: isoDate(renewal),
      })
      .returning({ id: memberships.id });

    const [invoice] = await tx
      .insert(invoices)
      .values({
        organizationId: org.id,
        membershipId: membership.id,
        amountCents: input.amountCents,
        status: "pending",
        description: `${input.tierName} membership — first year dues`,
      })
      .returning({ id: invoices.id });

    return {
      organizationId: org.id,
      contactId: contact.id,
      membershipId: membership.id,
      invoiceId: invoice.id,
    };
  });
}

/**
 * Flip a pending membership (and its org) to active. Idempotent: only a
 * status='pending' membership transitions, so a redelivered webhook returns
 * false and the caller skips the welcome email. Returns true iff THIS call
 * activated it.
 */
export async function activateMembership(
  db: DB,
  membershipId: string,
  organizationId: string,
): Promise<boolean> {
  const [flipped] = await db
    .update(memberships)
    .set({ status: "active", updatedAt: new Date() })
    .where(and(eq(memberships.id, membershipId), eq(memberships.status, "pending")))
    .returning({ id: memberships.id });

  if (!flipped) return false; // already active / missing → idempotent no-op

  await db
    .update(organizations)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(organizations.id, organizationId));

  return true;
}
