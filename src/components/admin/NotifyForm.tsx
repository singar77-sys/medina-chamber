"use client";

import { useState } from "react";

const CATEGORIES = [
  "Template / Graphic",
  "Event Data",
  "Member Directory",
  "Blog Post",
  "Technical Issue",
  "New Feature Request",
  "Other",
] as const;

export function NotifyForm() {
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/admin/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ message: message.trim(), category }),
      });

      if (res.ok) {
        setSent(true);
        setMessage("");
      } else {
        const data = await res.json();
        setError(data.error ?? "Send failed. Please try again.");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-6 text-center">
        <p className="text-2xl mb-2">✓</p>
        <p className="font-semibold text-green-800">Message sent to Hunter Systems</p>
        <p className="text-sm text-green-700 mt-1">We'll follow up via email or phone.</p>
        <button
          onClick={() => setSent(false)}
          className="mt-4 text-sm text-green-700 underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={send} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-cambridge)]"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          maxLength={2000}
          placeholder="Describe what you need help with. The more detail, the faster we can help."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-cambridge)] resize-y"
          required
        />
        <p className="text-xs text-gray-400 mt-1">{2000 - message.length} chars remaining</p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending || !message.trim()}
        className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-40 transition-opacity"
        style={{ background: "var(--color-oxford)" }}
      >
        {sending ? "Sending…" : "Send to Hunter Systems"}
      </button>
    </form>
  );
}
