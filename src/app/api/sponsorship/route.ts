/**
 * POST /api/sponsorship — public sponsorship-inquiry intake.
 *
 * Anti-spam: rate-limit + honeypot (website_confirm) + min-fill-time, all
 * mirroring /api/apply. A bot gets a silent 200. A real inquiry is persisted to
 * sponsorship_inquiries (the admin queue) AND emailed to staff; it's only an
 * error if BOTH the save and the email fail (so a sponsor lead is never lost
 * just because the table isn't migrated yet).
 */

import { NextRequest, NextResponse } from "next/server";
import { formLimiter, applyRateLimit } from "@/lib/rate-limit";
import { readJsonBounded } from "@/lib/body-limit";
import { EMAIL_RE } from "@/lib/email";
import { pickString, pickOptional } from "@/lib/sanitize";
import { db } from "@/lib/db";
import { sponsorshipInquiries } from "@/lib/db/schema";
import { notifyStaffSponsorship } from "@/lib/sponsorships";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX = { businessName: 200, contactName: 200, email: 320, phone: 50, interest: 200, message: 5000 };
const MIN_FILL_MS = 1500;

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, formLimiter);
  if (limited) return limited;

  const parsed = await readJsonBounded(req);
  if ("response" in parsed) return parsed.response;
  const body = parsed.body;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const raw = body as Record<string, unknown>;

  // Honeypot + timing — bots fill the hidden field and submit instantly. Silent
  // 200 so they don't adjust tactics. fillMs >= 0: a negative gap means the
  // visitor's device clock runs ahead of the server's — a real human, not a
  // bot (same guard as the contact route).
  const honeypot = typeof raw.website_confirm === "string" ? raw.website_confirm.trim() : "";
  const formLoadedAt = typeof raw.formLoadedAt === "number" ? raw.formLoadedAt : 0;
  const fillMs = Date.now() - formLoadedAt;
  if (honeypot || (formLoadedAt > 0 && fillMs >= 0 && fillMs < MIN_FILL_MS)) {
    return NextResponse.json({ success: true });
  }

  const businessName = pickString(raw.businessName, MAX.businessName);
  const contactName = pickString(raw.contactName, MAX.contactName);
  const email = pickString(raw.email, MAX.email);
  if (!businessName || !contactName || !email) {
    return NextResponse.json({ error: "Required fields missing." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  const phone = pickOptional(raw.phone, MAX.phone);
  const interest = pickOptional(raw.interest, MAX.interest);
  const message = pickOptional(raw.message, MAX.message);

  let saved = false;
  try {
    await db.insert(sponsorshipInquiries).values({
      businessName,
      contactName,
      email,
      phone: phone || null,
      interest: interest || null,
      message: message || null,
    });
    saved = true;
  } catch (err) {
    // table may not be migrated (0006) — fall back to the email so we don't lose the lead.
    console.error("[sponsorship] insert failed:", err);
  }

  const notified = await notifyStaffSponsorship({
    businessName,
    contactName,
    email,
    phone: phone || undefined,
    interest: interest || undefined,
    message: message || undefined,
  });

  if (!saved && !notified) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
