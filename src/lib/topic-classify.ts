/**
 * Topic classification for ChamberBot user messages.
 *
 * Every user message gets tagged with one of a small set of chamber-
 * relevant topics. Enables "what are people actually asking about this
 * month?" style product analytics without reading every transcript.
 *
 * Strategy is two-tier:
 *
 *   1. CHEAP REGEX PRE-FILTER. Most chamber queries are literal — if
 *      the message contains "golf outing," classify as events and
 *      skip the LLM call. Saves ~80% of classifier API cost at typical
 *      chamber traffic patterns.
 *
 *   2. LLM FALLBACK. If the regex tier doesn't confidently match,
 *      dispatch to Haiku 4.5 with a minimal system prompt. ~100 input
 *      + ~5 output tokens per classification at ~$0.000125/message.
 *
 * Called from the chat route's onFinish via after() so classification
 * latency doesn't block the user-facing stream. Failures fall back to
 * "other" — never throws, never breaks the stream.
 */

import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";

export type ChatTopic =
  | "membership"
  | "events"
  | "member-lookup"
  | "programs"
  | "advocacy"
  | "contact"
  | "other";

export const CHAT_TOPICS: ChatTopic[] = [
  "membership",
  "events",
  "member-lookup",
  "programs",
  "advocacy",
  "contact",
  "other",
];

/**
 * Fast regex-only classifier. Returns a topic if the message has a
 * high-confidence literal match, null if ambiguous (caller falls back
 * to the LLM). Ordering matters — more-specific patterns first.
 */
function classifyByRegex(text: string): ChatTopic | null {
  const t = text.toLowerCase();

  // Member lookup — "find me a <trade>", "who does <service>", "show me <category>"
  if (
    /\b(find|looking for|need|recommend|show me|who does|who (are|is)|any)\b.*\b(plumber|electrician|insurance|bank|lawyer|accountant|printer|restaurant|dentist|doctor|contractor|landscape|painter|roofer|hvac|cleaning|caterer|photographer|realtor|broker|dealer|store|shop|business|company|member)/i.test(t)
  ) {
    return "member-lookup";
  }

  // Specific programs — exact names
  if (
    /\b(compass|safety council|athena|social connect|golf outing|business brew|eggs (&|and) expertise|get to know|ribbon cutting|chamber chat|member meeting|networking wow)\b/i.test(t)
  ) {
    // If clearly about joining/registering an event it's events; if about
    // the program itself, programs. Default → events (safer default for
    // the ones that are both event + program).
    if (/\b(compass|safety council|athena)\b/i.test(t) && !/\b(register|sign up|attend|join the event)\b/i.test(t)) {
      return "programs";
    }
    return "events";
  }

  // Membership tier / joining / pricing
  if (
    /\b(membership|tier|dues|join|apply|community investor|visibility plus|business essentials|pricing|price|cost|\$\d+)\b/i.test(t)
  ) {
    return "membership";
  }

  // Advocacy
  if (
    /\b(advocacy|legislat|policy|candidate forum|elected official|government|senator|representative)\b/i.test(t)
  ) {
    return "advocacy";
  }

  // Events — registration, dates, calendar
  if (
    /\b(event|register|rsvp|upcoming|calendar|attend|sponsor|this week|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(t)
  ) {
    return "events";
  }

  // Contact / reach the chamber team
  if (
    /\b(contact|phone|email|address|hours|office|reach|stephanie|jaclyn|talk to someone|human|staff)\b/i.test(t)
  ) {
    return "contact";
  }

  return null;
}

/**
 * LLM classifier fallback. Minimal prompt, single word expected back.
 * If the model returns something unrecognized we fall through to "other".
 */
async function classifyByLLM(text: string): Promise<ChatTopic> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return "other";

  try {
    const anthropic = createAnthropic({ apiKey });
    const { text: raw } = await generateText({
      model: anthropic("claude-haiku-4-5"),
      system:
        `Classify the user message into ONE of: membership, events, member-lookup, programs, advocacy, contact, other. ` +
        `Respond with JUST the topic word, lowercase, nothing else. ` +
        `Use "member-lookup" when they're asking to find a business. ` +
        `Use "other" for anything off-topic or ambiguous.`,
      prompt: text.slice(0, 500),
      maxOutputTokens: 10,
      temperature: 0,
    });
    const normalized = raw.trim().toLowerCase().replace(/[^a-z-]/g, "");
    if (CHAT_TOPICS.includes(normalized as ChatTopic)) {
      return normalized as ChatTopic;
    }
    return "other";
  } catch {
    return "other";
  }
}

/**
 * Classify a user message. Tries regex first (zero cost, zero latency),
 * falls back to LLM only when ambiguous. Always returns a valid
 * ChatTopic — never throws.
 */
export async function classifyUserMessage(text: string): Promise<ChatTopic> {
  if (!text || !text.trim()) return "other";
  const fast = classifyByRegex(text);
  if (fast) return fast;
  return classifyByLLM(text);
}
