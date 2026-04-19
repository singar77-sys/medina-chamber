import { Resend } from "resend";
import { formLimiter, applyRateLimit } from "@/lib/rate-limit";

const CHAMBER_EMAIL = "office@medinaohchamber.com";
const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Per-field length caps. Anything longer is almost certainly abuse —
// real chamber visitors don't paste novels into a contact form.
const MAX = {
  name: 200,
  email: 320,    // RFC 5321 maximum
  phone: 50,
  message: 5000,
};

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Returns the trimmed string if valid, or null if it fails the rules. */
function pickString(raw: unknown, max: number): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) return null;
  return trimmed;
}

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

  // 2. Field-by-field validation with explicit length caps
  const raw = body as Record<string, unknown>;
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
      from: "Chamber Website <onboarding@resend.dev>",
      to: CHAMBER_EMAIL,
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
    return Response.json({ error: "Failed to send message. Please try again." }, { status: 500 });
  }
}
