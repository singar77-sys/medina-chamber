/**
 * POST /api/admin/events/graphics
 *
 * Natural-language event graphic editor. Accepts a command string and
 * the current EventInfo, uses Claude to extract the intended changes,
 * and returns the updated EventInfo.
 *
 * Request:  { slug: string, command: string, currentInfo: EventInfo }
 * Response: { updatedInfo: EventInfo, explanation: string, action: string }
 *
 * Supported actions: "update" | "reset" | "unsupported"
 *
 * Examples:
 *   "change the date to May 15"
 *   → { day: 15, month: "May", dayOfWeek: "Friday" }
 *
 *   "set the time to 6:30pm"
 *   → { time: "6:30 PM" }
 *
 *   "reset to default / fresh graphic"
 *   → action: "reset" (clears the EventInfo override)
 *
 *   "change the color to blue"
 *   → action: "unsupported" with explanation
 *
 * NOTE: Graphic colors are fixed by the brand template. Only
 * event-instance data (date, time, venue, registration note) can change.
 */

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { setEventInfoOverride, clearEventInfoOverride } from "@/lib/cms-store";
import type { EventInfo } from "@/components/events/graphics/shared";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export const dynamic = "force-dynamic";

const SYSTEM = `You are a concise assistant that parses commands about chamber event graphics.

Given a natural-language command and the current event info, return a JSON object with:
{
  "action": "update" | "reset" | "unsupported",
  "changes": { /* only EventInfo fields to update */ },
  "explanation": "One short sentence describing what you did or why unsupported"
}

EventInfo fields:
- dayOfWeek: string (e.g. "Wednesday")
- month: string (e.g. "May")
- day: number (1-31)
- year: number (e.g. 2026)
- time: string (e.g. "8:30 AM")
- note: "Registration Required" | "Free · Walk-Ins Welcome" | "Free · RSVP Required" | null
- venue: string
- address: string

Rules:
- "reset", "clear", "fresh graphic", "start over" → action: "reset", empty changes
- Color changes → action: "unsupported" (colors are fixed brand templates)
- Component/style changes → action: "unsupported"
- Only include fields that are actually changing in "changes"
- If dayOfWeek is derivable from a date change, include it
- Respond with ONLY the JSON object, no markdown, no explanation outside JSON`;

export async function POST(req: Request): Promise<Response> {
  const authErr = await requireAdminSession(req);
  if (authErr) return authErr;

  let body: { slug?: string; command?: string; currentInfo?: EventInfo };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { slug, command, currentInfo = {} } = body;
  if (!slug || !command) {
    return NextResponse.json({ error: "Missing slug or command." }, { status: 400 });
  }

  if (!command.trim()) {
    return NextResponse.json({ error: "Empty command." }, { status: 400 });
  }

  const userPrompt = `Current event info:
${JSON.stringify(currentInfo, null, 2)}

Command: "${command.trim()}"`;

  let result: { action: string; changes: Partial<EventInfo>; explanation: string };
  try {
    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5"),
      system: SYSTEM,
      prompt: userPrompt,
      maxOutputTokens: 256,
    });

    result = JSON.parse(text.trim());
  } catch (err) {
    console.error("[graphics] LLM parse error:", err);
    return NextResponse.json({ error: "Failed to parse command." }, { status: 500 });
  }

  if (result.action === "reset") {
    await clearEventInfoOverride(slug);
    return NextResponse.json({
      action: "reset",
      updatedInfo: {},
      explanation: result.explanation ?? "Graphic reset to template default.",
    });
  }

  if (result.action === "unsupported") {
    return NextResponse.json({
      action: "unsupported",
      updatedInfo: currentInfo,
      explanation: result.explanation,
    });
  }

  // Merge changes onto current info
  const updatedInfo: EventInfo = { ...currentInfo, ...result.changes };
  await setEventInfoOverride(slug, updatedInfo);

  return NextResponse.json({
    action: "update",
    updatedInfo,
    explanation: result.explanation ?? "Updated.",
  });
}
