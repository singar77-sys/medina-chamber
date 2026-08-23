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

  it("honors THIS deployment's own Vercel host (exact match on VERCEL_BRANCH_URL)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://medinaohchamber.com");
    vi.stubEnv("VERCEL_BRANCH_URL", "medina-chamber-git-pr1.vercel.app");
    const preview = reqFrom("https://medina-chamber-git-pr1.vercel.app/api/join");
    expect(getSiteOrigin(preview)).toBe("https://medina-chamber-git-pr1.vercel.app");
  });

  it("ignores an arbitrary *.vercel.app host that is NOT this deployment", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://medinaohchamber.com");
    vi.stubEnv("VERCEL_URL", "");
    vi.stubEnv("VERCEL_BRANCH_URL", "");
    // Any Vercel customer can register attacker-anything.vercel.app — a bare
    // suffix rule would trust it. Only exact deployment hosts may pass.
    const foreign = reqFrom("https://attacker-anything.vercel.app/api/join");
    expect(getSiteOrigin(foreign)).toBe("https://medinaohchamber.com");
  });

  it("ignores subdomains of the canonical domains (business.* is externally hosted)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://medinaohchamber.com");
    const growthzone = reqFrom("https://business.medinachamber.com/api/join");
    expect(getSiteOrigin(growthzone)).toBe("https://medinaohchamber.com");
  });

  it("honors the www variant of a canonical domain", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://medinaohchamber.com");
    const www = reqFrom("https://www.medinachamber.com/api/join");
    expect(getSiteOrigin(www)).toBe("https://www.medinachamber.com");
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
