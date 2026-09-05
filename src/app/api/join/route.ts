/**
 * POST /api/join — self-serve membership join + first-dues payment.
 *
 * Rebuilds the old email-only apply flow into: validate → create the member
 * (organizations prospect → contacts → memberships pending → invoices pending)
 * → Stripe Checkout for the first year's dues. The webhook (type:"join") records
 * the payment and activates the membership.
 *
 * Runtime: nodejs (postgres-js + Stripe need a socket). force-dynamic: writes on
 * every call. Anti-spam (honeypot + timing + rate-limit-before-parse + silent
 * 200 on bot) is preserved verbatim from /api/apply — do not weaken it.
 */

import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { and, eq, gt } from "drizzle-orm";
import { joinLimiter, applyRateLimit } from "@/lib/rate-limit";
import { readJsonBounded } from "@/lib/body-limit";
import { EMAIL_RE } from "@/lib/email";
import { pickString, pickOptional } from "@/lib/sanitize";
import { db } from "@/lib/db";
import { getSiteOrigin } from "@/lib/site-url";
import {
  contacts,
  membershipTiers,
  invoices,
  organizations,
} from "@/lib/db/schema";
import { stripe } from "@/lib/stripe/client";
import {
  createPendingMember,
  generateOrgSlug,
  type CreatePendingMemberResult,
} from "@/lib/membership/join";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_FILL_MS = 1500;

const MAX = {
  businessName: 200,
  firstName: 100,
  lastName: 100,
  title: 150,
  email: 320,
  phone: 50,
  website: 500,
  address1: 200,
  city: 100,
  state: 50,
  zip: 20,
};

export async function POST(req: NextRequest): Promise<Response> {
  // Dormant pre-cutover: this internal Stripe transaction endpoint must not be
  // publicly invokable while GrowthZone remains the live system of record. Behave
  // as if the route doesn't exist (404) before any DB write or Stripe call.
  if (process.env.INTERNAL_TRANSACTIONS_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const limited = await applyRateLimit(req, joinLimiter);
  if (limited) return limited;

  const bounded = await readJsonBounded(req);
  if ("response" in bounded) return bounded.response;
  const body = bounded.body;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const raw = body as Record<string, unknown>;

  // Honeypot + timing — silent 200 on a bot, never touching the DB or Stripe.
  const honeypot = typeof raw.website_confirm === "string" ? raw.website_confirm.trim() : "";
  const formLoadedAt = typeof raw.formLoadedAt === "number" ? raw.formLoadedAt : 0;
  // fillMs >= 0: a negative gap means the visitor's device clock runs ahead of
  // the server's — a real human, not a bot (same guard as the contact route).
  const fillMs = Date.now() - formLoadedAt;
  if (honeypot || (formLoadedAt > 0 && fillMs >= 0 && fillMs < MIN_FILL_MS)) {
    Sentry.captureMessage("join form rejected by honeypot/timing", {
      level: "info",
      tags: { route: "join", phase: "honeypot" },
      extra: { honeypotFilled: Boolean(honeypot), fillMs },
    });
    return NextResponse.json({ success: true });
  }

  const businessName = pickString(raw.businessName, MAX.businessName);
  const firstName = pickString(raw.firstName, MAX.firstName);
  const lastName = pickString(raw.lastName, MAX.lastName);
  const email = (pickString(raw.email, MAX.email) ?? "").toLowerCase();
  const phone = pickString(raw.phone, MAX.phone);
  const tierSlug = pickString(raw.tier, 50);

  if (!businessName || !firstName || !lastName || !email || !phone || !tierSlug) {
    return NextResponse.json({ error: "Please fill in all required fields." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const title = pickOptional(raw.title, MAX.title) || null;
  const website = pickOptional(raw.website, MAX.website) || null;
  const address1 = pickOptional(raw.address1, MAX.address1) || null;
  const city = pickOptional(raw.city, MAX.city) || null;
  const state = pickOptional(raw.state, MAX.state) || null;
  const zip = pickOptional(raw.zip, MAX.zip) || null;

  // The email is the portal identity (contacts.email is UNIQUE). If it already
  // exists, this is an existing member, not a new join.
  const [existing] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(eq(contacts.email, email))
    .limit(1);
  if (existing) {
    // CUTOVER DECISION: this 409 tells an unauthenticated caller whether an
    // address is a member contact, so it is an enumeration oracle at 3
    // req/min/IP once INTERNAL_TRANSACTIONS_ENABLED flips on (portal/auth/
    // request deliberately answers {ok:true} either way). Kept because a
    // generic error would strand real members mid-signup with no next step.
    // Revisit with the known portal-auth timing leak before cutover: the
    // privacy-preserving version emails the existing contact a sign-in link
    // and returns the same generic response as a new signup.
    return NextResponse.json(
      { error: "An account with this email already exists. Please sign in to your member portal." },
      { status: 409 },
    );
  }

  // Resolve the tier — must be an active, paid tier (the 3 public tiers; the
  // legacy $0 comp tiers are not joinable online).
  const [tier] = await db
    .select({
      id: membershipTiers.id,
      name: membershipTiers.name,
      annualPriceCents: membershipTiers.annualPriceCents,
    })
    .from(membershipTiers)
    .where(
      and(
        eq(membershipTiers.slug, tierSlug),
        eq(membershipTiers.isActive, true),
        gt(membershipTiers.annualPriceCents, 0),
      ),
    )
    .limit(1);
  if (!tier) {
    return NextResponse.json({ error: "Please choose a membership tier." }, { status: 400 });
  }

  const slug = await generateOrgSlug(db, businessName);

  let member: CreatePendingMemberResult;
  try {
    member = await createPendingMember(db, {
      businessName,
      slug,
      firstName,
      lastName,
      email,
      phone,
      title,
      website,
      address1,
      city,
      state,
      zip,
      tierId: tier.id,
      tierName: tier.name,
      amountCents: tier.annualPriceCents,
    });
  } catch (err) {
    // Lost a check-then-insert race on the unique email → same 409 as the
    // pre-check. The transaction rolled back, so there are no orphan rows.
    if (err && typeof err === "object" && "code" in err && (err as { code?: unknown }).code === "23505") {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in to your member portal." },
        { status: 409 },
      );
    }
    throw err;
  }

  // Canonical origin — a spoofed Host can't influence the Stripe redirect in prod.
  const origin = getSiteOrigin(req);
  // The webhook reads these off the PaymentIntent metadata to record payment +
  // activate. type discriminates a join from a dues / event-registration payment.
  const metadata = {
    type: "join",
    invoiceId: member.invoiceId,
    organizationId: member.organizationId,
    membershipId: member.membershipId,
  };

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: tier.annualPriceCents,
            product_data: { name: `${tier.name} Membership — First Year Dues` },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: { metadata },
      metadata,
      success_url: `${origin}/membership/join?joined=1`,
      cancel_url: `${origin}/membership/join?canceled=1`,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    // Don't strand a prospect org + pending invoice (and block the unique email)
    // if Checkout creation fails. Delete the invoice, then the org — its cascade
    // removes the contact + membership.
    console.error("[join] checkout session create failed:", err);
    Sentry.captureException(err, { tags: { route: "join", phase: "checkout" } });
    try {
      await db.transaction(async (tx) => {
        await tx.delete(invoices).where(eq(invoices.id, member.invoiceId));
        await tx.delete(organizations).where(eq(organizations.id, member.organizationId));
      });
    } catch (cleanupErr) {
      console.error("[join] cleanup after checkout failure failed:", cleanupErr);
    }
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }
}
