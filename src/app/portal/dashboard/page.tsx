/**
 * /portal/dashboard — member home
 *
 * Server Component: reads session cookie, verifies it, fetches member
 * data from Postgres, and renders the portal shell inline. No client JS
 * required except the logout form POST.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  contacts,
  organizations,
  memberships,
  membershipTiers,
  invoices,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { verifyPortalSession, PORTAL_COOKIE } from "@/lib/portal-session";

// ── Auth helpers ───────────────────────────────────────────────────────────────

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE)?.value;
  if (!token) return null;
  return verifyPortalSession(token);
}

// ── Formatting ─────────────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ── Badge helpers ──────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<
  string,
  { label: string; bg: string; color: string }
> = {
  active:    { label: "Active",    bg: "#f0fdf4", color: "#15803d" },
  trial:     { label: "Trial",     bg: "#eff6ff", color: "#1d4ed8" },
  pending:   { label: "Pending",   bg: "#fefce8", color: "#a16207" },
  past_due:  { label: "Past Due",  bg: "#fff7ed", color: "#c2410c" },
  lapsed:    { label: "Lapsed",    bg: "#fef2f2", color: "#b91c1c" },
  cancelled: { label: "Cancelled", bg: "#f8fafc", color: "#64748b" },
};

const TIER_BADGE: Record<string, { bg: string; color: string }> = {
  standard:           { bg: "#f1f5f9", color: "#334155" },
  visibility_plus:    { bg: "#eff6ff", color: "#1e40af" },
  community_investor: { bg: "#fffbeb", color: "#92400e" },
};

const INVOICE_STATUS: Record<
  string,
  { label: string; color: string }
> = {
  paid:         { label: "Paid",         color: "#15803d" },
  pending:      { label: "Pending",      color: "#a16207" },
  past_due:     { label: "Past Due",     color: "#b91c1c" },
  draft:        { label: "Draft",        color: "#64748b" },
  void:         { label: "Void",         color: "#94a3b8" },
  uncollectible:{ label: "Uncollectible",color: "#b91c1c" },
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function PortalDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/portal");

  // Fetch all member data in one round trip
  const [
    contactRows,
    orgRows,
    membershipRows,
    invoiceRows,
  ] = await Promise.all([
    db
      .select({
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        title: contacts.title,
        isPrimaryContact: contacts.isPrimaryContact,
        portalClaimedAt: contacts.portalClaimedAt,
      })
      .from(contacts)
      .where(eq(contacts.id, session.contactId))
      .limit(1),

    db
      .select({
        name: organizations.name,
        logoUrl: organizations.logoUrl,
        phone: organizations.phone,
        email: organizations.email,
        websiteUrl: organizations.websiteUrl,
        address1: organizations.address1,
        city: organizations.city,
        state: organizations.state,
        zip: organizations.zip,
        membershipTier: organizations.membershipTier,
        status: organizations.status,
      })
      .from(organizations)
      .where(eq(organizations.id, session.organizationId))
      .limit(1),

    db
      .select({
        status: memberships.status,
        billingCycle: memberships.billingCycle,
        startDate: memberships.startDate,
        renewalDate: memberships.renewalDate,
        tierName: membershipTiers.name,
        tierSlug: membershipTiers.slug,
        annualPriceCents: membershipTiers.annualPriceCents,
      })
      .from(memberships)
      .leftJoin(membershipTiers, eq(memberships.tierId, membershipTiers.id))
      .where(eq(memberships.organizationId, session.organizationId))
      .orderBy(desc(memberships.createdAt))
      .limit(1),

    db
      .select({
        id: invoices.id,
        amountCents: invoices.amountCents,
        amountPaidCents: invoices.amountPaidCents,
        status: invoices.status,
        description: invoices.description,
        dueDate: invoices.dueDate,
        paidAt: invoices.paidAt,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .where(eq(invoices.organizationId, session.organizationId))
      .orderBy(desc(invoices.createdAt))
      .limit(5),
  ]);

  const contact = contactRows[0];
  const org = orgRows[0];

  if (!contact || !org) redirect("/portal");

  const membership = membershipRows[0] ?? null;
  const memberStatus = membership?.status ?? null;
  const statusBadge = memberStatus ? STATUS_BADGE[memberStatus] : null;
  const tierBadge =
    membership?.tierSlug ? TIER_BADGE[membership.tierSlug] ?? TIER_BADGE.standard : null;

  return (
    <div className="min-h-full flex flex-col">
      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3 shrink-0"
        style={{ background: "#0C1B33", borderBottom: "1px solid rgba(255,255,255,.08)" }}
      >
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/chamber-logos/icon-white.png"
            alt="Medina Chamber"
            className="w-7 h-7"
          />
          <span className="text-white text-sm font-bold hidden sm:block">
            Member Portal
          </span>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="/portal/billing"
            className="text-sm hover:underline"
            style={{ color: "#83BCA9" }}
          >
            Billing
          </a>
          <a
            href="/portal/profile"
            className="text-sm hover:underline"
            style={{ color: "#83BCA9" }}
          >
            Profile
          </a>
          <span className="text-sm hidden sm:inline" style={{ color: "#83BCA9" }}>
            {contact.firstName} {contact.lastName}
          </span>
          <form action="/api/portal/auth/logout" method="post">
            <button
              type="submit"
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{ background: "rgba(255,255,255,.08)", color: "#cbd5e1" }}
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="flex-1 px-4 sm:px-6 py-8 max-w-4xl mx-auto w-full">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary">
            Welcome back, {contact.firstName}
          </h1>
          <p className="text-text-secondary text-sm mt-1">{org.name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {/* ── Membership card ──────────────────────────────────────────── */}
          <div className="bg-bg-primary rounded-2xl p-6 shadow-sm border border-border-secondary">
            <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-4">
              Membership
            </h2>

            {membership ? (
              <div className="space-y-3">
                {/* Tier */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Plan</span>
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={
                      tierBadge
                        ? { background: tierBadge.bg, color: tierBadge.color }
                        : { background: "#f1f5f9", color: "#334155" }
                    }
                  >
                    {membership.tierName ?? "—"}
                  </span>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Status</span>
                  {statusBadge ? (
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ background: statusBadge.bg, color: statusBadge.color }}
                    >
                      {statusBadge.label}
                    </span>
                  ) : (
                    <span className="text-sm text-text-tertiary">—</span>
                  )}
                </div>

                {/* Annual rate */}
                {membership.annualPriceCents != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Annual dues</span>
                    <span className="text-sm font-bold text-text-primary">
                      {formatCents(membership.annualPriceCents)}
                    </span>
                  </div>
                )}

                {/* Renewal date */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Renews</span>
                  <span className="text-sm text-text-primary">
                    {formatDate(membership.renewalDate)}
                  </span>
                </div>

                {/* Member since */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Member since</span>
                  <span className="text-sm text-text-primary">
                    {formatDate(membership.startDate)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-text-tertiary leading-relaxed">
                  Membership record not found.
                  <br />
                  <a
                    href="mailto:office@medinaohchamber.com"
                    className="underline hover:no-underline"
                    style={{ color: "#83BCA9" }}
                  >
                    Contact the chamber
                  </a>{" "}
                  for help.
                </p>
              </div>
            )}
          </div>

          {/* ── Contact card ─────────────────────────────────────────────── */}
          <div className="bg-bg-primary rounded-2xl p-6 shadow-sm border border-border-secondary">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-wider">
                Your Profile
              </h2>
              <a
                href="/portal/profile"
                className="text-xs font-bold hover:underline"
                style={{ color: "#0C1B33" }}
              >
                Edit
              </a>
            </div>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm text-text-secondary shrink-0">Name</span>
                <span className="text-sm text-text-primary text-right">
                  {contact.firstName} {contact.lastName}
                </span>
              </div>

              {contact.title && (
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm text-text-secondary shrink-0">Title</span>
                  <span className="text-sm text-text-primary text-right">
                    {contact.title}
                  </span>
                </div>
              )}

              {contact.email && (
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm text-text-secondary shrink-0">Email</span>
                  <span className="text-sm text-text-primary text-right break-all">
                    {contact.email}
                  </span>
                </div>
              )}

              {org.phone && (
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm text-text-secondary shrink-0">Phone</span>
                  <span className="text-sm text-text-primary">{org.phone}</span>
                </div>
              )}

              {org.websiteUrl && (
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm text-text-secondary shrink-0">Website</span>
                  <a
                    href={org.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-right break-all hover:underline"
                    style={{ color: "#0C1B33" }}
                  >
                    {org.websiteUrl.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}

              {contact.isPrimaryContact && (
                <div className="pt-1">
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: "#f0fdf4", color: "#15803d" }}
                  >
                    Primary contact
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Invoices ───────────────────────────────────────────────────── */}
        <div className="bg-bg-primary rounded-2xl p-6 shadow-sm border border-border-secondary">
          <h2 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-4">
            Recent Invoices
          </h2>

          {invoiceRows.length === 0 ? (
            <p className="text-sm text-text-tertiary text-center py-4">
              No invoices on record yet.
            </p>
          ) : (
            <div className="divide-y divide-border-secondary">
              {invoiceRows.map((inv) => {
                const badge = INVOICE_STATUS[inv.status] ?? { label: inv.status, color: "#64748b" };
                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between py-3 gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-text-primary truncate">
                        {inv.description ?? "Invoice"}
                      </p>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        {inv.dueDate
                          ? `Due ${formatDate(inv.dueDate)}`
                          : formatDate(inv.createdAt?.toISOString().slice(0, 10))}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className="text-xs font-bold"
                        style={{ color: badge.color }}
                      >
                        {badge.label}
                      </span>
                      <span className="text-sm font-bold text-text-primary tabular-nums">
                        {formatCents(inv.amountCents)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Quick links ────────────────────────────────────────────────── */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a
            href="/membership/directory"
            className="flex items-center gap-3 bg-bg-primary rounded-xl px-5 py-4 shadow-sm border border-border-secondary hover:border-border-primary transition-colors group"
          >
            <span className="text-xl">🗂️</span>
            <div>
              <p className="text-sm font-bold text-text-primary hover:text-text-secondary">
                Member Directory
              </p>
              <p className="text-xs text-text-tertiary">Browse all members</p>
            </div>
          </a>

          <a
            href="/events"
            className="flex items-center gap-3 bg-bg-primary rounded-xl px-5 py-4 shadow-sm border border-border-secondary hover:border-border-primary transition-colors group"
          >
            <span className="text-xl">📅</span>
            <div>
              <p className="text-sm font-bold text-text-primary hover:text-text-secondary">
                Events
              </p>
              <p className="text-xs text-text-tertiary">Upcoming chamber events</p>
            </div>
          </a>

          <a
            href="mailto:office@medinaohchamber.com"
            className="flex items-center gap-3 bg-bg-primary rounded-xl px-5 py-4 shadow-sm border border-border-secondary hover:border-border-primary transition-colors group"
          >
            <span className="text-xl">✉️</span>
            <div>
              <p className="text-sm font-bold text-text-primary hover:text-text-secondary">
                Contact Us
              </p>
              <p className="text-xs text-text-tertiary">office@medinaohchamber.com</p>
            </div>
          </a>
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
