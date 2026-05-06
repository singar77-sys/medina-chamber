"use client";

import { use, useState } from "react";

export default function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error: linkError } = use(searchParams);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setLoading(true);
    try {
      const res = await fetch("/api/portal/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const data = (await res.json()) as { error?: string };
        setFormError(data.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setFormError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-full flex items-center justify-center py-12 px-4"
      style={{ background: "#0C1B33" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/chamber-logos/icon-white.png"
            alt="Medina Chamber"
            className="w-14 h-14 mb-4"
          />
          <h1 className="text-white text-xl font-semibold">Member Portal</h1>
          <p className="text-sm mt-1" style={{ color: "#83BCA9" }}>
            Medina Area Chamber of Commerce
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          {sent ? (
            /* ── Sent state ── */
            <div className="text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
                   style={{ background: "#f0faf6" }}>
                ✉️
              </div>
              <h2 className="text-gray-900 text-lg font-semibold mb-2">
                Check your inbox
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                We sent a login link to{" "}
                <strong className="text-gray-700">{email}</strong>. It expires
                in 15 minutes.
              </p>
              <p className="text-gray-400 text-xs mt-4">
                Don&apos;t see it? Check your spam folder.
              </p>
              <button
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
                className="mt-5 text-sm hover:text-gray-600 transition-colors"
                style={{ color: "#83BCA9" }}
              >
                Use a different email
              </button>
            </div>
          ) : (
            /* ── Login form ── */
            <>
              <h2 className="text-gray-900 text-lg font-semibold mb-1">
                Sign in
              </h2>
              <p className="text-gray-500 text-sm mb-6">
                Enter your member email and we&apos;ll send a login link.
              </p>

              {/* Link error from magic link verification failure */}
              {linkError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200 mb-4">
                  {linkError === "invalid_link"
                    ? "That link has expired or is invalid. Please request a new one."
                    : "We couldn't find your account. Contact the chamber if you need help."}
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                    autoComplete="email"
                    required
                    disabled={loading}
                    placeholder="you@yourbusiness.com"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 disabled:opacity-50"
                    style={{ "--tw-ring-color": "#83BCA9" } as React.CSSProperties}
                  />
                </div>

                {formError && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full py-2.5 text-sm font-semibold text-white rounded-lg transition-opacity disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  style={{ background: "#0C1B33" }}
                >
                  {loading ? "Sending link…" : "Send login link"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "#475569" }}>
          Only registered chamber members can access this portal.
        </p>
      </div>
    </div>
  );
}
