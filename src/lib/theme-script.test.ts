import { createHash } from "node:crypto";
import { describe, it, expect } from "vitest";
import { THEME_SCRIPT, THEME_SCRIPT_HASH } from "./theme-script";

/**
 * The anti-FOUC theme script is an inline <script> allowed through our CSP
 * by a build-stable SHA-256 hash (see src/proxy.ts) instead of a per-request
 * nonce — that's what lets the marketing pages render statically.
 *
 * The browser hashes the EXACT bytes it receives between <script> and
 * </script>. If THEME_SCRIPT changes but THEME_SCRIPT_HASH doesn't, the
 * script would be blocked by CSP in production (theme flash / broken toggle).
 * This test recomputes the hash from the source string so any drift fails
 * CI instead of shipping.
 */
describe("theme script CSP hash", () => {
  it("THEME_SCRIPT_HASH matches the sha256 of THEME_SCRIPT", () => {
    const digest = createHash("sha256")
      .update(THEME_SCRIPT, "utf8")
      .digest("base64");
    expect(THEME_SCRIPT_HASH).toBe(`sha256-${digest}`);
  });

  it("THEME_SCRIPT is single-line with no CR/LF (byte-stable across platforms)", () => {
    // CRLF vs LF would change the hashed bytes; keep the script newline-free
    // so the served bytes are identical regardless of git autocrlf.
    expect(THEME_SCRIPT).not.toMatch(/[\r\n]/);
  });
});
