/**
 * Renewal confirmation email — sent best-effort after a renewal invoice is paid
 * and the membership's renewal date advances a year. Mirrors the join welcome
 * email: branded, HTML-escaped, and swallows its own errors so a mail hiccup
 * never rolls back a confirmed renewal.
 */

import { resend } from "@/lib/email";
import { escHtml as esc } from "@/lib/sanitize";

export interface RenewalConfirmationInput {
  to: string;
  firstName: string;
  orgName: string;
  tierName: string;
  /** The new renewal date (YYYY-MM-DD) — i.e. the period this payment covers through. */
  renewedThrough: string;
}

export async function sendRenewalConfirmation(input: RenewalConfirmationInput): Promise<void> {
  const { to, firstName, orgName, tierName, renewedThrough } = input;
  const dateLabel = new Date(`${renewedThrough}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Membership Renewed</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:40px 16px"><tr><td align="center">
    <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
      <tr><td style="background:#0C1B33;padding:28px 32px;text-align:center">
        <img src="https://medinaohchamber.com/images/chamber-logos/icon-white.png" alt="Medina Chamber" width="48" height="48" style="display:block;margin:0 auto 12px">
        <p style="margin:0;color:#83BCA9;font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:600">Greater Medina Chamber of Commerce</p>
      </td></tr>
      <tr><td style="padding:32px">
        <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a">Thanks, ${esc(firstName)}!</p>
        <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.65">
          Your <strong>${esc(orgName)}</strong> ${esc(tierName)} membership is renewed. You're all set through
          <strong style="color:#0C1B33">${dateLabel}</strong> — thank you for being part of the chamber.
        </p>
        <div style="text-align:center;margin-bottom:24px">
          <a href="https://medinaohchamber.com/portal" style="display:inline-block;padding:14px 36px;background:#0C1B33;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600">View My Membership →</a>
        </div>
        <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;line-height:1.6">
          Questions? Contact Stephanie Mueller at
          <a href="mailto:stephanie@medinaohchamber.com" style="color:#83BCA9;text-decoration:none">stephanie@medinaohchamber.com</a>.
        </p>
      </td></tr>
      <tr><td style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;text-align:center">
        <p style="margin:0;font-size:12px;color:#94a3b8">Greater Medina Chamber of Commerce &middot; 139 N. Court Street, Suite A, Medina, OH 44256</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  try {
    await resend.emails.send({
      from: "Medina Chamber <noreply@medinaohchamber.com>",
      to,
      subject: `Your ${orgName} membership is renewed`,
      html,
    });
  } catch (err) {
    console.error("[renewal] confirmation email failed:", err);
  }
}
