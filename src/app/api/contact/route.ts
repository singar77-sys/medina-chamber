import * as Sentry from "@sentry/nextjs";
import { formLimiter, applyRateLimit } from "@/lib/rate-limit";
import { resend, CHAMBER_NOTIFY_EMAIL, EMAIL_RE } from "@/lib/email";
import { escHtml, pickString, pickOptional } from "@/lib/sanitize";

// Per-field length caps. Anything longer is almost certainly abuse —
// real chamber visitors don't paste novels into a contact form. These
// mirror the maxLength attributes on the form inputs.
const MAX = {
  name: 100,
  organization: 200,
  title: 200,
  address: 200,
  city: 100,
  state: 100,
  postalCode: 20,
  addressType: 50,
  country: 100,
  email: 320, // RFC 5321 maximum
  phone: 50,
  contactPreference: 50,
  comments: 5000,
};

// Minimum time between form render and submission. Real humans take
// at least a few seconds to fill out a contact form; naive spam bots
// submit within milliseconds. 1.5s catches the dumb ones without any
// friction for real users.
const MIN_FILL_MS = 1500;

export async function POST(req: Request) {
  const limited = await applyRateLimit(req, formLimiter);
  if (limited) return limited;

  // 1. Body must be valid JSON
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  // 2. Honeypot + timing check. If either trips we return 200 so the
  //    bot thinks it succeeded and doesn't adjust tactics — but we
  //    never dispatch an email or call Resend. Sentry logs the event
  //    so we can see volume if it matters.
  const honeypot = typeof raw.website_confirm === "string" ? raw.website_confirm.trim() : "";
  const formLoadedAt = typeof raw.formLoadedAt === "number" ? raw.formLoadedAt : 0;
  const fillMs = Date.now() - formLoadedAt;
  if (honeypot || (formLoadedAt > 0 && fillMs < MIN_FILL_MS)) {
    Sentry.captureMessage("contact form rejected by honeypot/timing", {
      level: "info",
      tags: { route: "contact", phase: "honeypot" },
      extra: { honeypotFilled: Boolean(honeypot), fillMs },
    });
    return Response.json({ ok: true });
  }

  // 3. Field-by-field validation with explicit length caps. pickOptional
  //    maps a missing/oversized optional field to "" so it's simply omitted
  //    from the notification email rather than failing the whole submission.
  const firstName = pickString(raw.firstName, MAX.name);
  const lastName = pickString(raw.lastName, MAX.name);
  const email = pickString(raw.email, MAX.email);
  const comments = pickString(raw.comments, MAX.comments);

  const organization = pickOptional(raw.organization, MAX.organization);
  const title = pickOptional(raw.title, MAX.title);
  const addressLine1 = pickOptional(raw.addressLine1, MAX.address);
  const addressLine2 = pickOptional(raw.addressLine2, MAX.address);
  const city = pickOptional(raw.city, MAX.city);
  const state = pickOptional(raw.state, MAX.state);
  const postalCode = pickOptional(raw.postalCode, MAX.postalCode);
  const addressType = pickOptional(raw.addressType, MAX.addressType);
  const country = pickOptional(raw.country, MAX.country);
  const phone = pickOptional(raw.phone, MAX.phone);
  const contactPreference = pickOptional(raw.contactPreference, MAX.contactPreference);

  if (!firstName || !lastName || !email || !comments) {
    return Response.json(
      { error: "First name, last name, email, and comments are required." },
      { status: 400 }
    );
  }
  if (!EMAIL_RE.test(email)) {
    return Response.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: "Mail service not configured." }, { status: 500 });
  }

  const fullName = `${firstName} ${lastName}`;

  // Only include fields the visitor actually filled in. Name and email
  // are guaranteed present (required above).
  const rows: [string, string][] = [
    ["Name", fullName],
    ["Email", email],
    ["Phone", phone],
    ["Organization", organization],
    ["Title", title],
    ["Address Line 1", addressLine1],
    ["Address Line 2", addressLine2],
    ["City", city],
    ["State", state],
    ["Postal Code", postalCode],
    ["Country", country],
    ["Address Type", addressType],
    ["Contact Preference", contactPreference],
  ].filter(([, v]) => v) as [string, string][];

  try {
    await resend.emails.send({
      // Sent from huntersystems.dev (verified Resend domain) instead of
      // resend.dev sandbox — better deliverability, won't get spam-folder'd
      // by chamber inboxes. Display name still reads as the chamber.
      from: "Greater Medina Chamber Website <chamber@huntersystems.dev>",
      to: CHAMBER_NOTIFY_EMAIL,
      replyTo: email,
      subject: `Contact form: ${fullName}`,
      text: [...rows.map(([k, v]) => `${k}: ${v}`), "", comments].join("\n"),
      html: `
        ${rows.map(([k, v]) => `<p><strong>${escHtml(k)}:</strong> ${escHtml(v)}</p>`).join("\n")}
        <hr />
        <p style="white-space:pre-wrap">${escHtml(comments)}</p>
      `,
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Resend error:", err);
    Sentry.captureException(err, {
      tags: { route: "contact" },
      // PII: name + email are intentional — chamber needs to know who hit
      // the error. Sentry's sendDefaultPii is on; this matches that policy.
      extra: { senderName: fullName, senderEmail: email },
    });
    return Response.json({ error: "Failed to send message. Please try again." }, { status: 500 });
  }
}
