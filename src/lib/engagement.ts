/**
 * logEngagement — record one engagement_event for the member-ROI dashboard.
 *
 * BEST-EFFORT BY DESIGN: analytics must never break the user-facing action it's
 * attached to. Any failure (DB hiccup, table missing) is swallowed and logged,
 * never thrown. Call it after the real work succeeds; don't await-block on it if
 * latency matters (it's a single insert, so usually fine to await).
 */

import type { DB } from "@/lib/db";
import { engagementEvents, engagementEventType } from "@/lib/db/schema";

export type EngagementEventType = (typeof engagementEventType.enumValues)[number];

export interface LogEngagementInput {
  eventType: EngagementEventType;
  organizationId?: string | null;
  contactId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logEngagement(db: DB, input: LogEngagementInput): Promise<void> {
  try {
    await db.insert(engagementEvents).values({
      eventType: input.eventType,
      organizationId: input.organizationId ?? null,
      contactId: input.contactId ?? null,
      metadata: input.metadata ?? null,
    });
  } catch (err) {
    console.error(`[engagement] failed to log ${input.eventType}:`, err);
  }
}
