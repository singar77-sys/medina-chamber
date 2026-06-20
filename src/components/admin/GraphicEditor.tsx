"use client";

import { useState, useRef, useEffect } from "react";
import type { EventInfo } from "@/components/events/graphics/shared";

interface Message {
  role: "user" | "assistant";
  text: string;
  isError?: boolean;
}

interface Props {
  slug: string;
  eventTitle: string;
  initialInfo: EventInfo;
  onInfoChange: (info: EventInfo) => void;
}

export function GraphicEditor({ slug, eventTitle, initialInfo, onInfoChange }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: `I can update the event info shown on the "${eventTitle}" graphic. Try:\n• "Change the date to May 15"\n• "Set the time to 6:30 PM"\n• "Change venue to Medina Community Center"\n• "Reset to default"\n\nNote: graphic colors are set by the brand template and can't be changed here.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentInfo, setCurrentInfo] = useState<EventInfo>(initialInfo);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const command = input.trim();
    if (!command || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: command }]);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/events/graphics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ slug, command, currentInfo }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `Error: ${data.error ?? "Something went wrong."}`, isError: true },
        ]);
        return;
      }

      if (data.action === "unsupported") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `⚠ ${data.explanation}` },
        ]);
        return;
      }

      if (data.action === "reset") {
        setCurrentInfo({});
        onInfoChange({});
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `✓ ${data.explanation}` },
        ]);
        return;
      }

      setCurrentInfo(data.updatedInfo);
      onInfoChange(data.updatedInfo);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `✓ ${data.explanation}` },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Connection error. Please try again.", isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex flex-col h-80 border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200 bg-gray-50">
        <span style={{ color: "var(--color-cambridge)" }}>◈</span>
        <span className="text-sm font-medium text-gray-700">Graphic Command</span>
        <span className="ml-auto text-xs text-gray-400">date · time · venue · note</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[85%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap"
              style={
                msg.role === "user"
                  ? { background: "var(--color-oxford)", color: "#fff" }
                  : msg.isError
                  ? { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }
                  : { background: "#f1f5f9", color: "#374151" }
              }
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-lg text-sm bg-gray-100 text-gray-400">
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 px-3 py-2.5 border-t border-gray-200 bg-gray-50">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='e.g. "Change the date to May 15"'
          disabled={loading}
          className="flex-1 text-sm px-3 py-1.5 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-cambridge)] disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-3 py-1.5 rounded-md text-sm font-medium text-white transition-opacity disabled:opacity-40"
          style={{ background: "var(--color-oxford)" }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
