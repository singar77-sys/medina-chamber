/**
 * /portal/billing — invoices + pay dues
 *
 * Server Component: reads the portal session cookie (same guard as the
 * dashboard), fetches this org's invoices from Postgres, and renders them in a
 * table. Each invoice with an open balance gets a PayButton (client island) that
 * starts a Stripe Checkout Session via POST /api/portal/checkout.
 *
 * Stripe redirects back here with ?paid=1 (success) or ?canceled=1 (abandoned);
 * we surface a banner for each. The webhook — not this page — is what actually
 * marks the invoice paid, so a freshly-paid invoice may still read as open until
 * the webhook lands.
 */

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { contacts, organizations, invoices } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { readPortalSession } from "@/lib/portal-session";
import { formatCents, formatDateShort } from "@/lib/format";
import { PortalTopBar } from "@/components/portal/PortalTopBar";
import { PayButton } from "./PayButton";

const INVOICE_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  paid:          { label: "Paid",          bg: "#f0fdf4", color: "#15803d" },
  pending:       { label: "Pending",       bg: "#fefce8", color: "#a16207" },
  past_due:      { label: "Past Due",      bg: "#fef2f2", color: "#b91c1c" },
  draft:         { label: "Draft",         bg: "#f8fafc", color: "#64748b" },
  void:          { label: "Void",          bg: "#f8fafc", color: "#94a3b8" },
  uncollectible: { label: "Uncollectible", bg: "#fef2f2", color: "#b91c1c" },
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PortalBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string; canceled?: string }>;
}) {
  const session = await readPortalSession();
  if (!session) redirect("/portal");

  const { paid, canceled } = await searchParams;

  const [contactRows, orgRows, invoiceRows] = await Promise.all([
    db
      .select({ id: contacts.id })
      .from(contacts)
      .where(eq(contacts.id, session.contactId))
      .limit(1),

    db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, session.organizationId))
      .limit(1),

    db
      .select({
        id: invoices.id,
        description: invoices.description,
        amountCents: invoices.amountCents,
        amountPaidCents: invoices.amountPaidCents,
        status: invoices.status,
        dueDate: invoices.dueDate,
      })
      .from(invoices)
      .where(eq(invoices.organizationId, session.organizationId))
      .orderBy(desc(invoices.createdAt)),
  ]);

  const contact = contactRows[0];
  const org = orgRows[0];
  if (!contact || !org) redirect("/portal");

  return (
    <div className="min-h-full flex flex-col">
      <PortalTopBar links={[{ href: "/portal/dashboard", label: "Dashboard" }]} />

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="flex-1 px-4 sm:px-6 py-8 max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Billing</h1>
          <p className="text-text-secondary text-sm mt-1">{org.name}</p>
        </div>

        {/* Stripe redirect banners */}
        {paid && (
          <div
            className="mb-5 rounded-xl px-4 py-3 text-sm"
            style={{ background: "#f0fdf4", color: "#15803d" }}
          >
            Payment received. It may take a moment to reflect below while we
            confirm with our payment processor.
          </div>
        )}
        {canceled && (
          <div
            className="mb-5 rounded-xl px-4 py-3 text-sm"
            style={{ background: "#fff7ed", color: "#c2410c" }}
          >
            Checkout was canceled. No payment was made.
          </div>
        )}

        <div className="bg-bg-primary rounded-2xl p-6 shadow-sm border border-border-secondary">
          <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-4">
            Invoices
          </h2>

          {invoiceRows.length === 0 ? (
            <p className="text-sm text-text-tertiary text-center py-4">
              No invoices on record yet.
            </p>
          ) : (
            <div className="divide-y divide-border-secondary">
              {invoiceRows.map((inv) => {
                const badge =
                  INVOICE_STATUS[inv.status] ?? {
                    label: inv.status,
                    bg: "#f8fafc",
                    color: "#64748b",
                  };
                const balanceCents = inv.amountCents - inv.amountPaidCents;
                const hasBalance = balanceCents > 0;

                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between py-4 gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-text-primary truncate">
                        {inv.description ?? "Invoice"}
                      </p>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        {inv.dueDate ? `Due ${formatDateShort(inv.dueDate)}` : "—"}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: badge.bg, color: badge.color }}
                      >
                        {badge.label}
                      </span>

                      <div className="text-right">
                        <p className="text-sm font-bold text-text-primary tabular-nums">
                          {formatCents(inv.amountCents)}
                        </p>
                        {hasBalance && inv.amountPaidCents > 0 && (
                          <p className="text-xs text-text-tertiary tabular-nums">
                            {formatCents(balanceCents)} due
                          </p>
                        )}
                      </div>

                      {hasBalance ? (
                        <PayButton
                          invoiceId={inv.id}
                          balanceLabel={formatCents(balanceCents)}
                        />
                      ) : (
                        <span className="w-px" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="text-center py-6 mt-4">
        <p className="text-xs text-text-tertiary">
          Greater Medina Chamber of Commerce &middot; 139 N. Court Street, Suite A, Medina, OH 44256
        </p>
      </footer>
    </div>
  );
}
