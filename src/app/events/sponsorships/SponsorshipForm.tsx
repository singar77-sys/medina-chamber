"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export function SponsorshipForm() {
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [interest, setInterest] = useState("");
  const [message, setMessage] = useState("");
  // Honeypot + load timestamp — same anti-spam tripwires as the contact/apply forms.
  const [websiteConfirm, setWebsiteConfirm] = useState("");
  const [formLoadedAt] = useState(() => Date.now());
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/sponsorship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          contactName,
          email,
          phone,
          interest,
          message,
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
        <h3 className="text-h3">Thanks for your interest!</h3>
        <p className="text-body text-text-secondary max-w-md">
          We&apos;ve received your sponsorship inquiry. Someone from the chamber will reach out within
          one business day to talk through the options.
        </p>
      </div>
    );
  }

  const inputClass = `
    w-full px-4 py-3
    bg-bg-secondary border border-border-secondary
    rounded-[var(--radius-md)]
    text-body text-text-primary placeholder:text-text-tertiary
    focus:outline-none focus:ring-2 focus:ring-cambridge/40 focus:border-cambridge
    disabled:opacity-50 transition-colors
  `;
  const labelClass = "block text-body-sm font-bold text-text-primary mb-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor="spon-website-confirm">Website (leave blank)</label>
        <input id="spon-website-confirm" type="text" name="website_confirm" tabIndex={-1} autoComplete="off"
          value={websiteConfirm} onChange={(e) => setWebsiteConfirm(e.target.value)} />
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="spon-business" className={labelClass}>Business <span className="text-accent">*</span></label>
          <input id="spon-business" type="text" required value={businessName} onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Your business name" disabled={status === "loading"} className={inputClass} />
        </div>
        <div>
          <label htmlFor="spon-contact" className={labelClass}>Your name <span className="text-accent">*</span></label>
          <input id="spon-contact" type="text" required value={contactName} onChange={(e) => setContactName(e.target.value)}
            placeholder="Contact name" disabled={status === "loading"} className={inputClass} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="spon-email" className={labelClass}>Email <span className="text-accent">*</span></label>
          <input id="spon-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" disabled={status === "loading"} className={inputClass} />
        </div>
        <div>
          <label htmlFor="spon-phone" className={labelClass}>Phone <span className="text-text-tertiary font-normal">(optional)</span></label>
          <input id="spon-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="(330) 555-0100" disabled={status === "loading"} className={inputClass} />
        </div>
      </div>

      <div>
        <label htmlFor="spon-interest" className={labelClass}>What are you interested in sponsoring? <span className="text-text-tertiary font-normal">(optional)</span></label>
        <input id="spon-interest" type="text" value={interest} onChange={(e) => setInterest(e.target.value)}
          placeholder="Golf Outing, Athena Awards, annual sponsorship…" disabled={status === "loading"} className={inputClass} />
      </div>

      <div>
        <label htmlFor="spon-message" className={labelClass}>Anything else? <span className="text-text-tertiary font-normal">(optional)</span></label>
        <textarea id="spon-message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)}
          placeholder="Budget, goals, questions…" disabled={status === "loading"} className={`${inputClass} resize-none`} />
      </div>

      {status === "error" && <p className="text-body-sm text-red-500" role="alert">{errorMsg}</p>}

      <button type="submit" disabled={status === "loading"}
        className="inline-flex items-center gap-2 px-8 py-4 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-bold text-body-sm rounded-[var(--radius-md)] transition-colors">
        {status === "loading" ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Sending…
          </>
        ) : (
          "Become a Sponsor →"
        )}
      </button>
    </form>
  );
}
