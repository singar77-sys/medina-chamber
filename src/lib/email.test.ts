import { describe, expect, it } from "vitest";
import { EMAIL_RE, CHAMBER_NOTIFY_EMAIL } from "./email";

// Every public form (contact, apply, join, sponsorship, event registration) and
// the admin campaign builder gate on this one regex. Several route tests used to
// assert against their own copy of it, so tightening or loosening the real one
// changed nothing in the suite. These are the cases that actually matter.

describe("EMAIL_RE", () => {
  it("accepts the addresses members really use", () => {
    for (const ok of [
      "ann@acme.co",
      "ann.smith@acme.co.uk",
      "ann+chamber@acme.co", // plus-addressing: rejecting it silently loses signups
      "a_b-c@sub.domain.org",
      "office@medinaohchamber.com",
    ]) {
      expect(EMAIL_RE.test(ok), ok).toBe(true);
    }
  });

  it("rejects what is not an address", () => {
    for (const bad of [
      "",
      "ann",
      "ann@",
      "@acme.co",
      "a@b", // no dot in the domain
      "ann acme@co.com", // whitespace
      "ann@acme.co\nbcc: evil@x.com", // header injection via a newline
      "two@addresses.com second@addresses.com",
    ]) {
      expect(EMAIL_RE.test(bad), bad).toBe(false);
    }
  });

  it("is not sticky or global (a shared regex with /g would alternate results)", () => {
    expect(EMAIL_RE.global).toBe(false);
    expect(EMAIL_RE.sticky).toBe(false);
    expect(EMAIL_RE.test("ann@acme.co")).toBe(EMAIL_RE.test("ann@acme.co"));
  });
});

// Read at module load, so this only pins the built-in default. Skipped when a
// deployment deliberately overrides the inbox.
describe.skipIf(!!process.env.CHAMBER_NOTIFY_EMAIL)("CHAMBER_NOTIFY_EMAIL", () => {
  it("defaults to the chamber office inbox", () => {
    // Contact + apply notifications go here. A typo would silently black-hole
    // every form submission from the public site.
    expect(CHAMBER_NOTIFY_EMAIL).toBe("office@medinaohchamber.com");
  });
});
