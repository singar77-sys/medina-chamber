"use client";

/**
 * RegistrationForm — client island on the DB-driven /events/[slug]/register page.
 *
 * Posts to /api/events/register and handles the three outcomes the engine can
 * return: { status: "confirmed" } and { status: "waitlisted" } resolve inline
 * (the form is replaced with a result card); { url } (a paid ticket) redirects
 * the browser to Stripe Checkout. The route re-validates and re-authorizes
 * everything server-side — this form only shapes the request and shows the
 * result. Member-only tickets are hidden from guests (the route 403s them too).
 */

import { useState } from "react";

export interface FormTicket {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  isMemberOnly: boolean;
  maxQuantity: number | null;
  soldCount: number;
}

const INPUT_CLASS = `
  w-full px-f13 py-f8
  bg-bg-secondary border border-border-primary
  rounded-[var(--radius-sm)]
  text-body-sm text-text-primary
  placeholder:text-text-tertiary
  focus:outline-none focus:border-cambridge
  focus-visible:ring-2 focus-visible:ring-cambridge/40
  transition-colors disabled:opacity-50
`;

function priceLabel(cents: number): string {
  if (!cents) return "Free";
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
}

function ticketRemaining(t: FormTicket): number | null {
  if (t.maxQuantity == null) return null;
  return Math.max(0, t.maxQuantity - t.soldCount);
}

export function RegistrationForm({
  eventId,
  tickets,
  isMember,
  returnSlug,
}: {
  eventId: string;
  tickets: FormTicket[];
  isMember: boolean;
  returnSlug: string;
}) {
  // Guests can't see (or buy) member-only tickets.
  const available = isMember ? tickets : tickets.filter((t) => !t.isMemberOnly);

  const [ticketId, setTicketId] = useState(available[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "confirmed" | "waitlisted" | "error"
  >("idle");
  const [error, setError] = useState("");

  if (available.length === 0) {
    return (
      <div className="bg-bg-primary rounded-2xl p-6 border border-border-secondary">
        <p className="text-body-sm text-text-secondary leading-relaxed">
          This event&apos;s tickets are for chamber members. Please{" "}
          <a href="/portal" className="underline font-bold" style={{ color: "#0C1B33" }}>
            sign in to your member portal
          </a>{" "}
          to register.
        </p>
      </div>
    );
  }

  const selected = available.find((t) => t.id === ticketId) ?? available[0];
  const remaining = ticketRemaining(selected);
  const maxQty = Math.min(remaining ?? 10, 10);
  const total = selected.priceCents * quantity;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError("");

    const body: Record<string, unknown> = {
      eventId,
      ticketId: selected.id,
      quantity,
      returnSlug,
    };
    if (!isMember) {
      body.guestName = guestName;
      body.guestEmail = guestEmail;
    }

    try {
      const res = await fetch("/api/events/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        status?: string;
        error?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "Could not complete registration. Please try again.");
        setStatus("error");
        return;
      }
      if (data.url) {
        window.location.href = data.url; // paid → Stripe Checkout
        return;
      }
      if (data.status === "waitlisted") {
        setStatus("waitlisted");
        return;
      }
      setStatus("confirmed");
    } catch {
      setError("Connection error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "confirmed" || status === "waitlisted") {
    const waitlisted = status === "waitlisted";
    return (
      <div
        className="bg-bg-primary rounded-2xl p-6 border border-border-secondary text-center"
        role="status"
      >
        <div className="text-3xl mb-f8">{waitlisted ? "⏳" : "✅"}</div>
        <h2 className="text-h4 mb-f5">
          {waitlisted ? "You're on the waitlist" : "You're registered!"}
        </h2>
        <p className="text-body-sm text-text-secondary leading-relaxed">
          {waitlisted
            ? "This event is full, so we've added you to the waitlist. We'll email you if a spot opens up — no payment was taken."
            : "We've saved your spot and sent a confirmation email. See you there!"}
        </p>
      </div>
    );
  }

  const submitting = status === "submitting";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ── Ticket selection ────────────────────────────────────────────────── */}
      <fieldset className="bg-bg-primary rounded-2xl p-6 border border-border-secondary">
        <legend className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-4 px-1">
          Select a ticket
        </legend>
        <div className="space-y-2">
          {available.map((t) => {
            const rem = ticketRemaining(t);
            const soldOut = rem === 0;
            return (
              <label
                key={t.id}
                className={`flex items-center justify-between gap-3 p-f13 rounded-[var(--radius-md)] border cursor-pointer transition-colors ${
                  t.id === selected.id
                    ? "border-cambridge bg-surface-cambridge/20"
                    : "border-border-secondary hover:border-border-primary"
                } ${soldOut ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="radio"
                    name="ticket"
                    value={t.id}
                    checked={t.id === selected.id}
                    onChange={() => {
                      setTicketId(t.id);
                      setQuantity(1);
                    }}
                    disabled={soldOut || submitting}
                    className="accent-[#0C1B33]"
                  />
                  <div className="min-w-0">
                    <p className="text-body-sm font-bold text-text-primary truncate">{t.name}</p>
                    {t.description && (
                      <p className="text-caption text-text-tertiary truncate">{t.description}</p>
                    )}
                    {rem != null && rem <= 5 && (
                      <p className="text-caption" style={{ color: soldOut ? "#b91c1c" : "#c2410c" }}>
                        {soldOut ? "Sold out" : `${rem} left`}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-body-sm font-bold text-text-primary shrink-0 tabular-nums">
                  {priceLabel(t.priceCents)}
                </span>
              </label>
            );
          })}
        </div>

        {/* Quantity */}
        <div className="mt-4 flex items-center justify-between">
          <label htmlFor="reg-qty" className="text-body-sm font-bold text-text-primary">
            Quantity
          </label>
          <select
            id="reg-qty"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            disabled={submitting || maxQty < 1}
            className="px-f13 py-f8 bg-bg-secondary border border-border-primary rounded-[var(--radius-sm)] text-body-sm"
          >
            {Array.from({ length: Math.max(1, maxQty) }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      {/* ── Guest details (non-members) ─────────────────────────────────────── */}
      {!isMember && (
        <fieldset className="bg-bg-primary rounded-2xl p-6 border border-border-secondary space-y-4">
          <legend className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-4 px-1">
            Your details
          </legend>
          <div>
            <label htmlFor="reg-name" className="block text-body-sm font-bold text-text-primary mb-f5">
              Full name
            </label>
            <input
              id="reg-name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              required
              autoComplete="name"
              maxLength={200}
              disabled={submitting}
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="reg-email" className="block text-body-sm font-bold text-text-primary mb-f5">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              required
              autoComplete="email"
              maxLength={200}
              disabled={submitting}
              className={INPUT_CLASS}
            />
          </div>
          <p className="text-caption text-text-tertiary">
            Already a member?{" "}
            <a href="/portal" className="underline" style={{ color: "#0C1B33" }}>
              Sign in
            </a>{" "}
            for member pricing.
          </p>
        </fieldset>
      )}

      {/* ── Submit ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="text-body-sm text-text-secondary">
          Total{" "}
          <span className="font-bold text-text-primary tabular-nums">{priceLabel(total)}</span>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="px-f34 py-f13 text-body-sm font-bold text-white bg-oxford hover:bg-oxford/90 rounded-[var(--radius-md)] transition-opacity disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          {submitting ? "Working…" : total > 0 ? "Continue to payment" : "Register"}
        </button>
      </div>

      {status === "error" && (
        <p className="text-body-sm text-right" style={{ color: "#b91c1c" }} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
