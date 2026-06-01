"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Login failed.");
        setPassword("");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-oxford">
      <div className="w-full max-w-sm mx-f13">
        {/* Logo */}
        <div className="flex flex-col items-center mb-f34">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/chamber-logos/icon-white.png"
            alt="Medina Chamber"
            className="w-f55 h-f55 mb-f13"
          />
          <h1 className="text-white text-h4">Chamber Admin</h1>
          <p className="text-cambridge text-body-sm mt-f3">
            Hunter Systems
          </p>
        </div>

        {/* Card */}
        <div className="bg-bg-primary rounded-[var(--radius-lg)] p-f34 shadow-[var(--shadow-lg)]">
          <h2 className="text-h4 mb-f3">Sign in</h2>
          <p className="text-text-tertiary text-body-sm mb-f21">
            Use your admin password to continue.
          </p>

          <form onSubmit={handleSubmit} className="space-y-f13">
            <div>
              <label className="block text-body-sm font-bold text-text-primary mb-f5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                autoComplete="current-password"
                required
                disabled={loading}
                className="
                  w-full px-f13 py-f8
                  bg-bg-secondary border border-border-primary
                  rounded-[var(--radius-sm)]
                  text-body-sm text-text-primary
                  focus:outline-none focus:border-cambridge
                  focus-visible:ring-2 focus-visible:ring-cambridge/40
                  transition-colors disabled:opacity-50
                "
              />
            </div>

            {error && (
              <p className="text-body-sm text-red-600 bg-red-50 px-f13 py-f8 rounded-[var(--radius-sm)] border border-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="
                w-full py-f13
                text-body-sm font-bold text-white
                bg-oxford hover:bg-oxford/90
                rounded-[var(--radius-md)]
                transition-opacity disabled:opacity-40
              "
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-caption mt-f21 text-text-tertiary">
          Restricted access, authorized personnel only
        </p>
      </div>
    </div>
  );
}
