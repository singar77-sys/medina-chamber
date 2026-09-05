import Link from "next/link";
import { listConversationKeys, getConversations } from "@/lib/chat-log";
import type { ConversationLog } from "@/lib/chat-log";

export const dynamic = "force-dynamic";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function formatTime(iso: string) {
  // Server component: this renders in the Vercel function, whose clock is
  // UTC. Without an explicit zone an 8:15 PM chat reads as 12:15 AM the next
  // day to Medina staff. (The registrations pages pin UTC instead, because
  // those values are date-only event dates that Eastern would shift back a day.)
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
}

function anonymizeIp(ip: string) {
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.•.•`;
  return ip.slice(0, 8) + "…";
}

function firstUserMessage(conv: ConversationLog): string {
  const turn = conv.turns.find((t) => t.role === "user");
  if (!turn) return "(no messages)";
  return turn.content.length > 90
    ? turn.content.slice(0, 90) + "…"
    : turn.content;
}

export default async function ChatLogPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; topic?: string }>;
}) {
  const sp = await searchParams;
  const from = sp.from ?? daysAgoStr(7);
  const to = sp.to ?? todayStr();
  const topicFilter = sp.topic ?? "";

  const keys = await listConversationKeys(from, to);
  const conversations = await getConversations(keys.slice(0, 300));

  const filtered = topicFilter
    ? conversations.filter((c) => c.topic === topicFilter)
    : conversations;

  const sorted = filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const allTopics = [
    ...new Set(conversations.map((c) => c.topic).filter((t): t is string => !!t)),
  ].sort();

  return (
    <div className="px-6 py-6 max-w-5xl">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-gray-900">Chat Log</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          ChamberBot conversations, 90-day retention
        </p>
      </div>

      {/* Filters */}
      <form
        method="get"
        action="/admin/chat"
        className="flex flex-wrap items-end gap-3 mb-5 p-4 bg-white border border-gray-200 rounded-xl"
      >
        <div>
          <label htmlFor="chat-from" className="block text-xs text-gray-500 mb-1">From</label>
          <input
            id="chat-from"
            type="date"
            name="from"
            defaultValue={from}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#83BCA9]"
          />
        </div>
        <div>
          <label htmlFor="chat-to" className="block text-xs text-gray-500 mb-1">To</label>
          <input
            id="chat-to"
            type="date"
            name="to"
            defaultValue={to}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#83BCA9]"
          />
        </div>
        {allTopics.length > 0 && (
          <div>
            <label htmlFor="chat-topic" className="block text-xs text-gray-500 mb-1">Topic</label>
            <select
              id="chat-topic"
              name="topic"
              defaultValue={topicFilter}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#83BCA9]"
            >
              <option value="">All topics</option>
              {allTopics.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/-/g, " ")}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          type="submit"
          className="px-4 py-1.5 rounded-lg text-sm font-medium text-white"
          style={{ background: "#83BCA9" }}
        >
          Filter
        </button>
        <Link
          href="/admin/chat"
          className="px-4 py-1.5 rounded-lg text-sm text-gray-500 border border-gray-200 hover:border-gray-300 transition-colors"
        >
          Reset
        </Link>
      </form>

      <p className="text-xs text-gray-400 mb-3">
        {sorted.length} conversation{sorted.length !== 1 ? "s" : ""}
        {" · "}
        {from} to {to}
        {topicFilter && ` · topic: ${topicFilter.replace(/-/g, " ")}`}
        {keys.length > 300 && (
          <span className="text-amber-500"> (showing first 300 of {keys.length})</span>
        )}
      </p>

      {sorted.length === 0 ? (
        <div className="border border-gray-200 rounded-xl p-10 bg-white text-center">
          <p className="text-sm text-gray-400">No conversations found for this range.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                  Time
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                  Topic
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 hidden sm:table-cell">
                  Turns
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 hidden md:table-cell">
                  IP
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">
                  First message
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((conv) => (
                <tr
                  key={conv.sessionId}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/70 transition-colors"
                >
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                    {formatTime(conv.updatedAt)}
                  </td>
                  <td className="px-4 py-2.5">
                    {conv.topic ? (
                      <span
                        className="inline-block text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded"
                        style={{ background: "#d1fae5", color: "#065f46" }}
                      >
                        {conv.topic.replace(/-/g, " ")}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 hidden sm:table-cell">
                    {conv.turns.length}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-400 font-mono hidden md:table-cell">
                    {anonymizeIp(conv.ip)}
                  </td>
                  <td className="px-4 py-2.5 max-w-xs">
                    <Link
                      href={`/admin/chat/${conv.sessionId}?date=${conv.startedAt.slice(0, 10)}`}
                      className="text-gray-700 hover:text-[#0C1B33] transition-colors line-clamp-1 block"
                    >
                      {firstUserMessage(conv)}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
