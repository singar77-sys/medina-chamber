import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { verifyResendSignature } from "./resend-signature";

const SECRET = `whsec_${Buffer.from("a-very-secret-key-please-32-bytes").toString("base64")}`;
const NOW = 1_700_000_000_000;
const TS = String(Math.floor(NOW / 1000));
const BODY = JSON.stringify({ type: "email.opened", data: { email_id: "m1" } });

function sign(body: string, id = "msg_1", ts = TS): string {
  const key = Buffer.from(SECRET.slice(6), "base64");
  return createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");
}

describe("verifyResendSignature", () => {
  it("accepts a valid signature", () => {
    const headers = { id: "msg_1", timestamp: TS, signature: `v1,${sign(BODY)}` };
    expect(verifyResendSignature(SECRET, BODY, headers, NOW)).toBe(true);
  });

  it("accepts when one of several v1 entries matches (rotation)", () => {
    const headers = {
      id: "msg_1",
      timestamp: TS,
      signature: `v1,${Buffer.from("garbage").toString("base64")} v1,${sign(BODY)}`,
    };
    expect(verifyResendSignature(SECRET, BODY, headers, NOW)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const headers = { id: "msg_1", timestamp: TS, signature: `v1,${sign(BODY)}` };
    expect(verifyResendSignature(SECRET, `${BODY}x`, headers, NOW)).toBe(false);
  });

  it("rejects a stale timestamp (replay window)", () => {
    const headers = { id: "msg_1", timestamp: TS, signature: `v1,${sign(BODY)}` };
    expect(verifyResendSignature(SECRET, BODY, headers, NOW + 10 * 60 * 1000)).toBe(false);
  });

  it("rejects missing headers", () => {
    expect(
      verifyResendSignature(SECRET, BODY, { id: null, timestamp: TS, signature: "v1,x" }, NOW),
    ).toBe(false);
  });
});
