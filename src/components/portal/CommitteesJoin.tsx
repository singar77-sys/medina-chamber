"use client";

import { useState } from "react";

export interface PortalCommittee {
  id: string;
  name: string;
  description: string | null;
  meetingSchedule: string | null;
  memberCount: number;
}

export function CommitteesJoin({
  committees,
  joinedIds,
}: {
  committees: PortalCommittee[];
  joinedIds: string[];
}) {
  const [joined, setJoined] = useState<Set<string>>(new Set(joinedIds));
  const [counts, setCounts] = useState<Record<string, number>>(
    Object.fromEntries(committees.map((c) => [c.id, c.memberCount])),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function toggle(committeeId: string) {
    const isJoined = joined.has(committeeId);
    setBusy(committeeId);
    setErr("");
    try {
      const res = await fetch("/api/portal/committees", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ committeeId, join: !isJoined }),
      });
      if (res.ok) {
        const data = (await res.json()) as { changed: boolean };
        setJoined((prev) => {
          const next = new Set(prev);
          if (isJoined) next.delete(committeeId);
          else next.add(committeeId);
          return next;
        });
        if (data.changed) {
          setCounts((c) => ({
            ...c,
            [committeeId]: Math.max(0, (c[committeeId] ?? 0) + (isJoined ? -1 : 1)),
          }));
        }
      } else {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(d.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setErr("Connection error. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  if (committees.length === 0) {
    return <p className="text-sm text-text-tertiary">No committees are open to join right now.</p>;
  }

  return (
    <div className="space-y-4">
      {err && (
        <p role="alert" className="text-sm" style={{ color: "#b91c1c" }}>
          {err}
        </p>
      )}
      {committees.map((c) => {
        const isJoined = joined.has(c.id);
        const count = counts[c.id] ?? 0;
        return (
          <div
            key={c.id}
            className="bg-bg-primary rounded-2xl p-5 shadow-sm border border-border-secondary flex items-start justify-between gap-4"
          >
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-text-primary">{c.name}</h3>
              {c.meetingSchedule && (
                <p className="text-xs text-text-tertiary mt-0.5">{c.meetingSchedule}</p>
              )}
              {c.description && (
                <p className="text-sm text-text-secondary mt-1 leading-relaxed">{c.description}</p>
              )}
              <p className="text-xs text-text-tertiary mt-2">
                {count} member{count === 1 ? "" : "s"}
                {isJoined && <span style={{ color: "#15803d" }}> · You&apos;re a member</span>}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggle(c.id)}
              disabled={busy === c.id}
              className="text-sm font-medium px-4 py-2 rounded-lg shrink-0 disabled:opacity-50"
              style={isJoined ? { background: "#f1f5f9", color: "#475569" } : { background: "#0C1B33", color: "#fff" }}
            >
              {busy === c.id ? "…" : isJoined ? "Leave" : "Join"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
