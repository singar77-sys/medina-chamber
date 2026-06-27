/**
 * POST /api/portal/profile
 * ------------------------
 * Lets a logged-in member update their own contact details and — if they are
 * their organization's primary contact — their business listing.
 *
 * Runtime: nodejs (postgres-js opens a TCP socket the edge runtime can't).
 * force-dynamic: reads the session cookie + writes on every call.
 *
 * Security (mirrors /api/portal/checkout):
 *   • Identity comes ONLY from the HMAC-verified portal_session cookie. The
 *     request body never carries a contactId / organizationId, so a crafted
 *     request can't move another member's record.
 *   • Mass-assignment is denied by whitelisting: only the fields below are read
 *     off the body. Anything else (status, membershipTier, isPrimaryContact,
 *     ids, stripeCustomerId, …) is ignored, so a crafted body can't escalate a
 *     membership, flip the primary contact, or hijack the Stripe customer.
 *   • Org-listing fields require isPrimaryContact — a non-primary member edits
 *     only their own name/title/phone, never the shared business record.
 *   • URLs are normalized + scheme-validated, blocking javascript:/data: etc.
 */

import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts, organizations } from "@/lib/db/schema";
import { verifyPortalSession, PORTAL_COOKIE } from "@/lib/portal-session";
import { limitPortalProfile } from "@/lib/rate-limit";
import { EMAIL_RE } from "@/lib/email";
import { logEngagement } from "@/lib/engagement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE)?.value;
  if (!token) return null;
  return verifyPortalSession(token);
}

// ── Validation helpers ────────────────────────────────────────────────────────

const MAX = 300;

function badRequest(error: string): Response {
  return Response.json({ error }, { status: 400 });
}

/** Read + trim a string field. undefined when the key was not sent at all. */
function readStr(
  body: Record<string, unknown>,
  key: string,
): string | undefined {
  if (!(key in body)) return undefined;
  const v = body[key];
  if (typeof v !== "string") return undefined; // ignore non-strings rather than 400
  return v.trim();
}

/**
 * Normalize a user-entered URL. Prepends https:// when scheme-less, requires the
 * final scheme to be http(s). Returns null for empty input, "INVALID" on bad —
 * which blocks javascript:, data:, mailto:, and garbage.
 */
function normalizeUrl(v: string): string | null | "INVALID" {
  if (!v) return null;
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "INVALID";
    return u.toString();
  } catch {
    return "INVALID";
  }
}

/**
 * Sanitize a social-link field. A bare handle ("@medinachamber") or domain is
 * stored as-is, but any value carrying a scheme (a colon) must be a valid
 * http(s) URL — this blocks javascript:/data:/vbscript: from ever persisting,
 * so they can't reach the public directory, which renders social links straight
 * into an <a href>. Defense at the write boundary regardless of the render side.
 */
function sanitizeSocial(v: string): string | null | "INVALID" {
  if (!v) return null;
  // A leading "/" — protocol-relative "//evil.com" or absolute "/path" — resolves
  // to an off-site URL when rendered as an <a href> on the public directory. Reject
  // it; a real handle/domain never starts with "/". (A bare "evil.com/x" is harmless:
  // with no scheme the browser treats it as a same-site relative link.)
  if (v.startsWith("/")) return "INVALID";
  if (v.includes(":")) return normalizeUrl(v); // scheme present → must be http(s)
  return v; // plain handle/domain → safe text
}

export async function POST(req: Request): Promise<Response> {
  // Rate limit per client IP (~20/min). Fail-open: a limiter hiccup never
  // blocks a member saving their profile or leaks a 500.
  const limited = await limitPortalProfile(req);
  if (limited) return limited;

  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("invalid body");
  }
  if (!body || typeof body !== "object") {
    return badRequest("invalid body");
  }
  const b = body as Record<string, unknown>;

  // ── Contact fields — any logged-in member may edit their OWN record ──────────
  const contactUpdate: Partial<typeof contacts.$inferInsert> = {};

  const firstName = readStr(b, "firstName");
  if (firstName !== undefined) {
    if (firstName.length === 0) return badRequest("First name can't be empty.");
    if (firstName.length > MAX) return badRequest("First name is too long.");
    contactUpdate.firstName = firstName;
  }
  const lastName = readStr(b, "lastName");
  if (lastName !== undefined) {
    if (lastName.length === 0) return badRequest("Last name can't be empty.");
    if (lastName.length > MAX) return badRequest("Last name is too long.");
    contactUpdate.lastName = lastName;
  }
  const title = readStr(b, "title");
  if (title !== undefined) {
    if (title.length > MAX) return badRequest("Title is too long.");
    contactUpdate.title = title || null;
  }
  const phone = readStr(b, "phone");
  if (phone !== undefined) {
    if (phone.length > MAX) return badRequest("Phone is too long.");
    contactUpdate.phone = phone || null;
  }

  // ── Org listing fields — primary contact only (enforced below) ───────────────
  const orgUpdate: Partial<typeof organizations.$inferInsert> = {};

  const orgPhone = readStr(b, "orgPhone");
  if (orgPhone !== undefined) {
    if (orgPhone.length > MAX) return badRequest("Business phone is too long.");
    orgUpdate.phone = orgPhone || null;
  }
  const orgEmail = readStr(b, "orgEmail");
  if (orgEmail !== undefined) {
    if (orgEmail.length > MAX) return badRequest("Business email is too long.");
    if (orgEmail && !EMAIL_RE.test(orgEmail)) {
      return badRequest("Business email looks invalid.");
    }
    orgUpdate.email = orgEmail || null;
  }
  const websiteUrl = readStr(b, "websiteUrl");
  if (websiteUrl !== undefined) {
    if (websiteUrl.length > MAX) return badRequest("Website URL is too long.");
    const norm = normalizeUrl(websiteUrl);
    if (norm === "INVALID") return badRequest("Website URL looks invalid.");
    orgUpdate.websiteUrl = norm;
  }
  for (const key of ["address1", "address2", "city", "state", "zip"] as const) {
    const v = readStr(b, key);
    if (v !== undefined) {
      if (v.length > MAX) return badRequest(`${key} is too long.`);
      orgUpdate[key] = v || null;
    }
  }
  // Social links: a bare handle is fine, but a value with a scheme must be
  // http(s) — blocks javascript:/data: from reaching the public directory href.
  for (const key of ["facebook", "twitter", "instagram", "linkedin", "youtube"] as const) {
    const v = readStr(b, key);
    if (v !== undefined) {
      if (v.length > MAX) return badRequest(`${key} is too long.`);
      const s = sanitizeSocial(v);
      if (s === "INVALID") return badRequest(`That ${key} link looks invalid.`);
      orgUpdate[key] = s;
    }
  }

  const hasContact = Object.keys(contactUpdate).length > 0;
  const hasOrg = Object.keys(orgUpdate).length > 0;
  if (!hasContact && !hasOrg) {
    return badRequest("No editable fields were provided.");
  }

  // Authorize org edits: only the org's primary contact may touch the shared
  // business record. The flag is read from the DB by the session contactId —
  // never trust a client-sent role. A non-primary submitting org fields is
  // rejected wholesale (their contact edits don't sneak through).
  if (hasOrg) {
    const [me] = await db
      .select({ isPrimaryContact: contacts.isPrimaryContact })
      .from(contacts)
      .where(eq(contacts.id, session.contactId))
      .limit(1);
    if (!me) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!me.isPrimaryContact) {
      return Response.json(
        { error: "Only the primary contact can edit business details." },
        { status: 403 },
      );
    }
  }

  // Apply atomically so a half-saved profile can never happen.
  await db.transaction(async (tx) => {
    if (hasContact) {
      await tx
        .update(contacts)
        .set({ ...contactUpdate, updatedAt: sql`now()` })
        .where(eq(contacts.id, session.contactId));
    }
    if (hasOrg) {
      await tx
        .update(organizations)
        .set({ ...orgUpdate, updatedAt: sql`now()` })
        .where(eq(organizations.id, session.organizationId));
    }
  });

  // Member-ROI signal — the member updated their profile/listing. Best-effort.
  await logEngagement(db, {
    eventType: "profile_updated",
    organizationId: session.organizationId,
    contactId: session.contactId,
    metadata: { contact: hasContact, org: hasOrg },
  });

  return Response.json({ ok: true });
}
