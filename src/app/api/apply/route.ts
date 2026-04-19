import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import * as Sentry from "@sentry/nextjs";
import { formLimiter, applyRateLimit } from "@/lib/rate-limit";

const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");
const CHAMBER_EMAIL = "office@medinaohchamber.com";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Per-field length caps. Real applications stay well under these; anything
// over is almost certainly abuse or a paste accident.
const MAX = {
  businessName: 200,
  contactName: 200,
  title: 150,
  email: 320,        // RFC 5321
  phone: 50,
  website: 500,
  address: 200,
  city: 100,
  state: 50,
  zip: 20,
  employees: 20,
  category: 200,
  referral: 500,
  notes: 5000,
};

function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Returns trimmed string if valid, null otherwise. Empty input → null. */
function pickString(raw: unknown, max: number): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) return null;
  return trimmed;
}

/** Same as pickString but returns "" for missing/invalid (vs null). Used for
 *  optional fields where we just want to skip rendering on empty. */
function pickOptional(raw: unknown, max: number): string {
  const v = pickString(raw, max);
  return v ?? "";
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, formLimiter);
  if (limited) return limited;

  // 1. Body must be valid JSON
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  // 2. Field-by-field validation
  const businessName = pickString(raw.businessName, MAX.businessName);
  const contactName  = pickString(raw.contactName,  MAX.contactName);
  const email        = pickString(raw.email,        MAX.email);
  const phone        = pickString(raw.phone,        MAX.phone);
  const employees    = pickString(raw.employees,    MAX.employees);

  if (!businessName || !contactName || !email || !phone || !employees) {
    return NextResponse.json(
      { error: "Required fields missing." },
      { status: 400 }
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  // Optional fields (empty string when missing)
  const title    = pickOptional(raw.title,    MAX.title);
  const address  = pickOptional(raw.address,  MAX.address);
  const city     = pickOptional(raw.city,     MAX.city);
  const state    = pickOptional(raw.state,    MAX.state);
  const zip      = pickOptional(raw.zip,      MAX.zip);
  const category = pickOptional(raw.category, MAX.category);
  const referral = pickOptional(raw.referral, MAX.referral);
  const notes    = pickOptional(raw.notes,    MAX.notes);
  const website  = pickOptional(raw.website,  MAX.website);

  const employeeLabel: Record<string, string> = {
    "1": "1 (sole proprietor)",
    "2-5": "2–5 employees",
    "6-10": "6–10 employees",
    "11-25": "11–25 employees",
    "26-50": "26–50 employees",
    "51-100": "51–100 employees",
    "100+": "100+ employees",
  };

  const fullAddress = [address, city, state, zip].filter(Boolean).join(", ");
  // Only echo the website link if it actually parses as http(s) URL — guards
  // against javascript:/data: payloads in the email body.
  const safeWebsite = /^https?:\/\//i.test(website) ? website : "";

  try {
    await resend.emails.send({
      from: "Chamber Membership <onboarding@resend.dev>",
      replyTo: email,
      to: CHAMBER_EMAIL,
      subject: `Membership Application — ${businessName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
          <h2 style="color: #1b3a5c; margin-bottom: 4px;">New Membership Application</h2>
          <p style="color: #666; margin-top: 0;">Submitted via medinachamber.com</p>

          <table style="width: 100%; border-collapse: collapse; margin-top: 24px;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; width: 40%; color: #666; font-size: 14px;">Business / Organization</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 600;">${escHtml(businessName)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">Primary Contact</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 600;">${escHtml(contactName)}${title ? `, ${escHtml(title)}` : ""}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">Email</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><a href="mailto:${escHtml(email)}">${escHtml(email)}</a></td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">Phone</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${escHtml(phone)}</td>
            </tr>
            ${safeWebsite ? `<tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">Website</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><a href="${escHtml(safeWebsite)}">${escHtml(safeWebsite)}</a></td>
            </tr>` : ""}
            ${fullAddress ? `<tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">Address</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${escHtml(fullAddress)}</td>
            </tr>` : ""}
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">Employees</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${escHtml(employeeLabel[employees] ?? employees)}</td>
            </tr>
            ${category ? `<tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">Business Category</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${escHtml(category)}</td>
            </tr>` : ""}
            ${referral ? `<tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">How they heard about us</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${escHtml(referral)}</td>
            </tr>` : ""}
            ${notes ? `<tr>
              <td style="padding: 10px 0; color: #666; font-size: 14px; vertical-align: top;">Additional notes</td>
              <td style="padding: 10px 0;">${escHtml(notes)}</td>
            </tr>` : ""}
          </table>

          <div style="margin-top: 32px; padding: 16px; background: #f0f4f8; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #555;">
              Reply directly to this email to respond to ${escHtml(contactName)} at ${escHtml(businessName)}.
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Apply route error:", err);
    Sentry.captureException(err, {
      tags: { route: "apply" },
      extra: { businessName, contactName, email },
    });
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
