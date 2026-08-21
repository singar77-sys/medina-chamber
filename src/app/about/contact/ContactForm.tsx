"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "District of Columbia", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota",
  "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
  "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
] as const;

const COUNTRIES = ["United States", "Canada", "Mexico", "Other"] as const;
const ADDRESS_TYPES = ["Business", "Home", "Mailing", "Billing", "Other"] as const;
const CONTACT_PREFERENCES = ["Email", "Phone", "Mail", "No preference"] as const;

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  organization: "",
  title: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  addressType: "",
  country: "United States",
  phone: "",
  email: "",
  contactPreference: "",
  comments: "",
};

/** Small label + control wrapper so every field lines up identically. */
function Field({
  label,
  htmlFor,
  required = false,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-body-sm font-bold text-text-primary mb-2"
      >
        {label}
        {required && <span className="text-accent"> *</span>}
      </label>
      {children}
    </div>
  );
}

export function ContactForm() {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  // Honeypot — a hidden field real users never see. Bots autofill
  // every input; if this isn't empty on submit, the server drops
  // the request silently.
  const [websiteConfirm, setWebsiteConfirm] = useState("");
  // Form-load timestamp — paired with server-side MIN_FILL_MS check
  // to reject spam bots that submit instantly.
  const [formLoadedAt] = useState(() => Date.now());
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const loading = status === "loading";
  const set =
    (key: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          website_confirm: websiteConfirm,
          formLoadedAt,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong. Please try again.");
        setStatus("error");
      } else {
        setStatus("success");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-start gap-4 py-12">
        <div className="w-12 h-12 rounded-full bg-cambridge/20 flex items-center justify-center">
          <svg className="w-6 h-6 text-cambridge" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h2 className="text-h2">Message sent!</h2>
        <p className="text-body text-text-secondary max-w-md">
          Thanks for reaching out. Someone from the Chamber will get back to you
          within one business day.
        </p>
        <button
          onClick={() => {
            setStatus("idle");
            setForm({ ...EMPTY_FORM });
          }}
          className="text-body-sm text-cambridge hover:underline mt-2"
        >
          Send another message
        </button>
      </div>
    );
  }

  const controlClass = `
    w-full px-4 py-3
    bg-bg-secondary border border-border-secondary
    rounded-[var(--radius-md)]
    text-body text-text-primary placeholder:text-text-tertiary
    focus:outline-none focus:ring-2 focus:ring-cambridge/40 focus:border-cambridge
    disabled:opacity-50 transition-colors
  `;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Honeypot. Hidden from real users via aria/tabindex/visibility —
          bots that naively fill every input will trip the server-side
          check and get a silent 200. Named plausibly so field-harvesters
          don't skip it. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor="contact-website-confirm">Website (leave blank)</label>
        <input
          id="contact-website-confirm"
          type="text"
          name="website_confirm"
          tabIndex={-1}
          autoComplete="off"
          value={websiteConfirm}
          onChange={(e) => setWebsiteConfirm(e.target.value)}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="First Name" htmlFor="cf-first" required>
          <input id="cf-first" type="text" required autoComplete="given-name" maxLength={100}
            value={form.firstName} onChange={set("firstName")} disabled={loading} className={controlClass} />
        </Field>
        <Field label="Last Name" htmlFor="cf-last" required>
          <input id="cf-last" type="text" required autoComplete="family-name" maxLength={100}
            value={form.lastName} onChange={set("lastName")} disabled={loading} className={controlClass} />
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Organization" htmlFor="cf-org">
          <input id="cf-org" type="text" autoComplete="organization" maxLength={200}
            value={form.organization} onChange={set("organization")} disabled={loading} className={controlClass} />
        </Field>
        <Field label="Title" htmlFor="cf-title">
          <input id="cf-title" type="text" autoComplete="organization-title" maxLength={200}
            value={form.title} onChange={set("title")} disabled={loading} className={controlClass} />
        </Field>
      </div>

      <Field label="Address Line 1" htmlFor="cf-addr1">
        <input id="cf-addr1" type="text" autoComplete="address-line1" maxLength={200}
          value={form.addressLine1} onChange={set("addressLine1")} disabled={loading} className={controlClass} />
      </Field>

      <Field label="Address Line 2" htmlFor="cf-addr2">
        <input id="cf-addr2" type="text" autoComplete="address-line2" maxLength={200}
          value={form.addressLine2} onChange={set("addressLine2")} disabled={loading} className={controlClass} />
      </Field>

      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="City" htmlFor="cf-city">
          <input id="cf-city" type="text" autoComplete="address-level2" maxLength={100}
            value={form.city} onChange={set("city")} disabled={loading} className={controlClass} />
        </Field>
        <Field label="State" htmlFor="cf-state">
          <select id="cf-state" autoComplete="address-level1"
            value={form.state} onChange={set("state")} disabled={loading} className={controlClass}>
            <option value="">Select a state</option>
            {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Postal Code" htmlFor="cf-zip">
          <input id="cf-zip" type="text" autoComplete="postal-code" maxLength={20}
            value={form.postalCode} onChange={set("postalCode")} disabled={loading} className={controlClass} />
        </Field>
        <Field label="Address Type" htmlFor="cf-addrtype">
          <select id="cf-addrtype"
            value={form.addressType} onChange={set("addressType")} disabled={loading} className={controlClass}>
            <option value="">Select a type</option>
            {ADDRESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Country" htmlFor="cf-country">
          <select id="cf-country" autoComplete="country-name"
            value={form.country} onChange={set("country")} disabled={loading} className={controlClass}>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Phone" htmlFor="cf-phone">
          <input id="cf-phone" type="tel" autoComplete="tel" maxLength={50} placeholder="(330) 555-0100"
            value={form.phone} onChange={set("phone")} disabled={loading} className={controlClass} />
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Email" htmlFor="cf-email" required>
          <input id="cf-email" type="email" required autoComplete="email" maxLength={320} placeholder="you@example.com"
            value={form.email} onChange={set("email")} disabled={loading} className={controlClass} />
        </Field>
        <Field label="Contact Preference" htmlFor="cf-pref">
          <select id="cf-pref"
            value={form.contactPreference} onChange={set("contactPreference")} disabled={loading} className={controlClass}>
            <option value="">Select a preference</option>
            {CONTACT_PREFERENCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Comments" htmlFor="cf-comments" required>
        <textarea id="cf-comments" required rows={6} maxLength={5000} placeholder="How can we help?"
          value={form.comments} onChange={set("comments")} disabled={loading} className={`${controlClass} resize-none`} />
      </Field>

      {status === "error" && (
        <p className="text-body-sm text-red-500">{errorMsg}</p>
      )}

      <p className="text-caption text-text-tertiary">
        Your information is used to respond to your inquiry.{" "}
        <a href="/privacy" className="underline hover:text-text-secondary transition-colors">
          Privacy Policy
        </a>
      </p>

      <button
        type="submit"
        disabled={loading}
        className="
          inline-flex items-center gap-2 px-8 py-4
          bg-accent hover:bg-accent-hover disabled:opacity-50
          text-white font-bold text-body-sm
          rounded-[var(--radius-md)]
          transition-colors
        "
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Sending…
          </>
        ) : (
          "Send Message →"
        )}
      </button>
    </form>
  );
}
