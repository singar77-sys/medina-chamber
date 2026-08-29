/**
 * Event registration emails.
 *
 * `sendEventConfirmation` is called once a registration reaches a terminal state
 * the attendee should hear about: `confirmed` (free RSVP, or a paid ticket the
 * webhook just confirmed) or `waitlisted`. It mirrors the magic-link email in
 * portal/auth/request — same Resend client, same chamber-branded HTML shell —
 * and, like that one, must NEVER throw into the caller: a failed send is logged,
 * not surfaced, so it can't roll back a paid registration or 500 a webhook.
 *
 * The builder takes already-formatted display values (no DB/Date logic here) so
 * it stays pure and unit-testable; the caller assembles them at the confirmation
 * point where it has the event + attendee in hand.
 */

import { resend } from "@/lib/email";
import { escHtml as escapeHtml } from "@/lib/sanitize";

export interface EventConfirmationParams {
  to: string;
  attendeeName: string;
  eventTitle: string;
  /** Pre-formatted, e.g. "Thursday, July 17, 2026 · 11:30 AM". */
  eventWhen: string;
  location?: string | null;
  ticketName?: string | null;
  quantity: number;
  /** Total amount for the registration in cents. 0 → shown as "Free". */
  amountCents: number;
  status: "confirmed" | "waitlisted";
  /** Absolute link back to the public event page. */
  eventUrl?: string;
}

function formatMoney(cents: number): string {
  if (!cents) return "Free";
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

export function buildEventConfirmationEmail(p: EventConfirmationParams): string {
  const waitlisted = p.status === "waitlisted";

  const heading = waitlisted ? "You're on the waitlist" : "You're registered!";
  const intro = waitlisted
    ? `This event is currently full, so we've added you to the waitlist. We'll email you if a spot opens up — no payment has been taken.`
    : `Thanks for registering. We've saved your spot and look forward to seeing you.`;

  const rows: Array<[string, string]> = [
    ["Event", escapeHtml(p.eventTitle)],
    ["When", escapeHtml(p.eventWhen)],
  ];
  if (p.location) rows.push(["Where", escapeHtml(p.location)]);
  if (p.ticketName) rows.push(["Ticket", escapeHtml(p.ticketName)]);
  if (p.quantity > 1) rows.push(["Quantity", String(p.quantity)]);
  if (!waitlisted) rows.push(["Total", formatMoney(p.amountCents)]);

  const detailRows = rows
    .map(
      ([label, value]) => `
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#94a3b8;width:90px;vertical-align:top">${label}</td>
              <td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:600">${value}</td>
            </tr>`,
    )
    .join("");

  const cta = p.eventUrl
    ? `<div style="text-align:center;margin-bottom:24px">
              <a href="${escapeHtml(p.eventUrl)}"
                 style="display:inline-block;padding:14px 36px;background:#0C1B33;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600">
                View Event Details
              </a>
            </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
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
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#0f172a">
              ${heading}
            </p>
            <p style="margin:0 0 8px;font-size:15px;color:#475569;line-height:1.65">
              Hi ${escapeHtml(p.attendeeName)},
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.65">
              ${intro}
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                   style="background:#f8fafc;border-radius:12px;padding:16px 20px;margin-bottom:24px">
              ${detailRows}
            </table>
            ${cta}
            <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;line-height:1.5">
              Questions? Reply to this email or call the chamber office.
            </p>
          </td>
        </tr>
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

/**
 * Send the confirmation/waitlist email. Never throws — logs and swallows any
 * failure so it can't break the registration or webhook flow that called it.
 */
export async function sendEventConfirmation(
  p: EventConfirmationParams,
): Promise<void> {
  const subject =
    p.status === "waitlisted"
      ? `Waitlist confirmation — ${p.eventTitle}`
      : `You're registered — ${p.eventTitle}`;
  try {
    await resend.emails.send({
      from: "Medina Chamber <noreply@medinaohchamber.com>",
      to: p.to,
      subject,
      html: buildEventConfirmationEmail(p),
    });
  } catch (err) {
    console.error("[events] confirmation email send failed:", err);
  }
}
