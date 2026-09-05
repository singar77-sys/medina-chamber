import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Drift guard for the one email validator the site ships.
 *
 * EMAIL_RE is exported from src/lib/email.ts and used by /api/apply, /api/contact,
 * /api/join, /api/sponsorship, /api/events/register, /api/portal/auth/request and
 * both admin campaign routes. Four route tests used to mock @/lib/email with their
 * own hand-copied regex; one of the copies had ALREADY drifted from the original's
 * source text. A copy means the test asserts against a regex that no longer has
 * anything to do with the one in production - "400s on an invalid email" keeps
 * passing while the shipped validator silently accepts garbage.
 *
 * The fix is to import the real export (it IS exported, so nothing needs to be
 * widened for tests). This test stops the copies from coming back. If you need to
 * stub the transport, use a partial mock:
 *
 *   vi.mock("@/lib/email", async (importOriginal) => ({
 *     ...(await importOriginal<typeof import("@/lib/email")>()),
 *     resend: { emails: { send } },
 *   }));
 */

const SRC = join(fileURLToPath(new URL("../", import.meta.url)));

/** The canonical validator's own file may of course contain it. */
const ALLOWED = new Set(["lib/email.ts", "lib/email.test.ts"]);

function testFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) testFiles(p, out);
    else if (name.endsWith(".test.ts") || name.endsWith(".test.tsx")) out.push(p);
  }
  return out;
}

// Character classes an email regex is built from, in either author's ordering.
const COPIED_CHARACTER_CLASS = /@\[\^(?:\\s@|@\\s)\]/;
// A mock factory re-declaring the export by name.
const REDECLARED_EXPORT = /EMAIL_RE\s*:/;

describe("EMAIL_RE has exactly one definition", () => {
  const files = testFiles(SRC).map((p) => ({
    rel: relative(SRC, p).split(sep).join("/"),
    text: readFileSync(p, "utf8"),
  }));

  it("finds test files to scan (guards against a broken walk)", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("no test file re-declares EMAIL_RE in a mock factory", () => {
    const offenders = files
      .filter((f) => !ALLOWED.has(f.rel) && REDECLARED_EXPORT.test(f.text))
      .map((f) => f.rel);
    expect(
      offenders,
      "Import the real EMAIL_RE from @/lib/email instead of re-declaring it; " +
        "use a partial mock (importOriginal) if you also need to stub `resend`.",
    ).toEqual([]);
  });

  it("no test file hand-copies the email character class", () => {
    // Catches a copy smuggled in under a different variable name.
    const offenders = files
      .filter((f) => !ALLOWED.has(f.rel) && COPIED_CHARACTER_CLASS.test(f.text))
      .map((f) => f.rel);
    expect(
      offenders,
      "This looks like a copy of EMAIL_RE. Import it from @/lib/email so the " +
        "test fails when the shipped validator changes.",
    ).toEqual([]);
  });

  it("the canonical definition is still exported and still a single RegExp", () => {
    const source = readFileSync(join(SRC, "lib", "email.ts"), "utf8");
    expect(source).toMatch(/export const EMAIL_RE = \//);
  });
});
