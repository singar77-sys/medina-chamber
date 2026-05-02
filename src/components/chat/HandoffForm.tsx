"use client";

import { useState } from "react";
import { HANDOFF_TOPICS, type HandoffTopic } from "@/lib/chat-routing";

type Status = "idle" | "sending" | "sent" | "error";

interface HandoffFormProps {
  /** Current session ID so the server can pull the transcript. Null
   *  is OK — server will send the email without transcript in that case. */
  sessionId: string | null;
  /** Called when user wants to return to the chat (cancel or after send). */
  onBack: () => void;
}

/**
 * Inline "Talk to a human" form shown inside the chat panel.
 * Collects name + email + topic + optional note, POSTs to
 * /api/chat/handoff, emails the right chamber team member with the
 * conversation transcript. Uses the same honeypot+timing spam defense
 * as contact/apply.
 */
export function HandoffForm({ sessionId, onBack }: HandoffFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<HandoffTopic>("membership");
  const [note, setNote] = useState("");
  const [websiteConfirm, setWebsiteConfirm] = useState("");
  const [formLoadedAt] = useState(() => Date.now());
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/chat/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          name,
          email,
          topic,
          note: note.trim() || undefined,
          website_confirm: websiteConfirm,
          formLoadedAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Something went wrong. Please try again.");
        setStatus("error");
      } else {
        setStatus("sent");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col items-center text-center gap-4 py-10 px-6">
        <div className="w-12 h-12 rounded-full bg-cambridge/20 flex items-center justify-center">
          <svg className="w-6 h-6 text-cambridge" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <p className="text-body font-bold text-text-primary">We&apos;ll be in touch.</p>
        <p className="text-body-sm text-text-secondary max-w-xs">
          Your message, along with this conversation, went to the right chamber team member.
          Expect a reply within one business day.
        </p>
        <button
          onClick={onBack}
          className="text-body-sm text-cambridge hover:underline mt-2"
        >
          Back to chat
        </button>
      </div>
    );
  }

  const fieldClass = `
    w-full px-3 py-2
    bg-bg-secondary border border-border-secondary
    rounded-[var(--radius-md)]
    text-body-sm text-text-primary placeholder:text-text-tertiary
    focus:outline-none focus:ring-2 focus:ring-cambridge/40 focus:border-cambridge
    disabled:opacity-50 transition-colors
  `;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-4 py-4 overflow-y-auto max-h-[460px]">
      {/* Honeypot — off-screen hidden input, same pattern as contact/apply. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor="handoff-website-confirm">Website (leave blank)</label>
        <input
          id="handoff-website-confirm"
          type="text"
          name="website_confirm"
          tabIndex={-1}
          autoComplete="off"
          value={websiteConfirm}
          onChange={(e) => setWebsiteConfirm(e.target.value)}
        />
      </div>

      <div>
        <p className="text-body-sm font-bold text-text-primary">Talk to a team member</p>
        <p className="text-caption text-text-tertiary mt-1">
          We&apos;ll send this conversation plus your note to the right person.
          Reply from them usually within a business day.
        </p>
      </div>

      <div>
        <label htmlFor="handoff-name" className="block text-caption font-bold text-text-primary mb-1">
          Name <span className="text-accent">*</span>
        </label>
        <input
          id="handoff-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          disabled={status === "sending"}
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="handoff-email" className="block text-caption font-bold text-text-primary mb-1">
          Email <span className="text-accent">*</span>
        </label>
        <input
          id="handoff-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={status === "sending"}
          className={fieldClass}
        />
      </div>

      <div>
        <label htmlFor="handoff-topic" className="block text-caption font-bold text-text-primary mb-1">
          What&apos;s this about?
        </label>
        <select
          id="handoff-topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value as HandoffTopic)}
          disabled={status === "sending"}
          className={fieldClass}
        >
          {HANDOFF_TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="handoff-note" className="block text-caption font-bold text-text-primary mb-1">
          Anything to add? <span className="text-text-tertiary font-normal">(optional)</span>
        </label>
        <textarea
          id="handoff-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Helpful context, best time to reach you, urgency, specifics the bot missed..."
          rows={3}
          maxLength={2000}
          disabled={status === "sending"}
          className={`${fieldClass} resize-none`}
        />
      </div>

      {errorMsg && (
        <p className="text-caption text-red-500 -mt-1">{errorMsg}</p>
      )}

      <div className="flex items-center gap-3 mt-2">
        <button
          type="submit"
          disabled={status === "sending" || !name.trim() || !email.trim()}
          className="
            flex-1 px-4 py-2 text-body-sm font-bold
            bg-oxford hover:bg-oxford/80 disabled:opacity-40 disabled:cursor-not-allowed
            text-white rounded-[var(--radius-md)] transition-colors
          "
        >
          {status === "sending" ? "Sending…" : "Send to the chamber"}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={status === "sending"}
          className="text-body-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
