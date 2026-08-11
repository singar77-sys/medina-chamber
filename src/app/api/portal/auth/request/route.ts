/**
 * POST /api/portal/auth/request
 *
 * Accepts { email } and sends a 15-minute magic link to the member's
 * inbox if that email exists in the contacts table. Always returns
 * { ok: true } regardless — never reveal whether an email is registered.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { signMagicToken } from "@/lib/portal-session";
import { resend, EMAIL_RE } from "@/lib/email";
import { limitPortalAuth } from "@/lib/rate-limit";
import { escHtml } from "@/lib/sanitize";
import { getSiteOrigin } from "@/lib/site-url";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  // Rate limit per client IP (~5/min). Fail-open: a limiter hiccup never
  // blocks login or leaks a 500.
  const limited = await limitPortalAuth(req);
  if (limited) return limited;

  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = typeof body.email === "string"
    ? body.email.trim().toLowerCase()
    : "";

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  }

  // Look up contact — fire-and-forget on hit; generic response always returned
  const [contact] = await db
    .select({ id: contacts.id, firstName: contacts.firstName, magicTokenEpoch: contacts.magicTokenEpoch })
    .from(contacts)
    .where(eq(contacts.email, email))
    .limit(1);

  // Look up contact — fire-and-forget on hit; generic response always returned.
  // NOTE (known low): the hit branch does token-sign + Resend send before
  // responding, so response TIMING differs from a miss and could enumerate
  // members. Rated low — the chamber runs a public 521-member directory (so
  // "is X a member" is low-value) and this route is rate-limited 5/min/IP.
  // Deferring via next/server `after()` is the fix but it throws outside a
  // request context, breaking the email-escaping unit tests; revisit with a
  // testable deferral post-launch.
  if (contact) {
    try {
      const token = await signMagicToken(contact.id, email, contact.magicTokenEpoch);
      // Canonical origin (spoofed Host can't influence the login link in prod).
      const link = buildMagicLink(getSiteOrigin(req), token);

      await resend.emails.send({
        from: "Medina Chamber <noreply@medinaohchamber.com>",
        to: email,
        subject: "Your member portal access link",
        html: buildEmail(contact.firstName ?? "", link),
      });
    } catch (err) {
      // Log but don't leak errors to the client
      console.error("[portal/auth/request] email send failed:", err);
    }
  }

  // Always 200 — no email enumeration via body/status
  return NextResponse.json({ ok: true });
}

/**
 * Build the magic-link URL. In production the protocol is forced to https: so a
 * misconfigured NEXT_PUBLIC_SITE_URL (or an allowlisted origin) can never emit an
 * http login link that would leak the one-time token in cleartext.
 */
function buildMagicLink(origin: string, token: string): string {
  let base = origin;
  if (process.env.NODE_ENV === "production") {
    base = origin.replace(/^http:\/\//i, "https://");
  }
  return `${base}/api/portal/auth/verify?token=${encodeURIComponent(token)}`;
}

function buildEmail(firstName: string, link: string): string {
  // Escape every dynamic field before interpolating into the HTML. firstName is
  // member-controlled; the link is our own but escaped for defense in depth (its
  // token is URL-encoded, so escaping leaves a valid, round-trippable href).
  const safeName = escHtml(firstName);
  const safeLink = escHtml(link);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Member Portal Access</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <!-- Header -->
        <tr>
          <td style="background:#0C1B33;padding:28px 32px;text-align:center">
            <img src="https://medinaohchamber.com/images/chamber-logos/icon-white.png"
                 alt="Medina Chamber" width="48" height="48"
                 style="display:block;margin:0 auto 12px">
            <p style="margin:0;color:#83BCA9;font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:600">
              Greater Medina Chamber of Commerce
            </p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#0f172a">
              Hi ${safeName},
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.65">
              Click the button below to access your member portal.
              This link expires in <strong>15&nbsp;minutes</strong>.
            </p>
            <div style="text-align:center;margin-bottom:24px">
              <a href="${safeLink}"
                 style="display:inline-block;padding:14px 36px;background:#0C1B33;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:.01em">
                Access Member Portal
              </a>
            </div>
            <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;line-height:1.5">
              If you didn't request this link, you can safely ignore this email.<br>
              Your account won't be affected.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;text-align:center">
            <p style="margin:0;font-size:12px;color:#94a3b8">
              Greater Medina Chamber of Commerce &middot;
              139 N. Court Street, Suite A, Medina, OH 44256
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
