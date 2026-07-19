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
    <div className="min-h-full flex items-center justify-center py-f89 px-f13 bg-oxford">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-f34">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/chamber-logos/icon-white.png"
            alt="Medina Chamber"
            className="w-f55 h-f55 mb-f13"
          />
          <h1 className="text-white text-h4">Member Portal</h1>
          <p className="text-cambridge text-body-sm mt-f3">
            Greater Medina Chamber of Commerce
          </p>
        </div>

        {/* Card */}
        <div className="bg-bg-primary rounded-[var(--radius-lg)] p-f34 shadow-[var(--shadow-lg)]">
          {sent ? (
            /* ── Sent state ── */
            <div className="text-center">
              <div className="w-f34 h-f34 rounded-full flex items-center justify-center mx-auto mb-f13 text-2xl bg-surface-cambridge">
                ✉️
              </div>
              <h2 className="text-h4 mb-f5">
                Check your inbox
              </h2>
              <p className="text-text-tertiary text-body-sm leading-relaxed">
                We sent a login link to{" "}
                <strong className="text-text-secondary">{email}</strong>. It
                expires in 15 minutes.
              </p>
              <p className="text-text-tertiary text-caption mt-f13">
                Don&apos;t see it? Check your spam folder.
              </p>
              <button
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
                className="mt-f13 text-body-sm text-cambridge hover:text-cambridge/80 transition-colors"
              >
                Use a different email
              </button>
            </div>
          ) : (
            /* ── Login form ── */
            <>
              <h2 className="text-h4 mb-f3">Sign in</h2>
              <p className="text-text-tertiary text-body-sm mb-f21">
                Enter your member email and we&apos;ll send a login link.
              </p>

              {/* Link error from magic link verification failure */}
              {linkError && (
                <p className="text-body-sm text-red-600 bg-red-50 px-f13 py-f8 rounded-[var(--radius-sm)] border border-red-200 mb-f13">
                  That link has expired or is invalid. Please request a new one.
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-f13">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-body-sm font-bold text-text-primary mb-f5"
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
                    className="
                      w-full px-f13 py-f8
                      bg-bg-secondary border border-border-primary
                      rounded-[var(--radius-sm)]
                      text-body-sm text-text-primary
                      placeholder:text-text-tertiary
                      focus:outline-none focus:border-cambridge
                      focus-visible:ring-2 focus-visible:ring-cambridge/40
                      transition-colors disabled:opacity-50
                    "
                  />
                </div>

                {formError && (
                  <p className="text-body-sm text-red-600 bg-red-50 px-f13 py-f8 rounded-[var(--radius-sm)] border border-red-200">
                    {formError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="
                    w-full py-f13
                    text-body-sm font-bold text-white
                    bg-oxford hover:bg-oxford/90
                    rounded-[var(--radius-md)]
                    transition-opacity disabled:opacity-40
                    cursor-pointer disabled:cursor-not-allowed
                  "
                >
                  {loading ? "Sending link…" : "Send login link"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-caption mt-f21 text-text-tertiary">
          Only registered chamber members can access this portal.
        </p>
      </div>
    </div>
  );
}
