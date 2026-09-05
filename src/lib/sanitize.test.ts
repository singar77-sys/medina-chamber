import { describe, expect, it } from "vitest";
import { SLUG_RE, escHtml, pickString, pickOptional } from "./sanitize";

// SLUG_RE keeps client-supplied slugs out of Blob paths and Redis keys, and
// escHtml is the only thing between a form submission and the HTML the chamber
// staff open in their inbox. Both are one-liners that no test pinned, so losing
// an anchor or an escape would go unnoticed.

describe("SLUG_RE", () => {
  it("accepts real member/event slugs", () => {
    for (const ok of [
      "a",
      "3m-company",
      "medwick-construction",
      "eggs-expertise-canva-101",
      "a".repeat(120), // the documented ceiling
    ]) {
      expect(SLUG_RE.test(ok), ok).toBe(true);
    }
  });

  it("rejects anything that could escape a path or key", () => {
    for (const bad of [
      "",
      "-lead",
      "trail-",
      "Upper",
      "../x",
      "a/b",
      "a b",
      "a.b",
      "a_b",
      "café",
      "a".repeat(121), // one over the ceiling
      "ok\nnot-ok", // the anchors are what stop this
    ]) {
      expect(SLUG_RE.test(bad), bad).toBe(false);
    }
  });
});

describe("escHtml", () => {
  it("escapes all five characters that can break out of markup", () => {
    expect(escHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("neutralises a script tag and a single-quoted attribute break-out", () => {
    expect(escHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
    expect(escHtml("' onmouseover='alert(1)")).toBe(
      "&#39; onmouseover=&#39;alert(1)",
    );
  });

  it("escapes the ampersand first so escapes are not double-escaped into nonsense", () => {
    expect(escHtml("Tom & Jerry <b>")).toBe("Tom &amp; Jerry &lt;b&gt;");
  });
});

describe("pickString / pickOptional", () => {
  it("trims and accepts a value within the cap", () => {
    expect(pickString("  Ann  ", 10)).toBe("Ann");
  });

  it("rejects non-strings, blank input, and over-cap input", () => {
    for (const bad of [undefined, null, 42, {}, [], "", "   "]) {
      expect(pickString(bad, 10)).toBeNull();
    }
    expect(pickString("x".repeat(11), 10)).toBeNull();
    expect(pickString("x".repeat(10), 10)).toBe("x".repeat(10)); // the cap is inclusive
  });

  it("maps the same rejections to '' for optional fields", () => {
    expect(pickOptional(undefined, 10)).toBe("");
    expect(pickOptional("x".repeat(11), 10)).toBe("");
    expect(pickOptional(" Ann ", 10)).toBe("Ann");
  });
});
