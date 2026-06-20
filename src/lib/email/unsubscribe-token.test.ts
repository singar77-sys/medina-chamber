import { describe, expect, it, vi } from "vitest";

vi.stubEnv("PORTAL_AUTH_SECRET", "a".repeat(64));

import { signUnsubscribeToken, verifyUnsubscribeToken } from "./unsubscribe-token";

describe("unsubscribe token", () => {
  it("round-trips a contactId", () => {
    const t = signUnsubscribeToken("contact-123");
    expect(verifyUnsubscribeToken(t)).toBe("contact-123");
  });

  it("rejects a tampered signature", () => {
    const t = signUnsubscribeToken("contact-123");
    const tampered = `${t.slice(0, -3)}${t.endsWith("zzz") ? "aaa" : "zzz"}`;
    expect(verifyUnsubscribeToken(tampered)).toBeNull();
  });

  it("rejects a forged token for a different contact (reused signature)", () => {
    const t = signUnsubscribeToken("contact-123");
    const sig = t.slice(t.lastIndexOf(".") + 1);
    const forged = `${Buffer.from("victim-456").toString("base64url")}.${sig}`;
    expect(verifyUnsubscribeToken(forged)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifyUnsubscribeToken("")).toBeNull();
    expect(verifyUnsubscribeToken("nodot")).toBeNull();
    expect(verifyUnsubscribeToken(".onlysig")).toBeNull();
  });
});
