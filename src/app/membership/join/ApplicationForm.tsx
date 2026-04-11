"use client";

import { useState } from "react";

const EMPLOYEE_OPTIONS = [
  { value: "1", label: "1 — Sole proprietor / just me" },
  { value: "2-5", label: "2–5 employees" },
  { value: "6-10", label: "6–10 employees" },
  { value: "11-25", label: "11–25 employees" },
  { value: "26-50", label: "26–50 employees" },
  { value: "51-100", label: "51–100 employees" },
  { value: "100+", label: "100+ employees" },
];

const REFERRAL_OPTIONS = [
  "Referred by a member",
  "Attended a Chamber event",
  "Search engine (Google, etc.)",
  "Social media",
  "Word of mouth",
  "Chamber staff reached out",
  "Other",
];

export function ApplicationForm() {
  const [form, setForm] = useState({
    businessName: "",
    contactName: "",
    title: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    state: "OH",
    zip: "",
    employees: "",
    category: "",
    referral: "",
    notes: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unknown error");
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "sent") {
    return (
      <div className="p-10 bg-bg-secondary border border-border-secondary rounded-[var(--radius-lg)] text-center max-w-xl">
        <div className="w-12 h-12 rounded-full bg-cambridge/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-cambridge" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h3 className="text-h3">Application received.</h3>
        <p className="text-body text-text-secondary mt-3">
          Thanks for applying. Jaclyn or Stephanie will reach out within two
          business days to walk you through next steps.
        </p>
      </div>
    );
  }

  const inputClass = `
    w-full px-4 py-3
    bg-bg-primary border border-border-secondary
    rounded-[var(--radius-md)]
    text-body text-text-primary
    placeholder:text-text-tertiary
    focus:outline-none focus:border-cambridge
    transition-colors
  `;

  const labelClass = "block text-body-sm font-bold text-text-primary mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Business info */}
      <div>
        <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-4">
          Business Information
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="businessName" className={labelClass}>
              Business / Organization Name <span className="text-accent">*</span>
            </label>
            <input
              id="businessName"
              name="businessName"
              type="text"
              required
              value={form.businessName}
              onChange={handleChange}
              className={inputClass}
              placeholder="Acme Co."
            />
          </div>
          <div>
            <label htmlFor="category" className={labelClass}>
              Business Category
            </label>
            <input
              id="category"
              name="category"
              type="text"
              value={form.category}
              onChange={handleChange}
              className={inputClass}
              placeholder="Healthcare, Retail, Legal…"
            />
          </div>
          <div>
            <label htmlFor="employees" className={labelClass}>
              Number of Employees <span className="text-accent">*</span>
            </label>
            <select
              id="employees"
              name="employees"
              required
              value={form.employees}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="">Select…</option>
              {EMPLOYEE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="website" className={labelClass}>
              Website
            </label>
            <input
              id="website"
              name="website"
              type="url"
              value={form.website}
              onChange={handleChange}
              className={inputClass}
              placeholder="https://yoursite.com"
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div>
        <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-4">
          Business Address
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="address" className={labelClass}>
              Street Address
            </label>
            <input
              id="address"
              name="address"
              type="text"
              value={form.address}
              onChange={handleChange}
              className={inputClass}
              placeholder="123 Main Street"
            />
          </div>
          <div>
            <label htmlFor="city" className={labelClass}>
              City
            </label>
            <input
              id="city"
              name="city"
              type="text"
              value={form.city}
              onChange={handleChange}
              className={inputClass}
              placeholder="Medina"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="state" className={labelClass}>
                State
              </label>
              <input
                id="state"
                name="state"
                type="text"
                value={form.state}
                onChange={handleChange}
                className={inputClass}
                placeholder="OH"
                maxLength={2}
              />
            </div>
            <div>
              <label htmlFor="zip" className={labelClass}>
                ZIP
              </label>
              <input
                id="zip"
                name="zip"
                type="text"
                value={form.zip}
                onChange={handleChange}
                className={inputClass}
                placeholder="44256"
                maxLength={10}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Contact info */}
      <div>
        <p className="text-caption text-cambridge font-bold uppercase tracking-wider mb-4">
          Primary Contact
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="contactName" className={labelClass}>
              Full Name <span className="text-accent">*</span>
            </label>
            <input
              id="contactName"
              name="contactName"
              type="text"
              required
              value={form.contactName}
              onChange={handleChange}
              className={inputClass}
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <label htmlFor="title" className={labelClass}>
              Title / Role
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              className={inputClass}
              placeholder="Owner, CEO, Manager…"
            />
          </div>
          <div>
            <label htmlFor="email" className={labelClass}>
              Email <span className="text-accent">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              className={inputClass}
              placeholder="jane@yourcompany.com"
            />
          </div>
          <div>
            <label htmlFor="phone" className={labelClass}>
              Phone <span className="text-accent">*</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              value={form.phone}
              onChange={handleChange}
              className={inputClass}
              placeholder="(330) 555-0100"
            />
          </div>
        </div>
      </div>

      {/* Referral + notes */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="referral" className={labelClass}>
            How did you hear about us?
          </label>
          <select
            id="referral"
            name="referral"
            value={form.referral}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="">Select…</option>
            {REFERRAL_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="notes" className={labelClass}>
            Anything else we should know?
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={form.notes}
            onChange={handleChange}
            className={`${inputClass} resize-none`}
            placeholder="Questions, specific programs you're interested in, etc."
          />
        </div>
      </div>

      {status === "error" && (
        <p className="text-body-sm text-accent">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="
          inline-flex items-center gap-2 px-8 py-4
          bg-accent hover:bg-accent-hover disabled:opacity-60
          text-white font-bold text-body
          rounded-[var(--radius-md)]
          transition-colors cursor-pointer disabled:cursor-not-allowed
        "
      >
        {status === "sending" ? (
          <>
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Sending…
          </>
        ) : (
          "Submit Application →"
        )}
      </button>

      <p className="text-caption text-text-tertiary">
        Required fields marked <span className="text-accent">*</span>. You&apos;ll hear
        back within two business days.
      </p>
    </form>
  );
}
