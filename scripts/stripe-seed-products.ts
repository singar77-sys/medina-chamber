/**
 * Idempotently create Stripe Products + Prices for paid membership tiers,
 * then write the resulting price IDs back to membership_tiers.stripePriceIdAnnual.
 *
 * Skips tiers with annualPriceCents === 0 (executive/president/courtesy).
 *
 * Run with inline creds:
 *   STRIPE_SECRET_KEY='sk_test_...' DATABASE_URL_UNPOOLED='postgresql://...' \
 *     pnpm tsx scripts/stripe-seed-products.ts
 */

import Stripe from "stripe";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";

// ── Clients ────────────────────────────────────────────────────────────────────

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

const stripe = new Stripe(stripeKey, { apiVersion: "2026-05-27.dahlia" });

// Use the session-pooler (port 5432) — prepared statements work here.
// Fall back to DATABASE_URL only if DATABASE_URL_UNPOOLED is absent.
const dbUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL is not set");

const sql = postgres(dbUrl, { ssl: "require" });
const db = drizzle(sql, { schema });

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Find an existing Stripe Product by tierSlug metadata, or return null. */
async function findProduct(slug: string): Promise<Stripe.Product | null> {
  // Try the Search API first (available in stripe@v10+)
  try {
    const results = await stripe.products.search({
      query: `metadata['tierSlug']:'${slug}'`,
      limit: 5,
    });
    const active = results.data.filter((p) => p.active);
    if (active.length > 0) return active[0];
  } catch {
    // Search not available — fall through to list
  }

  // Fallback: list all products and filter in memory
  const all: Stripe.Product[] = [];
  for await (const p of stripe.products.list({ limit: 100 })) {
    all.push(p);
  }
  return all.find((p) => p.active && p.metadata?.tierSlug === slug) ?? null;
}

/** Find an existing active annual Price for a product+slug, or return null. */
async function findAnnualPrice(
  productId: string,
  slug: string,
  unitAmount: number
): Promise<Stripe.Price | null> {
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 100,
  });

  return (
    prices.data.find(
      (p) =>
        p.unit_amount === unitAmount &&
        p.currency === "usd" &&
        p.recurring?.interval === "year" &&
        p.metadata?.tierSlug === slug
    ) ?? null
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

void (async () => {
  console.log("🔧  Stripe product seed — idempotent run\n");

  // Load paid tiers from DB
  const tiers = await db
    .select()
    .from(schema.membershipTiers)
    .then((rows) => rows.filter((t) => t.isActive && t.annualPriceCents > 0));

  if (tiers.length === 0) {
    console.log("⚠️  No paid active tiers found in DB. Run seed-membership-tiers first.");
    process.exit(1);
  }

  const summary: Array<{
    slug: string;
    name: string;
    productId: string;
    priceId: string;
    amountDollars: string;
    productCreated: boolean;
    priceCreated: boolean;
  }> = [];

  for (const tier of tiers) {
    const slug = tier.slug;
    console.log(`── ${tier.name} (${slug}) — $${(tier.annualPriceCents / 100).toFixed(0)}/yr`);

    // ── Product ──────────────────────────────────────────────────────────────
    let product = await findProduct(slug);
    let productCreated = false;

    if (product) {
      console.log(`   product  ✓ reused  ${product.id}`);
    } else {
      product = await stripe.products.create({
        name: tier.name,
        metadata: { tierSlug: slug },
      });
      productCreated = true;
      console.log(`   product  + created ${product.id}`);
    }

    // ── Price ────────────────────────────────────────────────────────────────
    let price = await findAnnualPrice(product.id, slug, tier.annualPriceCents);
    let priceCreated = false;

    if (price) {
      console.log(`   price    ✓ reused  ${price.id}`);
    } else {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: tier.annualPriceCents,
        currency: "usd",
        recurring: { interval: "year" },
        metadata: { tierSlug: slug },
      });
      priceCreated = true;
      console.log(`   price    + created ${price.id}`);
    }

    // ── Write price ID back to DB ────────────────────────────────────────────
    await db
      .update(schema.membershipTiers)
      .set({ stripePriceIdAnnual: price.id })
      .where(eq(schema.membershipTiers.slug, slug));

    console.log(`   db       ✓ stripePriceIdAnnual set\n`);

    summary.push({
      slug,
      name: tier.name,
      productId: product.id,
      priceId: price.id,
      amountDollars: `$${(tier.annualPriceCents / 100).toFixed(2)}`,
      productCreated,
      priceCreated,
    });
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log("─".repeat(72));
  console.log("SUMMARY\n");
  for (const row of summary) {
    const pTag = row.productCreated ? "new" : "existing";
    const rTag = row.priceCreated ? "new" : "existing";
    console.log(`  ${row.slug}`);
    console.log(`    product  [${pTag}]  ${row.productId}`);
    console.log(`    price    [${rTag}]  ${row.priceId}  ${row.amountDollars}/yr`);
  }
  console.log("\n✅  Done — all paid tiers have Stripe products + prices.");

  await sql.end();
  process.exit(0);
})();
