import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  signPortalSession,
  verifyPortalSession,
  signMagicToken,
  verifyMagicToken,
} from "./portal-session";

// Real HMAC end to end — no mocks. This is the member-portal auth backbone
// (checkout / profile / event registration all gate on verifyPortalSession),
// and it was previously untested + mocked in every consumer, so a fail-OPEN
// regression (returning a payload before checking the signature, or swallowing
// a verify error into a truthy result) would have sailed through the green suite
// and let an attacker forge a session for any organizationId.

function b64u(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

beforeEach(() => {
  vi.stubEnv("PORTAL_AUTH_SECRET", "p".repeat(48));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("portal-session HMAC auth", () => {
  it("round-trips a portal session", async () => {
    const t = await signPortalSession("c1", "o1");
    expect(await verifyPortalSession(t)).toMatchObject({ contactId: "c1", organizationId: "o1" });
  });

  it("round-trips a magic-link token", async () => {
    const t = await signMagicToken("c1", "a@x.co");
    expect(await verifyMagicToken(t)).toMatchObject({ contactId: "c1", email: "a@x.co" });
  });

  it("rejects a tampered signature", async () => {
    const t = await signPortalSession("c1", "o1");
    const tampered = `${t.slice(0, -3)}${t.endsWith("zzz") ? "aaa" : "zzz"}`;
    expect(await verifyPortalSession(tampered)).toBeNull();
  });

  it("rejects a forged payload (swapped organizationId, reused signature)", async () => {
    const t = await signPortalSession("c1", "o1");
    const sig = t.slice(t.lastIndexOf(".") + 1);
    const forged = `${b64u(JSON.stringify({ contactId: "c1", organizationId: "EVIL", exp: Date.now() + 100000 }))}.${sig}`;
    expect(await verifyPortalSession(forged)).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const t = await signPortalSession("c1", "o1");
    vi.stubEnv("PORTAL_AUTH_SECRET", "q".repeat(48));
    expect(await verifyPortalSession(t)).toBeNull();
  });

  it("rejects an expired session", async () => {
    const t0 = 1_700_000_000_000;
    const now = vi.spyOn(Date, "now").mockReturnValue(t0);
    const t = await signPortalSession("c1", "o1");
    now.mockReturnValue(t0 + 31 * 24 * 60 * 60 * 1000); // 31 days later — past the 30-day TTL
    expect(await verifyPortalSession(t)).toBeNull();
  });

  it("rejects an expired magic-link token", async () => {
    const t0 = 1_700_000_000_000;
    const now = vi.spyOn(Date, "now").mockReturnValue(t0);
    const t = await signMagicToken("c1", "a@x.co");
    now.mockReturnValue(t0 + 16 * 60 * 1000); // 16 minutes later — past the 15-min TTL
    expect(await verifyMagicToken(t)).toBeNull();
  });

  it("rejects malformed tokens", async () => {
    expect(await verifyPortalSession("")).toBeNull();
    expect(await verifyPortalSession("no-dot-here")).toBeNull();
    expect(await verifyPortalSession(".onlysig")).toBeNull();
  });
});
