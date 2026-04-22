/**
 * Long-term conversation log for ChamberBot.
 *
 * The in-flight session store (chat-session.ts) keeps transcripts for
 * an hour so the model has context inside a conversation. This log is
 * the opposite: a 90-day retained copy written once after each
 * successful round, so we can answer questions like:
 *
 *   - What are people actually asking the bot about this month?
 *   - Did the Golf Outing marketing push drive chat traffic?
 *   - Are there recurring questions we should turn into content?
 *   - Is the handoff button getting used? By whom?
 *
 * Storage shape per conversation:
 *   key: chat:log:<yyyy-mm-dd>:<sessionId>
 *   val: JSON {
 *     sessionId, ip, startedAt, updatedAt, turns[], topic?
 *   }
 *   ttl: 90 days (configurable via env)
 *
 * The date prefix in the key means we can LRANGE or SCAN by day
 * efficiently; a single SCAN-MATCH cursor can pull every conversation
 * from "last Tuesday" without scanning the whole keyspace.
 *
 * Rolls up into two counter keys for quick "how many / what topic"
 * analytics without reading every conversation:
 *   chat:stats:messages:<yyyy-mm-dd>        → daily message count
 *   chat:stats:topic:<yyyy-mm-dd>:<topic>   → topic histogram per day
 *
 * Admin-only — conversations are queried via /api/admin/chat-log
 * behind an env-var token. No client-exposed surface.
 */

import { getRedis } from "@/lib/upstash";
import type { ChatTurn } from "@/lib/chat-session";

const LOG_TTL_DAYS = Number(process.env.CHAT_LOG_TTL_DAYS ?? 90);
const LOG_TTL_SECONDS = LOG_TTL_DAYS * 24 * 60 * 60;
// Stats keys live slightly longer so a cron pulling last month's
// stats on the 1st of the next month still sees them.
const STATS_TTL_SECONDS = (LOG_TTL_DAYS + 30) * 24 * 60 * 60;

export interface ConversationLog {
  sessionId: string;
  ip: string;
  startedAt: string;
  updatedAt: string;
  turns: ChatTurn[];
  topic?: string;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function logKey(date: string, sessionId: string): string {
  return `chat:log:${date}:${sessionId}`;
}

function messagesCounterKey(date: string): string {
  return `chat:stats:messages:${date}`;
}

function topicCounterKey(date: string, topic: string): string {
  return `chat:stats:topic:${date}:${topic}`;
}

/**
 * Write or update the conversation log for a session. Called from the
 * chat route's onFinish via after(), so the user-facing response isn't
 * delayed. Fire-and-forget; any Redis error is logged but swallowed.
 *
 * Idempotent at the session level — later rounds overwrite earlier
 * snapshots because the key is stable for the session's calendar day.
 * If a conversation crosses midnight UTC, the second day gets its own
 * log entry with the post-midnight turns (which is actually nice for
 * date-range queries).
 */
export async function logConversation(
  sessionId: string,
  ip: string,
  turns: ChatTurn[],
  topic?: string,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const date = todayKey();
  const now = new Date().toISOString();

  try {
    // Preserve startedAt if the log already exists for today
    const existing = await redis.get<ConversationLog>(logKey(date, sessionId));
    const record: ConversationLog = {
      sessionId,
      ip,
      startedAt: existing?.startedAt ?? now,
      updatedAt: now,
      turns,
      topic: topic ?? existing?.topic,
    };
    await redis.set(logKey(date, sessionId), record, { ex: LOG_TTL_SECONDS });
  } catch (err) {
    console.error("[chat-log] write failed:", err);
  }
}

/**
 * Bump the daily message counter. Cheap "how much chat traffic today"
 * signal; one INCR per round, no content recorded against it.
 */
export async function incrementMessageCounter(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const date = todayKey();
  try {
    const n = await redis.incr(messagesCounterKey(date));
    if (n === 1) {
      await redis.expire(messagesCounterKey(date), STATS_TTL_SECONDS);
    }
  } catch (err) {
    console.error("[chat-log] messages counter failed:", err);
  }
}

/**
 * Bump the topic histogram for today. Called once per round after the
 * user's message is classified (see topic-classify.ts).
 */
export async function incrementTopicCounter(topic: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const date = todayKey();
  try {
    const n = await redis.incr(topicCounterKey(date, topic));
    if (n === 1) {
      await redis.expire(topicCounterKey(date, topic), STATS_TTL_SECONDS);
    }
  } catch (err) {
    console.error("[chat-log] topic counter failed:", err);
  }
}

// ── Admin read API ─────────────────────────────────────────────────

/**
 * Enumerate the log keys for a date range (inclusive). Uses SCAN-MATCH
 * under the hood; the per-date key prefix keeps each day's scan tight.
 * Returns the keys, not the full records — callers pull individual
 * records via getConversation() only when needed.
 */
export async function listConversationKeys(
  fromDate: string,
  toDate: string,
): Promise<string[]> {
  const redis = getRedis();
  if (!redis) return [];

  const days = enumerateDates(fromDate, toDate);
  const keys: string[] = [];
  try {
    for (const date of days) {
      let cursor: string | number = 0;
      do {
        const [nextCursor, batch]: [string | number, string[]] = await redis.scan(cursor, {
          match: `chat:log:${date}:*`,
          count: 200,
        });
        keys.push(...batch);
        cursor = nextCursor;
      } while (String(cursor) !== "0");
    }
  } catch (err) {
    console.error("[chat-log] scan failed:", err);
  }
  return keys;
}

export async function getConversation(
  key: string,
): Promise<ConversationLog | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const r = await redis.get<ConversationLog>(key);
    return r ?? null;
  } catch {
    return null;
  }
}

/** Fetch multiple conversations by key in one round-trip. */
export async function getConversations(
  keys: string[],
): Promise<ConversationLog[]> {
  const redis = getRedis();
  if (!redis || keys.length === 0) return [];
  try {
    const results = await redis.mget<ConversationLog[]>(...keys);
    return results.filter((r): r is ConversationLog => r !== null && r !== undefined);
  } catch (err) {
    console.error("[chat-log] mget failed:", err);
    return [];
  }
}

/** Read the aggregate counters for a date range. */
export async function getStats(
  fromDate: string,
  toDate: string,
): Promise<{
  totalMessages: number;
  topicsByDate: Record<string, Record<string, number>>;
  topicTotals: Record<string, number>;
}> {
  const redis = getRedis();
  if (!redis) {
    return { totalMessages: 0, topicsByDate: {}, topicTotals: {} };
  }

  const days = enumerateDates(fromDate, toDate);
  let totalMessages = 0;
  const topicsByDate: Record<string, Record<string, number>> = {};
  const topicTotals: Record<string, number> = {};

  try {
    // Daily message counters
    const msgKeys = days.map(messagesCounterKey);
    const msgValues = await redis.mget<(string | number | null)[]>(...msgKeys);
    msgValues.forEach((v) => {
      totalMessages += Number(v ?? 0);
    });

    // Topic counters — scan for each day's topic:* pattern
    for (const date of days) {
      const dayTopics: Record<string, number> = {};
      let cursor: string | number = 0;
      do {
        const [nextCursor, batch]: [string | number, string[]] = await redis.scan(cursor, {
          match: `chat:stats:topic:${date}:*`,
          count: 200,
        });
        if (batch.length > 0) {
          const values = await redis.mget<(string | number | null)[]>(...batch);
          batch.forEach((k, i) => {
            const topic = k.split(":").pop() ?? "unknown";
            const count = Number(values[i] ?? 0);
            dayTopics[topic] = (dayTopics[topic] ?? 0) + count;
            topicTotals[topic] = (topicTotals[topic] ?? 0) + count;
          });
        }
        cursor = nextCursor;
      } while (String(cursor) !== "0");
      if (Object.keys(dayTopics).length > 0) {
        topicsByDate[date] = dayTopics;
      }
    }
  } catch (err) {
    console.error("[chat-log] getStats failed:", err);
  }

  return { totalMessages, topicsByDate, topicTotals };
}

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Yield YYYY-MM-DD strings from fromDate to toDate inclusive. Both
 * bounds are strings, compared lexicographically — works because
 * ISO-8601 date strings sort correctly.
 */
function enumerateDates(fromDate: string, toDate: string): string[] {
  if (fromDate > toDate) return enumerateDates(toDate, fromDate);
  const out: string[] = [];
  const start = new Date(fromDate + "T00:00:00Z");
  const end = new Date(toDate + "T00:00:00Z");
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
