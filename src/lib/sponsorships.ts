/**
 * Sponsorship inquiries — admin list query + best-effort staff notification.
 */

import { desc, sql } from "drizzle-orm";
import type { DB } from "@/lib/db";
import { sponsorshipInquiries } from "@/lib/db/schema";
import { resend, CHAMBER_NOTIFY_EMAIL } from "@/lib/email";
import { escHtml } from "@/lib/sanitize";

/** All inquiries for the admin queue — unworked ('new') first, then newest. */
export async function getSponsorships(db: DB) {
  return db
    .select()
    .from(sponsorshipInquiries)
    .orderBy(
      sql`case ${sponsorshipInquiries.status} when 'new' then 0 when 'contacted' then 1 else 2 end`,
      desc(sponsorshipInquiries.createdAt),
    );
}

export interface SponsorshipNotifyInput {
  businessName: string;
  contactName: string;
  email: string;
  phone?: string;
  interest?: string;
  message?: string;
}

/** Email staff that a sponsorship inquiry arrived. Never throws; returns whether it sent. */
export async function notifyStaffSponsorship(input: SponsorshipNotifyInput): Promise<boolean> {
  const row = (label: string, value?: string) =>
    value
      ? `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;width:38%">${label}</td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:600">${escHtml(value)}</td></tr>`
      : "";

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
      <h2 style="color:#0C1B33;margin-bottom:4px">New sponsorship inquiry</h2>
      <p style="color:#666;margin-top:0">Submitted via medinaohchamber.com</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        ${row("Business", input.businessName)}
        ${row("Contact", input.contactName)}
        <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666">Email</td><td style="padding:8px 0;border-bottom:1px solid #eee"><a href="mailto:${escHtml(input.email)}">${escHtml(input.email)}</a></td></tr>
        ${row("Phone", input.phone)}
        ${row("Interested in", input.interest)}
        ${input.message ? `<tr><td style="padding:8px 0;color:#666;vertical-align:top">Message</td><td style="padding:8px 0">${escHtml(input.message)}</td></tr>` : ""}
      </table>
      <p style="margin-top:24px;font-size:13px;color:#555">Reply to this email to reach ${escHtml(input.contactName)} directly. Manage it in the admin sponsorships queue.</p>
    </div>`;

  try {
    await resend.emails.send({
      from: "Greater Medina Chamber <noreply@medinaohchamber.com>",
      replyTo: input.email,
      to: CHAMBER_NOTIFY_EMAIL,
      subject: `Sponsorship inquiry: ${input.businessName}`,
      html,
    });
    return true;
  } catch (err) {
    console.error("[sponsorship] staff notify failed:", err);
    return false;
  }
}
