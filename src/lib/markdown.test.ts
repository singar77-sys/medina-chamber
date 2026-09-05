import { describe, expect, it } from "vitest";
import { isValidElement, type ReactNode } from "react";
import { renderMarkdown } from "./markdown";

/**
 * These tests inspect the React element tree returned by renderMarkdown
 * directly (the vitest env is "node", no DOM). Because renderMarkdown
 * returns React nodes — never an HTML string — the security guarantee is
 * that raw markup in the input can only ever appear as a plain-text child,
 * never as an element `type`. We assert on that tree shape.
 */

interface Anchor {
  href: string | undefined;
  target: string | undefined;
  rel: string | undefined;
  text: string;
}

// Collect the visible text and every <a>/<strong> element from the tree.
function walk(
  node: ReactNode,
  out: { text: string; anchors: Anchor[]; tags: string[] },
): void {
  if (node == null || node === false) return;
  if (typeof node === "string" || typeof node === "number") {
    out.text += String(node);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((n) => walk(n, out));
    return;
  }
  if (isValidElement(node)) {
    const type = node.type;
    const props = node.props as { children?: ReactNode; [k: string]: unknown };
    if (typeof type === "string") {
      out.tags.push(type);
      if (type === "a") {
        const textOut = { text: "", anchors: [], tags: [] };
        walk(props.children, textOut);
        out.anchors.push({
          href: props.href as string | undefined,
          target: props.target as string | undefined,
          rel: props.rel as string | undefined,
          text: textOut.text,
        });
      }
    }
    walk(props.children, out);
  }
}

function analyze(text: string) {
  const out = { text: "", anchors: [] as Anchor[], tags: [] as string[] };
  walk(renderMarkdown(text), out);
  return out;
}

describe("renderMarkdown — XSS hardening", () => {
  it("renders a raw <script> tag as inert plain text, never as an element", () => {
    const out = analyze('Hello <script>alert("xss")</script> world');
    // The script markup survives only as text content...
    expect(out.text).toContain('<script>alert("xss")</script>');
    // ...and never becomes a real element type.
    expect(out.tags).not.toContain("script");
  });

  it("neutralizes a quote-breaking URL in a markdown link (no anchor, label as text)", () => {
    const evil = 'https://evil.com/"><script>alert(1)</script>';
    const out = analyze(`[click me](${evil})`);
    // Off-list host → not clickable. Label preserved as text.
    expect(out.anchors).toHaveLength(0);
    expect(out.text).toContain("click me");
    expect(out.tags).not.toContain("script");
  });

  it("neutralizes a javascript: URL — no anchor rendered", () => {
    const out = analyze("[tap](javascript:alert(1))");
    expect(out.anchors).toHaveLength(0);
    expect(out.text).toContain("tap");
  });

  it("neutralizes a data: URL — no anchor rendered", () => {
    const out = analyze("[x](data:text/html,<script>alert(1)</script>)");
    expect(out.anchors).toHaveLength(0);
    expect(out.tags).not.toContain("script");
  });

  it("does not crash on a malformed / unparseable URL", () => {
    expect(() => analyze("[broken](ht!tp://:::not a url)")).not.toThrow();
    const out = analyze("[broken](ht!tp://:::not a url)");
    expect(out.anchors).toHaveLength(0);
    expect(out.text).toContain("broken");
  });

  it("rejects http: (non-https) even for an allowlisted host", () => {
    const out = analyze("[home](http://medinachamber.com)");
    expect(out.anchors).toHaveLength(0);
  });

  it("rejects userinfo-smuggling (allowlisted host as userinfo of evil host)", () => {
    const out = analyze("[home](https://medinachamber.com@evil.com/)");
    expect(out.anchors).toHaveLength(0);
  });
});

describe("renderMarkdown — well-formed links", () => {
  it("renders an internal /join link same-tab (no target=_blank)", () => {
    const out = analyze("Ready? [Join now](/join)");
    expect(out.anchors).toHaveLength(1);
    const a = out.anchors[0];
    expect(a.href).toBe("/join");
    expect(a.target).toBeUndefined();
    expect(a.rel).toBe("noopener noreferrer");
    expect(a.text).toBe("Join now");
  });

  it("renders an allowlisted external https link in a new tab with rel", () => {
    const out = analyze("See [our site](https://medinachamber.com/events)");
    expect(out.anchors).toHaveLength(1);
    const a = out.anchors[0];
    expect(a.href).toBe("https://medinachamber.com/events");
    expect(a.target).toBe("_blank");
    expect(a.rel).toBe("noopener noreferrer");
    expect(a.text).toBe("our site");
  });

  it("linkifies a bare allowlisted https URL", () => {
    const out = analyze("Visit https://www.medinachamber.com/join today");
    expect(out.anchors).toHaveLength(1);
    expect(out.anchors[0].href).toBe("https://www.medinachamber.com/join");
    expect(out.anchors[0].target).toBe("_blank");
  });

  it("renders **bold** as a <strong> element", () => {
    const out = analyze("This is **important** text");
    expect(out.tags).toContain("strong");
    expect(out.text).toContain("important");
  });

  it("does not linkify an off-allowlist bare URL (renders as text)", () => {
    const out = analyze("Go to https://evil.example/phish now");
    expect(out.anchors).toHaveLength(0);
    expect(out.text).toContain("https://evil.example/phish");
  });
});

/**
 * Off-origin links disguised as internal paths. Browsers apply the WHATWG URL
 * rules, where a backslash is interchangeable with a slash, so "/" followed by
 * a backslash and a host is really a protocol-relative URL resolving to that
 * host. A bare "starts with /" check let those through as same-tab links. The
 * renderer exists to stop a prompt-injected bot answer from producing a
 * phishing link, so these must come out as plain text with no anchor at all.
 * (Backslashes are built from a char code so no escaping layer can soften the
 * test into a different string than the one under attack.)
 */
describe("internal-path links cannot escape the origin", () => {
  const BS = String.fromCharCode(92);
  const escapes = [
    "/" + BS + "evil.com",
    "/" + BS + BS + "evil.com",
    "//evil.com",
    "/" + BS + "/evil.com",
  ];

  for (const raw of escapes) {
    it("renders " + JSON.stringify(raw) + " as text, not a link", () => {
      const out = analyze("[click](" + raw + ")");
      expect(out.anchors).toEqual([]);
      expect(out.tags).not.toContain("a");
    });
  }

  it("still renders genuine internal paths as same-tab links", () => {
    const out = analyze("[pricing](/membership/pricing?a=1#tiers)");
    expect(out.anchors).toHaveLength(1);
    expect(out.anchors[0].href).toBe("/membership/pricing?a=1#tiers");
    expect(out.anchors[0].target).toBeUndefined();
  });

  it("keeps allowlisted external links working", () => {
    const out = analyze(
      "[portal](https://greatermedinachamberofcommerce.growthzoneapp.com/a)",
    );
    expect(out.anchors).toHaveLength(1);
    expect(out.anchors[0].target).toBe("_blank");
  });
});
