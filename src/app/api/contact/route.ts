import { Resend } from "resend";
import { formLimiter, applyRateLimit } from "@/lib/rate-limit";

const CHAMBER_EMAIL = "office@medinaohchamber.com";
const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(req: Request) {
  const limited = await applyRateLimit(req, formLimiter);
  if (limited) return limited;

  const { name, email, phone, message } = await req.json();

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return Response.json({ error: "Name, email, and message are required." }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: "Mail service not configured." }, { status: 500 });
  }

  try {
    await resend.emails.send({
      from: "Chamber Website <onboarding@resend.dev>",
      to: CHAMBER_EMAIL,
      replyTo: email.trim(),
      subject: `Contact form: ${name.trim()}`,
      text: [
        `Name: ${name.trim()}`,
        `Email: ${email.trim()}`,
        phone?.trim() ? `Phone: ${phone.trim()}` : "",
        "",
        message.trim(),
      ]
        .filter(Boolean)
        .join("\n"),
      html: `
        <p><strong>Name:</strong> ${escHtml(name)}</p>
        <p><strong>Email:</strong> ${escHtml(email)}</p>
        ${phone?.trim() ? `<p><strong>Phone:</strong> ${escHtml(phone)}</p>` : ""}
        <hr />
        <p style="white-space:pre-wrap">${escHtml(message)}</p>
      `,
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("Resend error:", err);
    return Response.json({ error: "Failed to send message. Please try again." }, { status: 500 });
  }
}
