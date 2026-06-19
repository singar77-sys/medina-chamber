/**
 * New-member emails, sent from the Stripe webhook once a join payment activates
 * the membership: a welcome to the member (with a portal sign-in CTA) and a
 * heads-up to chamber staff. Both are best-effort — a failed send is logged,
 * never thrown, so it can't roll back an activation or 500 the webhook.
 */

import { resend, CHAMBER_NOTIFY_EMAIL } from "@/lib/email";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });
}

export interface WelcomeEmailParams {
  to: string;
  firstName: string;
  businessName: string;
  tierName: string;
}

export async function sendWelcomeEmail(p: WelcomeEmailParams): Promise<void> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://medinaohchamber.com";
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome to the Chamber</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <tr><td style="background:#0C1B33;padding:28px 32px;text-align:center">
          <img src="https://medinaohchamber.com/images/chamber-logos/icon-white.png" alt="Medina Chamber" width="48" height="48" style="display:block;margin:0 auto 12px">
          <p style="margin:0;color:#83BCA9;font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:600">Greater Medina Chamber of Commerce</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#0f172a">Welcome, ${escapeHtml(p.firstName)}!</p>
          <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.65">
            ${escapeHtml(p.businessName)} is now a <strong>${escapeHtml(p.tierName)}</strong> member of the Greater Medina
            Chamber of Commerce. Your payment is confirmed and your membership is active — welcome to the community.
          </p>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.65">
            Sign in to your member portal to manage your listing, view invoices, and register for events. We sign you
            in with a one-time link sent to <strong>${escapeHtml(p.to)}</strong> — no password to remember.
          </p>
          <div style="text-align:center;margin-bottom:24px">
            <a href="${siteUrl}/portal" style="display:inline-block;padding:14px 36px;background:#0C1B33;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600">Open Your Member Portal</a>
          </div>
          <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;line-height:1.5">Questions? Just reply to this email — we're glad you're here.</p>
        </td></tr>
        <tr><td style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;text-align:center">
          <p style="margin:0;font-size:12px;color:#94a3b8">Greater Medina Chamber of Commerce &middot; 139 N. Court Street, Suite A, Medina, OH 44256</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: "Greater Medina Chamber <noreply@medinaohchamber.com>",
      to: p.to,
      subject: "Welcome to the Greater Medina Chamber of Commerce",
      html,
    });
  } catch (err) {
    console.error("[membership] welcome email failed:", err);
  }
}

export interface StaffNewMemberParams {
  businessName: string;
  contactName: string;
  email: string;
  tierName: string;
  amountCents: number;
}

export async function notifyStaffNewMember(p: StaffNewMemberParams): Promise<void> {
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
      <h2 style="color:#0C1B33;margin-bottom:4px">New paid member 🎉</h2>
      <p style="color:#666;margin-top:0">A membership was just purchased and activated on medinachamber.com.</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;width:40%">Business</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600">${escapeHtml(p.businessName)}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666">Contact</td><td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(p.contactName)} &lt;${escapeHtml(p.email)}&gt;</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666">Tier</td><td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(p.tierName)}</td></tr>
        <tr><td style="padding:8px 0;color:#666">Paid</td><td style="padding:8px 0;font-weight:600">${money(p.amountCents)}</td></tr>
      </table>
    </div>`;

  try {
    await resend.emails.send({
      from: "Greater Medina Chamber Membership <chamber@huntersystems.dev>",
      replyTo: p.email,
      to: CHAMBER_NOTIFY_EMAIL,
      subject: `New member: ${p.businessName} (${p.tierName})`,
      html,
    });
  } catch (err) {
    console.error("[membership] staff new-member notify failed:", err);
  }
}
