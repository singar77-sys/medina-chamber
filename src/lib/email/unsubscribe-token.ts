/**
 * Unsubscribe tokens — HMAC(contactId) so the one-click unsubscribe link in a
 * campaign email can't be forged to unsubscribe arbitrary members, yet never
 * expires (an unsubscribe link must work forever).
 *
 * Keyed on PORTAL_AUTH_SECRET (the same strong HMAC secret the portal uses);
 * no new env var. Token format: base64url(contactId).base64url(hmac).
 */

import { createHmac, timingSafeEqual } from "crypto";

function secret(): string {
  const s = process.env.PORTAL_AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error("PORTAL_AUTH_SECRET not configured (min 32 chars)");
  }
  return s;
}

function hmac(contactId: string): Buffer {
  return createHmac("sha256", secret()).update(contactId).digest();
}

export function signUnsubscribeToken(contactId: string): string {
  const id = Buffer.from(contactId).toString("base64url");
  const sig = hmac(contactId).toString("base64url");
  return `${id}.${sig}`;
}

/** Returns the contactId if the token is valid, else null. Constant-time. */
export function verifyUnsubscribeToken(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  let contactId: string;
  try {
    contactId = Buffer.from(token.slice(0, dot), "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!contactId) return null;

  let provided: Buffer;
  try {
    provided = Buffer.from(token.slice(dot + 1), "base64url");
  } catch {
    return null;
  }

  const expected = hmac(contactId);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }
  return contactId;
}
