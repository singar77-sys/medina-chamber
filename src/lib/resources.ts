/**
 * Resource library — read queries + a category grouping helper.
 */

import { and, asc, eq } from "drizzle-orm";
import type { DB } from "@/lib/db";
import { resources } from "@/lib/db/schema";

export type Resource = typeof resources.$inferSelect;

/** Published, NOT member-only — the public /resources/library page. */
export async function getPublicResources(db: DB): Promise<Resource[]> {
  return db
    .select()
    .from(resources)
    .where(and(eq(resources.isPublished, true), eq(resources.isMemberOnly, false)))
    .orderBy(asc(resources.category), asc(resources.sortOrder), asc(resources.title));
}

/** Published, INCLUDING member-only — the member portal. */
export async function getMemberResources(db: DB): Promise<Resource[]> {
  return db
    .select()
    .from(resources)
    .where(eq(resources.isPublished, true))
    .orderBy(asc(resources.category), asc(resources.sortOrder), asc(resources.title));
}

/** Everything (drafts + member-only) — the admin manager. */
export async function getAdminResources(db: DB): Promise<Resource[]> {
  return db
    .select()
    .from(resources)
    .orderBy(asc(resources.category), asc(resources.sortOrder), asc(resources.title));
}

/** Group an ordered list into category → items, preserving the query order. */
export function groupByCategory(rows: Resource[]): { category: string; items: Resource[] }[] {
  const groups: { category: string; items: Resource[] }[] = [];
  const index = new Map<string, number>();
  for (const r of rows) {
    let i = index.get(r.category);
    if (i === undefined) {
      i = groups.length;
      index.set(r.category, i);
      groups.push({ category: r.category, items: [] });
    }
    groups[i].items.push(r);
  }
  return groups;
}
