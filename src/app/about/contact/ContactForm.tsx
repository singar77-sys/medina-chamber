"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  // Honeypot — a hidden field real users never see. Bots autofill
  // every input; if this isn't empty on submit, the server drops
  // the request silently.
  const [websiteConfirm, setWebsiteConfirm] = useState("");
  // Form-load timestamp — paired with server-side MIN_FILL_MS check
  // to reject spam bots that submit instantly.
  const [formLoadedAt] = useState(() => Date.now());
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
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
        <h2 className="text-h2">Message sent!</h2>
        <p className="text-body text-text-secondary max-w-md">
          Thanks for reaching out. Someone from the Chamber will get back to you
          within one business day.
        </p>
        <button
          onClick={() => {
            setStatus("idle");
            setName(""); setEmail(""); setPhone(""); setMessage("");
          }}
          className="text-body-sm text-cambridge hover:underline mt-2"
        >
          Send another message
        </button>
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
        <div>
          <label htmlFor="contact-name" className="block text-body-sm font-bold text-text-primary mb-2">
            Name <span className="text-accent">*</span>
          </label>
          <input
            id="contact-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            disabled={status === "loading"}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="block text-body-sm font-bold text-text-primary mb-2">
            Email <span className="text-accent">*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={status === "loading"}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-phone" className="block text-body-sm font-bold text-text-primary mb-2">
          Phone <span className="text-text-tertiary font-normal">(optional)</span>
        </label>
        <input
          id="contact-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(330) 555-0100"
          disabled={status === "loading"}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="contact-message" className="block text-body-sm font-bold text-text-primary mb-2">
          Message <span className="text-accent">*</span>
        </label>
        <textarea
          id="contact-message"
          required
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help?"
          disabled={status === "loading"}
          className={`${inputClass} resize-none`}
        />
      </div>

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
        disabled={status === "loading"}
        className="
          inline-flex items-center gap-2 px-8 py-4
          bg-accent hover:bg-accent-hover disabled:opacity-50
          text-white font-bold text-body-sm
          rounded-[var(--radius-md)]
          transition-colors
        "
      >
        {status === "loading" ? (
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
