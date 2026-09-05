import { describe, expect, it } from "vitest";
import { readJsonBounded, readTextBounded, WEBHOOK_MAX_CHARS } from "./body-limit";

// The DoS ceiling on every public form route (contact, apply, chat, search,
// join, sponsorship). Both halves matter: the Content-Length fast path avoids
// buffering the body at all, and the post-read check catches a chunked body
// that declares no length.

const post = (body: string, headers: Record<string, string> = {}) =>
  new Request("https://medinaohchamber.com/api/contact", { method: "POST", body, headers });

async function statusOf(r: Awaited<ReturnType<typeof readJsonBounded>>): Promise<number | null> {
  return "response" in r ? r.response.status : null;
}

describe("readJsonBounded", () => {
  it("parses a normal body", async () => {
    const parsed = await readJsonBounded(post(JSON.stringify({ firstName: "Ann" })));
    expect(parsed).toEqual({ body: { firstName: "Ann" } });
  });

  it("413s on a declared Content-Length over 4x the cap, without reading the body", async () => {
    const req = post("{}", { "content-length": String(100 * 4 + 1) });
    const spy = { read: false };
    const guarded = new Proxy(req, {
      get(target, prop) {
        if (prop === "text") {
          spy.read = true;
          return target.text.bind(target);
        }
        const v = Reflect.get(target, prop);
        return typeof v === "function" ? v.bind(target) : v;
      },
    });
    expect(await statusOf(await readJsonBounded(guarded, 100))).toBe(413);
    expect(spy.read).toBe(false);
  });

  it("allows a declared Content-Length inside the 4x byte allowance", async () => {
    // The cap counts UTF-16 code units, so the header check deliberately allows
    // up to 4x before rejecting; shrinking that to 1x would break real UTF-8 bodies.
    const body = JSON.stringify({ a: "x".repeat(60) });
    const parsed = await readJsonBounded(post(body, { "content-length": String(body.length * 3) }), 100);
    expect("body" in parsed).toBe(true);
  });

  it("413s on an oversized body that declared no Content-Length", async () => {
    const body = JSON.stringify({ a: "x".repeat(200) });
    const req = new Request("https://medinaohchamber.com/api/contact", {
      method: "POST",
      body: new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode(body));
          c.close();
        },
      }),
      // @ts-expect-error duplex is required for a streaming request body in Node
      duplex: "half",
    });
    expect(await statusOf(await readJsonBounded(req, 100))).toBe(413);
  });

  it("accepts a body of exactly the cap and rejects one character more", async () => {
    const exact = `"${"x".repeat(98)}"`; // 100 chars of valid JSON
    expect(exact.length).toBe(100);
    expect("body" in (await readJsonBounded(post(exact), 100))).toBe(true);
    expect(await statusOf(await readJsonBounded(post(`"${"x".repeat(99)}"`), 100))).toBe(413);
  });

  it("400s with 'Invalid JSON body.' on unparseable content", async () => {
    const parsed = await readJsonBounded(post("{not json"));
    expect(await statusOf(parsed)).toBe(400);
    expect("response" in parsed && (await parsed.response.json())).toEqual({
      error: "Invalid JSON body.",
    });
  });
});

// The signed-webhook variant. Stripe and Resend both verify a signature over the
// RAW bytes, so the body may NOT be parsed and re-serialized on the way through —
// readTextBounded exists to bound the read while handing back those exact bytes.
describe("readTextBounded", () => {
  it("returns the body VERBATIM — byte-for-byte, never re-serialized", async () => {
    // Whitespace and key order are part of what Stripe signs. If this reader
    // ever normalized the payload, every real webhook would fail verification.
    const raw = '{ "id" : "evt_1",\n  "type": "payment_intent.succeeded" }';
    const bounded = await readTextBounded(post(raw));
    expect(bounded).toEqual({ text: raw });
  });

  it("413s on a declared Content-Length over 4x the cap, without reading the body", async () => {
    const req = post("{}", { "content-length": String(100 * 4 + 1) });
    const spy = { read: false };
    const guarded = new Proxy(req, {
      get(target, prop) {
        if (prop === "text") {
          spy.read = true;
          return target.text.bind(target);
        }
        const v = Reflect.get(target, prop);
        return typeof v === "function" ? v.bind(target) : v;
      },
    });
    const bounded = await readTextBounded(guarded, 100);
    expect("response" in bounded && bounded.response.status).toBe(413);
    expect(spy.read).toBe(false);
  });

  it("413s on an oversized body that declared no Content-Length", async () => {
    const bounded = await readTextBounded(post("x".repeat(101)), 100);
    expect("response" in bounded && bounded.response.status).toBe(413);
  });

  it("does NOT parse — unparseable content comes back as text, not a 400", async () => {
    // A webhook must reach its signature check (401) rather than being rejected
    // as bad JSON (400) by the reader.
    const bounded = await readTextBounded(post("{not json"));
    expect(bounded).toEqual({ text: "{not json" });
  });

  it("keeps a real-sized webhook payload well inside the webhook ceiling", async () => {
    // Regression guard on the number itself: a 32 KB event (larger than anything
    // Stripe or Resend has sent us) must pass untouched.
    const raw = JSON.stringify({ data: { object: { note: "x".repeat(32 * 1024) } } });
    expect(raw.length).toBeLessThan(WEBHOOK_MAX_CHARS);
    expect(await readTextBounded(post(raw), WEBHOOK_MAX_CHARS)).toEqual({ text: raw });
  });
});
