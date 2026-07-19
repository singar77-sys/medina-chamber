"use client";

/**
 * JoinFlow — the self-serve join: pick a tier → enter details → Stripe Checkout.
 *
 * Posts to /api/join, which creates the pending member and returns a Checkout
 * URL we redirect to. Preserves the anti-spam from the old apply form verbatim:
 * the off-screen honeypot (website_confirm) and the form-load timestamp
 * (formLoadedAt) the server checks against MIN_FILL_MS.
 *
 * DORMANT by design (go-live strategy, commit 0e19bca): the join CTA points
 * to GrowthZone until the backend cutover. Intentionally unimported — do not
 * remove in dead-code sweeps.
 */

import { useState } from "react";

export interface JoinTier {
  slug: string;
  name: string;
  price: number; // dollars/year
  tagline?: string;
  featured?: boolean;
}

const inputClass = `
  w-full px-4 py-3 bg-bg-primary border border-border-secondary rounded-[var(--radius-md)]
  text-body text-text-primary placeholder:text-text-tertiary
  focus:outline-none focus:border-cambridge focus-visible:ring-2 focus-visible:ring-cambridge/40
  transition-colors
`;
const labelClass = "block text-body-sm font-bold text-text-primary mb-1.5";

export function JoinFlow({ tiers }: { tiers: JoinTier[] }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [tier, setTier] = useState<string>(tiers.find((t) => t.featured)?.slug ?? tiers[0]?.slug ?? "");
  const [form, setForm] = useState({
    businessName: "",
    firstName: "",
    lastName: "",
    title: "",
    email: "",
    phone: "",
    website: "",
    address1: "",
    city: "",
    state: "OH",
    zip: "",
  });
  const [websiteConfirm, setWebsiteConfirm] = useState("");
  const [formLoadedAt] = useState(() => Date.now());
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const selectedTier = tiers.find((t) => t.slug === tier);

  function change(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tier, website_confirm: websiteConfirm, formLoadedAt }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && data.url) {
        window.location.href = data.url; // Stripe Checkout
        return;
      }
      setErrorMsg(data.error ?? "Something went wrong. Please try again.");
      setStatus("error");
    } catch {
      setErrorMsg("Connection error. Please try again.");
      setStatus("error");
    }
  }

  // ── Step 1: tier selection ───────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="max-w-3xl">
        <p className="text-body text-text-secondary mb-f21">
          Choose your membership level. You can upgrade anytime as your needs grow.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {tiers.map((t) => {
            const active = t.slug === tier;
            return (
              <button
                key={t.slug}
                type="button"
                onClick={() => setTier(t.slug)}
                className={`text-left p-f21 rounded-[var(--radius-lg)] border-2 transition-colors ${
                  active ? "border-cambridge bg-surface-cambridge/20" : "border-border-secondary hover:border-border-primary"
                }`}
              >
                {t.featured && (
                  <span className="inline-block text-caption font-bold uppercase tracking-wider text-cambridge mb-2">
                    Most popular
                  </span>
                )}
                <h3 className="text-h4">{t.name}</h3>
                <p className="text-h3 mt-1">
                  ${t.price}
                  <span className="text-body-sm text-text-tertiary font-normal">/year</span>
                </p>
                {t.tagline && (
                  <p className="text-body-sm text-text-secondary mt-2 leading-relaxed">{t.tagline}</p>
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setStep(2)}
          disabled={!tier}
          className="mt-f34 inline-flex items-center gap-2 px-8 py-4 bg-accent hover:bg-accent-hover disabled:opacity-60 text-white font-bold text-body rounded-[var(--radius-md)] transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          Continue →
        </button>
      </div>
    );
  }

  // ── Step 2: details → checkout ───────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between p-f13 bg-bg-secondary border border-border-secondary rounded-[var(--radius-md)]">
        <p className="text-body-sm">
          <span className="font-bold text-text-primary">{selectedTier?.name}</span>
          <span className="text-text-tertiary"> · ${selectedTier?.price}/year</span>
        </p>
        <button
          type="button"
          onClick={() => setStep(1)}
          className="text-body-sm font-bold text-cambridge hover:text-cambridge/80"
        >
          Change
        </button>
      </div>

      {/* Honeypot — off-screen; bots fill it, real users never see it. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor="join-website-confirm">Website (leave blank)</label>
        <input
          id="join-website-confirm"
          type="text"
          name="website_confirm"
          tabIndex={-1}
          autoComplete="off"
          value={websiteConfirm}
          onChange={(e) => setWebsiteConfirm(e.target.value)}
        />
      </div>

      <div>
        <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-4">Business</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="businessName" className={labelClass}>Business name <span className="text-accent">*</span></label>
            <input id="businessName" name="businessName" required value={form.businessName} onChange={change} className={inputClass} placeholder="Acme Co." />
          </div>
          <div>
            <label htmlFor="website" className={labelClass}>Website</label>
            <input id="website" name="website" type="url" value={form.website} onChange={change} className={inputClass} placeholder="https://yoursite.com" />
          </div>
          <div>
            <label htmlFor="address1" className={labelClass}>Street address</label>
            <input id="address1" name="address1" value={form.address1} onChange={change} className={inputClass} placeholder="123 Main Street" />
          </div>
          <div>
            <label htmlFor="city" className={labelClass}>City</label>
            <input id="city" name="city" value={form.city} onChange={change} className={inputClass} placeholder="Medina" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="state" className={labelClass}>State</label>
              <input id="state" name="state" value={form.state} onChange={change} className={inputClass} maxLength={2} />
            </div>
            <div>
              <label htmlFor="zip" className={labelClass}>ZIP</label>
              <input id="zip" name="zip" value={form.zip} onChange={change} className={inputClass} maxLength={10} placeholder="44256" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-4">Primary contact</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className={labelClass}>First name <span className="text-accent">*</span></label>
            <input id="firstName" name="firstName" required value={form.firstName} onChange={change} className={inputClass} placeholder="Jane" />
          </div>
          <div>
            <label htmlFor="lastName" className={labelClass}>Last name <span className="text-accent">*</span></label>
            <input id="lastName" name="lastName" required value={form.lastName} onChange={change} className={inputClass} placeholder="Smith" />
          </div>
          <div>
            <label htmlFor="title" className={labelClass}>Title / role</label>
            <input id="title" name="title" value={form.title} onChange={change} className={inputClass} placeholder="Owner, Manager…" />
          </div>
          <div>
            <label htmlFor="phone" className={labelClass}>Phone <span className="text-accent">*</span></label>
            <input id="phone" name="phone" type="tel" required value={form.phone} onChange={change} className={inputClass} placeholder="(330) 555-0100" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="email" className={labelClass}>Email <span className="text-accent">*</span></label>
            <input id="email" name="email" type="email" required value={form.email} onChange={change} className={inputClass} placeholder="jane@yourcompany.com" />
            <p className="text-caption text-text-tertiary mt-1.5">This becomes your member portal sign-in.</p>
          </div>
        </div>
      </div>

      {status === "error" && <p className="text-body-sm text-accent">{errorMsg}</p>}

      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex items-center gap-2 px-8 py-4 bg-accent hover:bg-accent-hover disabled:opacity-60 text-white font-bold text-body rounded-[var(--radius-md)] transition-colors cursor-pointer disabled:cursor-not-allowed"
      >
        {status === "sending" ? "Starting checkout…" : `Continue to payment — $${selectedTier?.price}`}
      </button>
      <p className="text-caption text-text-tertiary">
        Secure payment via Stripe. Your membership activates as soon as payment clears, and we&apos;ll email your portal link.
      </p>
    </form>
  );
}
