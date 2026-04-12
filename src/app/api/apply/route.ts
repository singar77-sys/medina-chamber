import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const resend = new Resend(process.env.RESEND_API_KEY);
const CHAMBER_EMAIL = "office@medinaohchamber.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      businessName,
      contactName,
      title,
      email,
      phone,
      website,
      address,
      city,
      state,
      zip,
      employees,
      category,
      referral,
      notes,
    } = body;

    // Basic validation
    if (!businessName || !contactName || !email || !phone || !employees) {
      return NextResponse.json(
        { error: "Required fields missing." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    const employeeLabel: Record<string, string> = {
      "1": "1 (sole proprietor)",
      "2-5": "2–5 employees",
      "6-10": "6–10 employees",
      "11-25": "11–25 employees",
      "26-50": "26–50 employees",
      "51-100": "51–100 employees",
      "100+": "100+ employees",
    };

    const fullAddress = [address, city, state, zip].filter(Boolean).join(", ");
    const safeWebsite = /^https?:\/\//i.test(website ?? "") ? website : "";

    await resend.emails.send({
      from: "Chamber Membership <onboarding@resend.dev>",
      replyTo: email.trim(),
      to: CHAMBER_EMAIL,
      subject: `Membership Application — ${businessName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
          <h2 style="color: #1b3a5c; margin-bottom: 4px;">New Membership Application</h2>
          <p style="color: #666; margin-top: 0;">Submitted via medinachamber.com</p>

          <table style="width: 100%; border-collapse: collapse; margin-top: 24px;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; width: 40%; color: #666; font-size: 14px;">Business / Organization</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 600;">${escHtml(businessName)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">Primary Contact</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: 600;">${escHtml(contactName)}${title ? `, ${escHtml(title)}` : ""}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">Email</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><a href="mailto:${escHtml(email)}">${escHtml(email)}</a></td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">Phone</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${escHtml(phone)}</td>
            </tr>
            ${safeWebsite ? `<tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">Website</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><a href="${escHtml(safeWebsite)}">${escHtml(safeWebsite)}</a></td>
            </tr>` : ""}
            ${fullAddress ? `<tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">Address</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${escHtml(fullAddress)}</td>
            </tr>` : ""}
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">Employees</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${escHtml(employeeLabel[employees] ?? employees)}</td>
            </tr>
            ${category ? `<tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">Business Category</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${escHtml(category)}</td>
            </tr>` : ""}
            ${referral ? `<tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666; font-size: 14px;">How they heard about us</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${escHtml(referral)}</td>
            </tr>` : ""}
            ${notes ? `<tr>
              <td style="padding: 10px 0; color: #666; font-size: 14px; vertical-align: top;">Additional notes</td>
              <td style="padding: 10px 0;">${escHtml(notes)}</td>
            </tr>` : ""}
          </table>

          <div style="margin-top: 32px; padding: 16px; background: #f0f4f8; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #555;">
              Reply directly to this email to respond to ${escHtml(contactName)} at ${escHtml(businessName)}.
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Apply route error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
