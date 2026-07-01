import { afterEach, describe, expect, it, vi } from "vitest";
import { getSiteOrigin } from "./site-url";

// PR1 item 4: a spoofed Host header must never influence the origin used to build
// Stripe redirect / magic-link URLs in production. The canonical NEXT_PUBLIC_SITE_URL
// is required (fail closed) and only allowlisted request origins may override it.

function reqFrom(url: string): Request {
  return new Request(url, { method: "POST" });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSiteOrigin — production (fail closed + allowlist)", () => {
  it("throws when NEXT_PUBLIC_SITE_URL is unset in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(() => getSiteOrigin(reqFrom("https://medinaohchamber.com/x"))).toThrow(
      /NEXT_PUBLIC_SITE_URL is required/,
    );
  });

  it("ignores a spoofed Host and returns the canonical URL", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://medinaohchamber.com");

    // Attacker controls the request Host / origin.
    const spoofed = reqFrom("https://evil.attacker.example/api/join");
    expect(getSiteOrigin(spoofed)).toBe("https://medinaohchamber.com");
  });

  it("ignores a look-alike / suffix-spoof host", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://medinaohchamber.com");
    // e.g. medinaohchamber.com.evil.example — must NOT match the allowlist.
    const spoofed = reqFrom("https://medinaohchamber.com.evil.example/api/join");
    expect(getSiteOrigin(spoofed)).toBe("https://medinaohchamber.com");
  });

  it("rejects a non-https allowlisted-looking origin", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://medinaohchamber.com");
    const httpReq = reqFrom("http://medinaohchamber.com/api/join");
    // http origin is not honored → canonical (https) wins.
    expect(getSiteOrigin(httpReq)).toBe("https://medinaohchamber.com");
  });

  it("honors an allowlisted preview domain (vercel.app)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://medinaohchamber.com");
    const preview = reqFrom("https://medina-chamber-git-pr1.vercel.app/api/join");
    expect(getSiteOrigin(preview)).toBe("https://medina-chamber-git-pr1.vercel.app");
  });

  it("strips a trailing slash from the configured canonical URL", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://medinaohchamber.com/");
    expect(getSiteOrigin(reqFrom("https://evil.example/x"))).toBe(
      "https://medinaohchamber.com",
    );
  });
});

describe("getSiteOrigin — development (request-origin fallback)", () => {
  it("falls back to the request origin when NEXT_PUBLIC_SITE_URL is unset", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(getSiteOrigin(reqFrom("http://localhost:3000/api/join"))).toBe(
      "http://localhost:3000",
    );
  });

  it("prefers the configured URL over the request origin when set", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://staging.example.com");
    expect(getSiteOrigin(reqFrom("http://localhost:3000/x"))).toBe(
      "https://staging.example.com",
    );
  });
});
