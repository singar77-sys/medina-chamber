import { beforeEach, describe, expect, it, vi } from "vitest";

const getContentField = vi.fn<(page: string, field: string) => Promise<string | null>>();

// unstable_cache is a passthrough here — the caching behavior is Next's, the
// fallback logic is ours.
vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
}));

vi.mock("@/lib/cms-store", async () => {
  const actual = await vi.importActual<typeof import("@/lib/cms-store")>("@/lib/cms-store");
  return { CONTENT_FIELD_DEFS: actual.CONTENT_FIELD_DEFS, getContentField };
});

const { getPageContent } = await import("./cms-content");
const { CONTENT_FIELD_DEFS } = await import("@/lib/cms-store");

const hours = CONTENT_FIELD_DEFS.find((d) => d.page === "contact" && d.field === "hours");

describe("getPageContent", () => {
  beforeEach(() => {
    getContentField.mockReset();
  });

  it("serves a stored override over the shipped default", async () => {
    getContentField.mockResolvedValue("Mon-Thu, 9:00 AM - 3:00 PM");
    expect(await getPageContent("contact", "hours")).toBe("Mon-Thu, 9:00 AM - 3:00 PM");
  });

  it("falls back to the shipped default when nothing is stored", async () => {
    getContentField.mockResolvedValue(null);
    expect(await getPageContent("contact", "hours")).toBe(hours?.defaultValue);
  });

  it("treats a blank override as a reset, not as blank page copy", async () => {
    // An admin who clears the field and saves stores "". Shipping that would
    // delete the canonical office-hours line from the live contact page.
    getContentField.mockResolvedValue("");
    expect(await getPageContent("contact", "hours")).toBe(hours?.defaultValue);
  });

  it("returns empty string for a field that is not in the allowlist", async () => {
    getContentField.mockResolvedValue(null);
    expect(await getPageContent("home", "not-a-real-field")).toBe("");
  });
});

describe("CONTENT_FIELD_DEFS", () => {
  it("ships a default that the field's own maxLength would accept", () => {
    // A default longer than maxLength can be rendered but never re-saved,
    // so the admin cannot restore it once they edit the field.
    for (const def of CONTENT_FIELD_DEFS) {
      expect(
        def.defaultValue.length,
        `${def.page}/${def.field} default exceeds maxLength ${def.maxLength}`,
      ).toBeLessThanOrEqual(def.maxLength);
    }
  });
});
