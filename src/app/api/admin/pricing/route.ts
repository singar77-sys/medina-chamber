/**
 * GET    /api/admin/pricing      — current config (CMS override or defaults)
 * POST   /api/admin/pricing      — save full pricing config
 * DELETE /api/admin/pricing      — reset to compiled defaults
 *
 * Saving here writes to Redis (cms:pricing) and busts the in-process
 * chamber-facts cache so ChamberBot picks up the new prices within
 * seconds (not waiting for the 5-min TTL).
 */

import { NextResponse } from "next/server";
import { requireAdminToken } from "@/lib/admin-auth";
import {
  getCmsPricing,
  setCmsPricing,
  clearCmsPricing,
  DEFAULT_PRICING,
  type PricingConfig,
} from "@/lib/cms-store";
import { bustChamberFactsCache } from "@/lib/chamber-facts";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const authErr = requireAdminToken(req);
  if (authErr) return authErr;

  const saved = await getCmsPricing();
  return NextResponse.json({
    pricing: saved ?? DEFAULT_PRICING,
    isOverridden: saved !== null,
    updatedAt: saved?.updatedAt ?? null,
  });
}

export async function POST(req: Request): Promise<Response> {
  const authErr = requireAdminToken(req);
  if (authErr) return authErr;

  let body: { tiers?: unknown; faqs?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!Array.isArray(body.tiers) || body.tiers.length === 0) {
    return NextResponse.json({ error: "tiers array required." }, { status: 400 });
  }

  // Basic validation — each tier must have a key, name, and numeric price.
  for (const tier of body.tiers) {
    if (
      typeof tier !== "object" ||
      !tier ||
      typeof (tier as Record<string, unknown>).key !== "string" ||
      typeof (tier as Record<string, unknown>).name !== "string" ||
      typeof (tier as Record<string, unknown>).price !== "number" ||
      ((tier as Record<string, unknown>).price as number) <= 0
    ) {
      return NextResponse.json(
        { error: "Each tier must have key (string), name (string), and price (positive number)." },
        { status: 400 },
      );
    }
  }

  const config: PricingConfig = {
    tiers: body.tiers as PricingConfig["tiers"],
    faqs: Array.isArray(body.faqs) ? (body.faqs as PricingConfig["faqs"]) : DEFAULT_PRICING.faqs,
  };

  await setCmsPricing(config);
  bustChamberFactsCache(); // bot picks up new prices on next request

  return NextResponse.json({ ok: true, updatedAt: new Date().toISOString() });
}

export async function DELETE(req: Request): Promise<Response> {
  const authErr = requireAdminToken(req);
  if (authErr) return authErr;

  await clearCmsPricing();
  bustChamberFactsCache();

  return NextResponse.json({ ok: true });
}
