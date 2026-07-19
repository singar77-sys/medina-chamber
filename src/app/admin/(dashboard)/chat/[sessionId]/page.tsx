import Link from "next/link";
import { notFound } from "next/navigation";
import { getConversation } from "@/lib/chat-log";

export const dynamic = "force-dynamic";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function anonymizeIp(ip: string) {
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.•.•`;
  return ip.slice(0, 8) + "…";
}

export default async function ChatDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { sessionId } = await params;
  const { date = new Date().toISOString().slice(0, 10) } = await searchParams;

  const conv = await getConversation(`chat:log:${date}:${sessionId}`);
  if (!conv) notFound();

  const userTurns = conv.turns.filter((t) => t.role === "user").length;

  return (
    <div className="px-6 py-6 max-w-3xl">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-400 mb-5">
        <Link href="/admin/chat" className="hover:text-gray-600 transition-colors">
          Chat Log
        </Link>
        <span>/</span>
        <span className="text-gray-600">Conversation</span>
      </nav>

      {/* Session metadata */}
      <div className="border border-gray-200 rounded-xl p-5 bg-white mb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {formatTime(conv.startedAt)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 font-mono break-all">
              {conv.sessionId}
            </p>
          </div>
          <div className="text-right shrink-0 space-y-1">
            {conv.topic && (
              <span
                className="inline-block text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded"
                style={{ background: "#d1fae5", color: "#065f46" }}
              >
                {conv.topic.replace(/-/g, " ")}
              </span>
            )}
            <p className="text-xs text-gray-400 block">
              {userTurns} user message{userTurns !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-400">
          <span>
            IP: <span className="font-mono">{anonymizeIp(conv.ip)}</span>
          </span>
          {conv.updatedAt !== conv.startedAt && (
            <span>Last active: {formatTime(conv.updatedAt)}</span>
          )}
        </div>
      </div>

      {/* Transcript */}
      {conv.turns.length === 0 ? (
        <div className="border border-gray-200 rounded-xl p-10 bg-white text-center">
          <p className="text-sm text-gray-400">No messages in this session.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {conv.turns.map((turn, i) => (
            <div
              key={i}
              className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  turn.role === "user" ? "rounded-br-sm" : "rounded-bl-sm border border-gray-200"
                }`}
                style={
                  turn.role === "user"
                    ? { background: "#0C1B33", color: "#fff" }
                    : { background: "#f8fafc", color: "#1e293b" }
                }
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-wide mb-1.5"
                  style={{ opacity: 0.55 }}
                >
                  {turn.role === "user" ? "Visitor" : "ChamberBot"}
                </p>
                <p className="whitespace-pre-wrap">{turn.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
