"use client";

/**
 * PayButton — client island on the otherwise-server billing page.
 *
 * POSTs the invoiceId to /api/portal/checkout and, on success, sends the browser
 * to the Stripe-hosted Checkout URL returned by the route. The page itself stays
 * a server component; only this button needs client-side interactivity.
 */

import { useState } from "react";

export function PayButton({
  invoiceId,
  balanceLabel,
}: {
  invoiceId: string;
  balanceLabel: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });

      if (!res.ok) {
        setError("Could not start checkout. Please try again.");
        setLoading(false);
        return;
      }

      const data = (await res.json()) as { url?: string };
      if (data.url) {
        window.location.href = data.url;
        return; // keep the button disabled through the redirect
      }

      setError("Could not start checkout. Please try again.");
      setLoading(false);
    } catch {
      setError("Could not start checkout. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handlePay}
        disabled={loading}
        className="text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-opacity disabled:opacity-60"
        style={{ background: "#0C1B33" }}
      >
        {loading ? "Starting…" : `Pay ${balanceLabel}`}
      </button>
      {error && (
        <span className="text-xs" style={{ color: "#b91c1c" }}>
          {error}
        </span>
      )}
    </div>
  );
}
