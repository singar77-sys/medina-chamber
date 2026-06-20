/**
 * Validation for resource create/edit. Mirrors deals-input: returns either
 * { values } (ready to insert/update) or { error } (a 400 message).
 *
 * `url` is scheme-checked to http(s) only — it renders as an <a href> on the
 * public page, so this blocks a javascript:/data: stored-XSS, exactly like deals.
 */

import { resources } from "@/lib/db/schema";

export type ResourceValues = Omit<typeof resources.$inferInsert, "id" | "createdAt" | "updatedAt">;

const MAX = { title: 160, description: 2000, category: 80, url: 2000, linkLabel: 60 };
const SORT_MAX = 100000;

export function buildResourceValues(
  body: Record<string, unknown>,
  opts: { requireCore: boolean },
): { values: ResourceValues } | { error: string } {
  const out: Partial<ResourceValues> = {};

  // ── Required-when-core text fields ──────────────────────────────────────────
  // NOT NULL columns: required on create; an explicitly-provided empty value on
  // PATCH is rejected (you can't clear them) rather than silently ignored.
  if (opts.requireCore || "title" in body) {
    const t = typeof body.title === "string" ? body.title.trim() : "";
    if (!t) return { error: opts.requireCore ? "Title is required." : "Title cannot be empty." };
    if (t.length > MAX.title) return { error: "Title is too long." };
    out.title = t;
  }
  if (opts.requireCore || "category" in body) {
    const c = typeof body.category === "string" ? body.category.trim() : "";
    if (!c) return { error: opts.requireCore ? "Category is required." : "Category cannot be empty." };
    if (c.length > MAX.category) return { error: "Category is too long." };
    out.category = c;
  }
  if (opts.requireCore || "url" in body) {
    const u = typeof body.url === "string" ? body.url.trim() : "";
    if (!u) return { error: opts.requireCore ? "Link URL is required." : "Link URL cannot be empty." };
    if (!/^https?:\/\//i.test(u)) {
      return { error: "Link URL must start with http:// or https://." };
    }
    if (u.length > MAX.url) return { error: "Link URL is too long." };
    out.url = u;
  }

  // ── Optional text ───────────────────────────────────────────────────────────
  if ("description" in body) {
    const d = typeof body.description === "string" ? body.description.trim() : "";
    if (d.length > MAX.description) return { error: "Description is too long." };
    out.description = d || null;
  }
  if ("linkLabel" in body) {
    const l = typeof body.linkLabel === "string" ? body.linkLabel.trim() : "";
    if (l.length > MAX.linkLabel) return { error: "Link label is too long." };
    out.linkLabel = l || null;
  }

  // ── Flags + ordering ────────────────────────────────────────────────────────
  if ("isMemberOnly" in body) {
    if (typeof body.isMemberOnly !== "boolean") return { error: "isMemberOnly must be a boolean." };
    out.isMemberOnly = body.isMemberOnly;
  }
  if ("isPublished" in body) {
    if (typeof body.isPublished !== "boolean") return { error: "isPublished must be a boolean." };
    out.isPublished = body.isPublished;
  }
  if ("sortOrder" in body) {
    const n = body.sortOrder;
    if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > SORT_MAX) {
      return { error: "sortOrder must be a non-negative integer." };
    }
    out.sortOrder = n;
  }

  return { values: out as ResourceValues };
}
