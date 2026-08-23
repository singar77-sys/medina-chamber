import { afterEach, describe, expect, it, vi } from "vitest";
import { assertSameOrigin } from "./csrf";

// Every intentional branch of the CSRF gate is pinned here — it guards all
// cookie-authenticated mutations (admin + portal), so a silently widened
// bypass would be invisible without these.

function req(
  method: string,
  headers: Record<string, string> = {},
  url = "https://medinaohchamber.com/api/portal/profile",
): Request {
  return new Request(url, { method, headers });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("assertSameOrigin", () => {
  it("never blocks safe methods, even labeled cross-site", () => {
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      expect(
        assertSameOrigin(
          req(method, {
            origin: "https://evil.example",
            "sec-fetch-site": "cross-site",
          }),
        ),
      ).toBeNull();
    }
  });

  it("rejects an unsafe request the browser labels cross-site — even without Origin", () => {
    const res = assertSameOrigin(req("POST", { "sec-fetch-site": "cross-site" }));
    expect(res?.status).toBe(403);
  });

  it("allows an Origin-less POST with no fetch metadata (SameSite fallback)", () => {
    expect(assertSameOrigin(req("POST"))).toBeNull();
  });

  it("allows same-origin: Origin host equals the request Host", () => {
    const r = req("POST", {
      origin: "https://medinaohchamber.com",
      host: "medinaohchamber.com",
      "sec-fetch-site": "same-origin",
    });
    expect(assertSameOrigin(r)).toBeNull();
  });

  it("allows an allowlisted canonical origin when Host differs (proxy setups)", () => {
    const r = req("POST", {
      origin: "https://www.medinachamber.com",
      host: "internal-proxy-host",
    });
    expect(assertSameOrigin(r)).toBeNull();
  });

  it("rejects a foreign *.vercel.app origin — the allowlist is exact-host, not suffix", () => {
    vi.stubEnv("VERCEL_URL", "");
    vi.stubEnv("VERCEL_BRANCH_URL", "");
    const r = req("POST", {
      origin: "https://attacker-anything.vercel.app",
      host: "medinaohchamber.com",
    });
    expect(assertSameOrigin(r)?.status).toBe(403);
  });

  it("allows this deployment's own Vercel host via VERCEL_URL", () => {
    vi.stubEnv("VERCEL_URL", "chamber-abc123.vercel.app");
    const r = req("POST", {
      origin: "https://chamber-abc123.vercel.app",
      host: "internal-proxy-host",
    });
    expect(assertSameOrigin(r)).toBeNull();
  });

  it("rejects the externally-hosted business.* subdomain", () => {
    const r = req("POST", {
      origin: "https://business.medinachamber.com",
      host: "medinaohchamber.com",
    });
    expect(assertSameOrigin(r)?.status).toBe(403);
  });

  it("rejects a malformed Origin header", () => {
    const r = req("POST", { origin: "not-a-url" });
    expect(assertSameOrigin(r)?.status).toBe(403);
  });

  it("rejects a cross-origin PUT/PATCH/DELETE the same as POST", () => {
    for (const method of ["PUT", "PATCH", "DELETE"]) {
      const r = req(method, {
        origin: "https://evil.example",
        host: "medinaohchamber.com",
      });
      expect(assertSameOrigin(r)?.status).toBe(403);
    }
  });
});
