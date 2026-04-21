import * as Sentry from "@sentry/nextjs";
import { formLimiter, applyRateLimit } from "@/lib/rate-limit";
import { resend, CHAMBER_NOTIFY_EMAIL, EMAIL_RE } from "@/lib/email";
import { escHtml, pickString } from "@/lib/sanitize";

// Per-field length caps. Anything longer is almost certainly abuse —
// real chamber visitors don't paste novels into a contact form.
const MAX = {
  name: 200,
  email: 320,    // RFC 5321 maximum
  phone: 50,
  message: 5000,
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

  // 3. Field-by-field validation with explicit length caps
  const name = pickString(raw.name, MAX.name);
  const email = pickString(raw.email, MAX.email);
  const message = pickString(raw.message, MAX.message);
  const phone = raw.phone === undefined || raw.phone === null
    ? ""
    : pickString(raw.phone, MAX.phone) ?? "";

  if (!name || !email || !message) {
    return Response.json(
      { error: "Name, email, and message are required." },
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

  try {
    await resend.emails.send({
      // Sent from huntersystems.dev (verified Resend domain) instead of
      // resend.dev sandbox — better deliverability, won't get spam-folder'd
      // by chamber inboxes. Display name still reads as the chamber.
      from: "Greater Medina Chamber Website <chamber@huntersystems.dev>",
      to: CHAMBER_NOTIFY_EMAIL,
      replyTo: email,
      subject: `Contact form: ${name}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        phone ? `Phone: ${phone}` : "",
        "",
        message,
      ]
        .filter(Boolean)
        .join("\n"),
      html: `
        <p><strong>Name:</strong> ${escHtml(name)}</p>
        <p><strong>Email:</strong> ${escHtml(email)}</p>
        ${phone ? `<p><strong>Phone:</strong> ${escHtml(phone)}</p>` : ""}
        <hr />
        <p style="white-space:pre-wrap">${escHtml(message)}</p>
      `,
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Resend error:", err);
    Sentry.captureException(err, {
      tags: { route: "contact" },
      // PII: name + email are intentional — chamber needs to know who hit
      // the error. Sentry's sendDefaultPii is on; this matches that policy.
      extra: { senderName: name, senderEmail: email },
    });
    return Response.json({ error: "Failed to send message. Please try again." }, { status: 500 });
  }
}
