/**
 * Renewal Engine — daily membership lifecycle management.
 *
 * Called by /api/cron/renewal each day at 08:00 UTC.
 *
 * Phases (run in order):
 *   1. Invoice generation   — draft invoice 60 days before renewal date
 *   2. 30-day notice        — email primary contact with invoice details
 *   3. 7-day notice         — urgent follow-up email
 *   4. Past-due transition  — active → past_due when renewal date passes unpaid
 *   5. Lapsed transition    — past_due → lapsed after 30-day grace period
 *
 * Idempotency:
 *   - Invoice creation checks for an existing invoice with period_start = renewal_date
 *   - Status transitions only touch rows that qualify; safe to run multiple times per day
 *   - Notice emails stamp invoices.renewal_notice_sent_days after sending, and the
 *     notice query skips stages already sent — so a same-day re-run / retry / manual
 *     trigger won't re-email the member.
 */

import { db } from "@/lib/db";
import { invoices, type InvoiceLineItem } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { resend } from "@/lib/email";

// ── Result type ────────────────────────────────────────────────────────────────

export interface RenewalResult {
  invoicesCreated: number;
  notices30Sent: number;
  notices7Sent: number;
  markedPastDue: number;
  markedLapsed: number;
  errors: number;
  errorDetails: Array<{ membershipId: string; phase: string; error: string }>;
  durationMs: number;
}

// ── Date helpers ───────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

function addYears(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCFullYear(r.getUTCFullYear() + n);
  return r;
}

// ── Main entry ─────────────────────────────────────────────────────────────────

export async function runRenewalEngine(): Promise<RenewalResult> {
  // Kill switch — the billing/email backend is dormant until the GrowthZone
  // cutover. Belt-and-suspenders on top of removing the cron from vercel.json:
  // if invoked at all, do nothing (no invoicing, no dunning emails, no status
  // transitions) unless explicitly enabled.
  if (process.env.RENEWALS_ENABLED !== "true") {
    console.log("[renewal] disabled — skipping (dormant backend)");
    return {
      invoicesCreated: 0,
      notices30Sent: 0,
      notices7Sent: 0,
      markedPastDue: 0,
      markedLapsed: 0,
      errors: 0,
      errorDetails: [],
      durationMs: 0,
    };
  }

  const started = Date.now();
  const result: RenewalResult = {
    invoicesCreated: 0,
    notices30Sent: 0,
    notices7Sent: 0,
    markedPastDue: 0,
    markedLapsed: 0,
    errors: 0,
    errorDetails: [],
    durationMs: 0,
  };

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  await createRenewalInvoices(today, result);
  await sendRenewalNotices(today, 30, result);
  await sendRenewalNotices(today, 7, result);
  await markPastDue(today, result);
  await markLapsed(result);

  result.durationMs = Date.now() - started;
  return result;
}

// ── Phase 1: Create draft invoices 60 days before renewal ─────────────────────

async function createRenewalInvoices(today: Date, result: RenewalResult): Promise<void> {
  // Window: tomorrow → 60 days out. Skipping today avoids racing with past-due logic.
  const windowStart = toDateStr(addDays(today, 1));
  const windowEnd   = toDateStr(addDays(today, 60));

  const candidates = await db.execute(sql`
    SELECT
      m.id                   AS membership_id,
      m.organization_id,
      m.renewal_date,
      t.annual_price_cents,
      t.name                 AS tier_name,
      o.name                 AS org_name
    FROM memberships m
    JOIN membership_tiers t ON t.id = m.tier_id
    JOIN organizations o    ON o.id = m.organization_id
    WHERE m.status = 'active'
      AND m.renewal_date BETWEEN ${windowStart}::date AND ${windowEnd}::date
      AND NOT EXISTS (
        SELECT 1 FROM invoices i
        WHERE i.membership_id = m.id
          AND i.period_start  = m.renewal_date
      )
  `) as Array<{
    membership_id: string;
    organization_id: string;
    renewal_date: string;
    annual_price_cents: number;
    tier_name: string;
    org_name: string;
  }>;

  for (const row of candidates) {
    try {
      const renewalDate = row.renewal_date;
      const periodEnd   = toDateStr(addYears(new Date(renewalDate + "T00:00:00Z"), 1));
      const amountCents = row.annual_price_cents;

      const lineItems: InvoiceLineItem[] = [{
        description:     `${row.tier_name} annual membership — ${renewalDate.slice(0, 4)}`,
        quantity:        1,
        unitAmountCents: amountCents,
        totalCents:      amountCents,
      }];

      await db.insert(invoices).values({
        organizationId:  row.organization_id,
        membershipId:    row.membership_id,
        amountCents,
        amountPaidCents: 0,
        status:          "pending",
        description:     `Annual membership renewal — ${row.org_name}`,
        dueDate:         renewalDate,
        periodStart:     renewalDate,
        periodEnd,
        lineItems,
      }).onConflictDoNothing(); // unique(membership_id, period_start) — a double-run is a no-op

      result.invoicesCreated++;
      console.log(`[renewal] invoice created for ${row.org_name} (renewal ${renewalDate})`);
    } catch (err) {
      result.errors++;
      result.errorDetails.push({
        membershipId: row.membership_id,
        phase: "invoice_creation",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

// ── Phases 2 & 3: Send renewal notice emails ───────────────────────────────────

async function sendRenewalNotices(today: Date, daysOut: number, result: RenewalResult): Promise<void> {
  const targetDate = toDateStr(addDays(today, daysOut));

  // Only memberships whose renewal date is exactly `daysOut` days from now
  // and that have a pending invoice — exact match prevents duplicate emails on re-runs.
  const candidates = await db.execute(sql`
    SELECT
      m.id               AS membership_id,
      m.organization_id,
      m.renewal_date,
      t.name             AS tier_name,
      t.annual_price_cents,
      o.name             AS org_name,
      i.id               AS invoice_id,
      i.amount_cents     AS invoice_amount_cents
    FROM memberships m
    JOIN membership_tiers t ON t.id = m.tier_id
    JOIN organizations o    ON o.id = m.organization_id
    JOIN invoices i         ON i.membership_id = m.id
                           AND i.period_start   = m.renewal_date
    WHERE m.status = 'active'
      AND m.renewal_date::text = ${targetDate}
      AND i.status IN ('pending', 'draft')
      AND i.amount_paid_cents < i.amount_cents
      AND (i.renewal_notice_sent_days IS NULL OR i.renewal_notice_sent_days > ${daysOut})
  `) as Array<{
    membership_id: string;
    organization_id: string;
    renewal_date: string;
    tier_name: string;
    annual_price_cents: number;
    org_name: string;
    invoice_id: string;
    invoice_amount_cents: number;
  }>;

  for (const row of candidates) {
    try {
      const contact = await getPrimaryContact(row.organization_id);
      if (!contact) {
        console.warn(`[renewal] no emailable contact for ${row.org_name} — skipping ${daysOut}d notice`);
        continue;
      }

      const { error: sendError } = await resend.emails.send({
        from: "Medina Chamber <noreply@medinaohchamber.com>",
        to:   contact.email,
        subject: daysOut === 30
          ? `Your ${row.tier_name} membership renews in 30 days`
          : `Action needed: Your ${row.tier_name} membership renews in 7 days`,
        html: buildRenewalEmail({
          firstName:   contact.firstName,
          orgName:     row.org_name,
          tierName:    row.tier_name,
          renewalDate: row.renewal_date,
          // Use the amount actually invoiced, not the live tier price — they differ
          // if the tier price changed after the invoice was created ~60 days out.
          amountCents: row.invoice_amount_cents,
          daysOut,
        }),
      });

      // Resend returns { data, error } instead of throwing on a send failure — a
      // present error means the email never went out, so record it and skip
      // BEFORE stamping the invoice as notified. Otherwise the member is silently
      // never emailed yet renewal_notice_sent_days marks the stage done, so the
      // next run skips them too and the notice is lost forever.
      if (sendError) {
        result.errors++;
        result.errorDetails.push({
          membershipId: row.membership_id,
          phase: `notice_${daysOut}d`,
          error: sendError.message,
        });
        console.error(`[renewal] ${daysOut}d notice send failed → ${contact.email} (${row.org_name}): ${sendError.message}`);
        continue;
      }

      // Mark this stage sent so a same-day re-run / retry won't re-email it.
      await db.execute(sql`
        UPDATE invoices
        SET    renewal_notice_sent_days = ${daysOut}, updated_at = now()
        WHERE  id = ${row.invoice_id}
      `);

      if (daysOut === 30) result.notices30Sent++;
      else               result.notices7Sent++;

      console.log(`[renewal] ${daysOut}d notice → ${contact.email} (${row.org_name})`);
    } catch (err) {
      result.errors++;
      result.errorDetails.push({
        membershipId: row.membership_id,
        phase: `notice_${daysOut}d`,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

// ── Phase 4: active → past_due ─────────────────────────────────────────────────

async function markPastDue(today: Date, result: RenewalResult): Promise<void> {
  const todayStr = toDateStr(today);

  // Active memberships whose renewal date has passed and have an unpaid invoice.
  // We only transition if an invoice exists — guards against bad data / manual entries.
  const updated = await db.execute(sql`
    UPDATE memberships m
    SET    status = 'past_due', past_due_since = now(), updated_at = now()
    WHERE  m.status = 'active'
      AND  m.renewal_date < ${todayStr}::date
      AND  EXISTS (
        SELECT 1 FROM invoices i
        WHERE  i.membership_id = m.id
          AND  i.status IN ('pending', 'draft')
          AND  i.amount_paid_cents < i.amount_cents
      )
    RETURNING m.id
  `) as Array<{ id: string }>;

  result.markedPastDue = updated.length;
  if (updated.length > 0) {
    console.log(`[renewal] marked past_due: ${updated.length}`);
  }
}

// ── Phase 5: past_due → lapsed (30-day grace period) ──────────────────────────

async function markLapsed(result: RenewalResult): Promise<void> {
  // Lapse only after a full 30-day grace measured from when the membership BECAME
  // past_due, not from renewal_date — otherwise a cron outage could flip a member
  // active→past_due and lapse them in the SAME run (zero grace, no dunning). Rows
  // with no past_due_since (shouldn't occur post-backfill) are skipped, not lapsed.
  const updated = await db.execute(sql`
    UPDATE memberships
    SET    status = 'lapsed', updated_at = now()
    WHERE  status = 'past_due'
      AND  past_due_since IS NOT NULL
      AND  past_due_since < now() - interval '30 days'
    RETURNING id
  `) as Array<{ id: string }>;

  result.markedLapsed = updated.length;
  if (updated.length > 0) {
    console.log(`[renewal] marked lapsed: ${updated.length}`);
  }
}

// ── Contact lookup ─────────────────────────────────────────────────────────────

async function getPrimaryContact(
  orgId: string,
): Promise<{ email: string; firstName: string } | null> {
  const [row] = await db.execute(sql`
    SELECT email, first_name
    FROM   contacts
    WHERE  organization_id = ${orgId}
      AND  email IS NOT NULL
      AND  unsubscribed_at IS NULL
      AND  bounce_count < 3
    ORDER  BY is_primary_contact DESC, created_at ASC
    LIMIT  1
  `) as Array<{ email: string; first_name: string }>;

  if (!row?.email) return null;
  return { email: row.email, firstName: row.first_name };
}

// ── Email template ─────────────────────────────────────────────────────────────

function buildRenewalEmail(opts: {
  firstName:   string;
  orgName:     string;
  tierName:    string;
  renewalDate: string;
  amountCents: number;
  daysOut:     number;
}): string {
  const { firstName, orgName, tierName, renewalDate, amountCents, daysOut } = opts;
  const isUrgent   = daysOut <= 7;
  const amount     = `$${(amountCents / 100).toLocaleString("en-US")}`;
  const accentHex  = isUrgent ? "#dc2626" : "#0C1B33";
  const dateLabel  = new Date(renewalDate + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  });

  const intro = isUrgent
    ? `Your <strong>${orgName}</strong> membership renews in <strong style="color:${accentHex}">${daysOut} days</strong> on ${dateLabel}. Please arrange payment to avoid a lapse in membership benefits.`
    : `Your <strong>${orgName}</strong> membership renews in 30 days on ${dateLabel}. We've prepared your renewal invoice below.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Membership Renewal</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
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
            <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a">Hi ${firstName},</p>
            <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.65">${intro}</p>

            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#f8fafc;border-radius:10px;padding:20px;margin-bottom:24px">
              <tr>
                <td style="font-size:13px;color:#64748b;padding-bottom:10px">Membership tier</td>
                <td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right;padding-bottom:10px">${tierName}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#64748b;padding-bottom:10px">Renewal date</td>
                <td style="font-size:13px;color:#0f172a;font-weight:600;text-align:right;padding-bottom:10px">${dateLabel}</td>
              </tr>
              <tr>
                <td style="font-size:15px;color:#0f172a;font-weight:700;border-top:1px solid #e2e8f0;padding-top:14px">Amount due</td>
                <td style="font-size:15px;font-weight:700;color:${accentHex};text-align:right;border-top:1px solid #e2e8f0;padding-top:14px">${amount}</td>
              </tr>
            </table>

            <div style="text-align:center;margin-bottom:24px">
              <a href="https://medinaohchamber.com/portal"
                 style="display:inline-block;padding:14px 36px;background:${accentHex};color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:.01em">
                Manage My Membership →
              </a>
            </div>

            <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;line-height:1.6">
              Questions? Contact Stephanie Mueller at<br>
              <a href="mailto:stephanie@medinaohchamber.com" style="color:#83BCA9;text-decoration:none">
                stephanie@medinaohchamber.com
              </a>
              or (330)&nbsp;723-8773.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #f1f5f9;text-align:center">
            <p style="margin:0;font-size:12px;color:#94a3b8">
              Greater Medina Chamber of Commerce &middot; 139 N. Court Street, Suite A, Medina, OH 44256
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
