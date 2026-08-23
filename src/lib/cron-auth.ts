/**
 * Shared bearer auth for /api/cron/* routes. Vercel Cron (and any manual
 * trigger) must send `Authorization: Bearer ${CRON_SECRET}`.
 *
 * One implementation instead of a copy per cron route. Fail-closed when
 * CRON_SECRET is unset or under 16 chars, and the comparison neither
 * short-circuits nor leaks the secret's length (constantTimeEqual hashes both
 * sides to a fixed 32 bytes before comparing).
 */

import { constantTimeEqual } from "@/lib/constant-time";

const MIN_CRON_SECRET_LEN = 16;

export async function isAuthorizedCron(req: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < MIN_CRON_SECRET_LEN) return false;

  const auth = req.headers.get("authorization");
  const match = auth?.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  return constantTimeEqual(match[1].trim(), secret);
}
