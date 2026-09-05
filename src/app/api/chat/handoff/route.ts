/**
 * POST /api/chat/handoff
 * ──────────────────────
 * Human handoff endpoint. When a ChamberBot user hits a wall and clicks
 * "Talk to a human," we package their conversation transcript, route
 * the email to the right team member based on topic, and send a
 * notification via Resend.
 *
 * Request shape:
 *   {
 *     sessionId: UUIDv4,        // to load the transcript
 *     name: string,
 *     email: string,
 *     topic: HandoffTopic,
 *     note?: string,            // optional freeform context
 *     website_confirm: string,  // honeypot — must be empty
 *     formLoadedAt: number,     // timing gate — must be >=1.5s ago
 *   }
 *
 * Response: { ok: true } on success or silent success (honeypot trip).
 *
 * Why this exists: the chamber's strongest asset isn't the bot, it's
 * the humans behind it. When the bot can't help — or when a prospect
 * is close to converting — getting them to a real person is the most
 * valuable thing we can do.
 */

import * as Sentry from "@sentry/nextjs";
import { formLimiter, applyRateLimit } from "@/lib/rate-limit";
import { readJsonBounded } from "@/lib/body-limit";
import { resend } from "@/lib/email";
import { escHtml, pickString } from "@/lib/sanitize";
import { isValidSessionId, loadSession } from "@/lib/chat-session";
import {
  isValidHandoffTopic,
  routeTopicToEmail,
  type HandoffTopic,
} from "@/lib/chat-routing";

const MAX = {
  name: 200,
  email: 320,
  note: 2000,
};

// Same spam-defense pattern as contact/apply. Real users take >1.5s to
// click "Talk to a human" and fill name+email.
const MIN_FILL_MS = 1500;

// Cap how much transcript we email. Keeps things readable; 20 turns
// covers all but absurd conversations.
const MAX_TRANSCRIPT_TURNS = 20;

export async function POST(req: Request) {
  const limited = await applyRateLimit(req, formLimiter);
  if (limited) return limited;

  const parsed = await readJsonBounded(req);
  if ("response" in parsed) return parsed.response;
  const body = parsed.body;
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const raw = body as Record<string, unknown>;

  // Honeypot + timing check — silent 200 on trip (bot thinks it
  // succeeded, no email goes out, Sentry logs for visibility).
  const honeypot =
    typeof raw.website_confirm === "string" ? raw.website_confirm.trim() : "";
  const formLoadedAt =
    typeof raw.formLoadedAt === "number" ? raw.formLoadedAt : 0;
  // fillMs >= 0: a negative gap means the visitor's device clock runs ahead of
  // the server's — a real human, not a bot (same guard as the contact route).
  const fillMs = Date.now() - formLoadedAt;
  if (honeypot || (formLoadedAt > 0 && fillMs >= 0 && fillMs < MIN_FILL_MS)) {
    Sentry.captureMessage("chat handoff rejected by honeypot/timing", {
      level: "info",
      tags: { route: "chat/handoff", phase: "honeypot" },
      extra: { honeypotFilled: Boolean(honeypot), fillMs },
    });
    return Response.json({ ok: true });
  }

  const name = pickString(raw.name, MAX.name);
  const email = pickString(raw.email, MAX.email);
  const note = pickString(raw.note, MAX.note); // may be null
  const topic: HandoffTopic = isValidHandoffTopic(raw.topic)
    ? raw.topic
    : "other";
  const sessionId =
    typeof raw.sessionId === "string" && isValidSessionId(raw.sessionId)
      ? raw.sessionId
      : null;

  if (!name || !email) {
    return Response.json(
      { error: "Name and email are required." },
      { status: 400 },
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  if (!process.env.RESEND_API_KEY) {
    return Response.json(
      { error: "Mail service not configured." },
      { status: 500 },
    );
  }

  // Pull the transcript if we have a session. Handoffs without a
  // prior chat are valid (user might click the button before asking
  // anything) — we just email an empty transcript in that case.
  const transcript = sessionId ? await loadSession(sessionId) : [];
  const recentTurns = transcript.slice(-MAX_TRANSCRIPT_TURNS);

  const { to, routedTo } = routeTopicToEmail(topic);

  const topicLabel = {
    membership: "Membership",
    events: "Events",
    sponsorship: "Sponsorship",
    executive: "Executive / Press",
    other: "Other",
  }[topic];

  // Plain-text transcript for email clients that strip HTML.
  const transcriptText = recentTurns.length
    ? recentTurns
        .map((t) => `${t.role === "user" ? "User" : "ChamberBot"}: ${t.content}`)
        .join("\n\n")
    : "(No prior conversation, user opened the handoff form without chatting first.)";

  // HTML transcript with turn-by-turn styling.
  const transcriptHtml = recentTurns.length
    ? recentTurns
        .map(
          (t) => `
        <div style="margin: 12px 0; padding: 10px 14px; border-left: 3px solid ${t.role === "user" ? "#4a7c7e" : "#0C1B33"}; background: ${t.role === "user" ? "#f0f4f8" : "#fafafa"};">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; margin-bottom: 4px;">
            ${t.role === "user" ? "User" : "ChamberBot"}
          </div>
          <div style="color: #1a1a1a; white-space: pre-wrap;">${escHtml(t.content)}</div>
        </div>
      `,
        )
        .join("")
    : `<p style="color: #666; font-style: italic;">No prior conversation, user opened the handoff form directly.</p>`;

  try {
    await resend.emails.send({
      from: "Greater Medina Chamber ChamberBot <chamber@huntersystems.dev>",
      to,
      replyTo: email,
      // Subject lines are plain text: escaping here would put &#39; in
      // the inbox for names like O'Brien. escHtml belongs to the HTML body only.
      subject: `ChamberBot handoff, ${name} (${topicLabel})`,
      text: [
        `A ChamberBot user asked to talk to a real person.`,
        ``,
        `Name: ${name}`,
        `Email: ${email}`,
        `Topic: ${topicLabel}`,
        `Routed to: ${routedTo}`,
        note ? `\nNote from user:\n${note}` : "",
        ``,
        `─── Conversation transcript ───`,
        ``,
        transcriptText,
      ]
        .filter((x) => x !== "")
        .join("\n"),
      html: `
        <div style="font-family: sans-serif; max-width: 640px; margin: 0 auto; color: #1a1a1a;">
          <h2 style="color: #0C1B33; margin-bottom: 4px;">ChamberBot Handoff</h2>
          <p style="color: #666; margin-top: 0;">A visitor chatting with the bot asked to speak with a team member.</p>

          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 13px; width: 30%;">Name</td>
              <td style="padding: 8px 0; font-weight: 600;">${escHtml(name)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 13px;">Email</td>
              <td style="padding: 8px 0;"><a href="mailto:${escHtml(email)}">${escHtml(email)}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 13px;">Topic</td>
              <td style="padding: 8px 0;">${escHtml(topicLabel)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 13px;">Routed to</td>
              <td style="padding: 8px 0;">${escHtml(routedTo)}</td>
            </tr>
          </table>

          ${
            note
              ? `<div style="margin-top: 20px; padding: 14px; background: #fff8e1; border-radius: 6px;">
                   <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Note from user</div>
                   <div style="white-space: pre-wrap;">${escHtml(note)}</div>
                 </div>`
              : ""
          }

          <h3 style="margin-top: 28px; color: #0C1B33; font-size: 15px;">Conversation transcript</h3>
          ${transcriptHtml}

          <div style="margin-top: 28px; padding: 14px; background: #f0f4f8; border-radius: 6px; font-size: 13px; color: #555;">
            Reply directly to this email to respond to ${escHtml(name)}.
          </div>
        </div>
      `,
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[chat/handoff] Resend error:", err);
    Sentry.captureException(err, {
      tags: { route: "chat/handoff" },
      // No name/email: an `extra` object would smuggle visitor PII past
      // sendDefaultPii:false. topic is a bounded enum, not personal data.
      extra: { topic },
    });
    return Response.json(
      { error: "Couldn't send the handoff. Please try again or email office@medinaohchamber.com directly." },
      { status: 500 },
    );
  }
}
