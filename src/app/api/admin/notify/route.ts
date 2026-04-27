/**
 * POST /api/admin/notify
 *
 * Sends a support request from the chamber admin to Hunter Systems.
 * Used when the chamber staff hit something bigger than the admin UI
 * can handle — template issues, data problems, new feature requests, etc.
 *
 * Request:  { message: string, category?: string }
 * Response: { ok: true }
 *
 * Currently sends via Resend to HUNTER_SYSTEMS_EMAIL. A Twilio SMS
 * integration can be layered in later by wiring the same payload to
 * a /api/admin/notify/sms route using TWILIO_ACCOUNT_SID,
 * TWILIO_AUTH_TOKEN, and HUNTER_SYSTEMS_PHONE env vars.
 */

import { NextResponse } from "next/server";
import { requireAdminToken } from "@/lib/admin-auth";
import { resend } from "@/lib/email";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  "Template / Graphic",
  "Event Data",
  "Member Directory",
  "Blog Post",
  "Technical Issue",
  "New Feature Request",
  "Other",
] as const;

export async function POST(req: Request): Promise<Response> {
  const authErr = requireAdminToken(req);
  if (authErr) return authErr;

  let body: { message?: string; category?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { message, category = "Other" } = body;
  if (!message?.trim()) {
    return NextResponse.json({ error: "message is required." }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: "message max 2000 characters." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === "re_placeholder") {
    // Dev mode — log and acknowledge without sending
    console.log("[notify] Hunter Systems message (email not configured):", { category, message });
    return NextResponse.json({ ok: true, dev: true });
  }

  const hunterEmail = process.env.HUNTER_SYSTEMS_EMAIL || "mark@huntersystems.io";
  const timestamp = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });

  try {
    await resend.emails.send({
      from: "Medina Chamber Admin <noreply@medinachamber.com>",
      to: hunterEmail,
      subject: `[Chamber Admin] ${category}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; padding: 24px;">
          <h2 style="color: #0C1B33; margin: 0 0 8px;">Chamber Admin Support Request</h2>
          <p style="color: #666; margin: 0 0 24px; font-size: 14px;">${timestamp} ET</p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 12px; background: #f5f5f5; font-weight: 600; width: 120px;">Category</td>
              <td style="padding: 8px 12px; border: 1px solid #eee;">${category}</td>
            </tr>
          </table>
          <div style="background: #f9f9f9; border: 1px solid #eee; border-radius: 8px; padding: 16px;">
            <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${message.replace(/</g, "&lt;")}</p>
          </div>
        </div>
      `,
    });
  } catch (err) {
    console.error("[notify] Resend error:", err);
    return NextResponse.json({ error: "Failed to send notification." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export { CATEGORIES };
