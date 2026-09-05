import { describe, expect, it } from "vitest";
import { htmlToText } from "./lib-html-to-text.mjs";

// The scrapers rewrite src/data/*.json every night with no test between the
// GrowthZone markup and the rendered page. This transform is where the fusion
// bug class lives ("personFor", "$995Advanced"): the renderers split body text
// on newlines, so every rule below that emits '\n' is load-bearing, and a
// GrowthZone markup change can bring the bug back silently.

describe("htmlToText", () => {
  it("turns a Froala <br> WITH attributes into a newline", () => {
    // A bare /<br\s*\/?>/ misses these, the generic tag strip eats them, and
    // the adjacent lines fuse.
    expect(htmlToText("one<br fr-original-style='' style=''>two")).toBe("one\ntwo");
    expect(htmlToText("one<br>two")).toBe("one\ntwo");
  });

  it("ends a line on a closing block-level tag", () => {
    expect(htmlToText("<div>$995</div><div>Advanced</div>")).toBe("$995\nAdvanced");
    expect(htmlToText("<li>One</li><li>Two</li>")).toBe("One\nTwo");
  });

  it("drops <style> and <script> CONTENTS, not just the tags", () => {
    expect(htmlToText("<style>.a{color:red}</style>Hello")).toBe("Hello");
    expect(htmlToText("<script>var a=1;</script>Hello")).toBe("Hello");
  });

  it("decodes the same character written three ways", () => {
    for (const entity of ["&rsquo;", "&#x2019;", "&#8217;"]) {
      expect(htmlToText(`Medina${entity}s`), entity).toBe("Medina’s");
    }
  });

  it("decodes the entities GrowthZone actually emits", () => {
    expect(htmlToText("&bull; item &mdash; note &amp; more")).toBe("• item — note & more");
  });

  it("leaves an unknown entity visible rather than mangling it", () => {
    expect(htmlToText("&notarealentity;")).toBe("&notarealentity;");
  });

  it("does not double-decode an escaped entity", () => {
    expect(htmlToText("&amp;bull;")).toBe("&bull;");
  });

  it("survives an out-of-range numeric entity instead of throwing", () => {
    // String.fromCodePoint throws on these; an uncaught RangeError drops the
    // whole event/article, not one character.
    expect(htmlToText("a&#x110000;b")).toBe("a&#x110000;b");
    expect(htmlToText("a&#xD800;b")).toBe("a&#xD800;b");
  });

  it("strips zero-width characters", () => {
    expect(htmlToText("a​b‌‍﻿c")).toBe("abc");
  });

  it("collapses runs of blank lines and trims the result", () => {
    expect(htmlToText("<p>a</p><p></p><p></p><p>b</p>")).toBe("a\n\nb");
    expect(htmlToText("  <p>a</p>  ")).toBe("a");
  });

  it("returns an empty string for empty or tag-only input", () => {
    expect(htmlToText()).toBe("");
    expect(htmlToText("<div></div>")).toBe("");
  });
});
