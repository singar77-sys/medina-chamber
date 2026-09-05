import { afterEach, describe, expect, it, vi } from "vitest";
import { isAuthorizedCron } from "./cron-auth";

// The only thing between the open internet and runGzSync / the renewal engine /
// the join sweep. It is small and pure, which is exactly why a one-character
// regression (a flipped comparison, a dropped length floor) would be invisible.

const SECRET = "s".repeat(32);

function req(auth?: string): Request {
  return new Request("https://medinaohchamber.com/api/cron/gz-sync", {
    headers: auth === undefined ? {} : { authorization: auth },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isAuthorizedCron", () => {
  it("refuses everything when CRON_SECRET is unset", async () => {
    vi.stubEnv("CRON_SECRET", undefined as unknown as string);
    expect(await isAuthorizedCron(req(`Bearer ${SECRET}`))).toBe(false);
  });

  it("refuses everything when CRON_SECRET is under the 16-char floor", async () => {
    const short = "s".repeat(15);
    vi.stubEnv("CRON_SECRET", short);
    // Even the correct value must not authorize a too-weak secret.
    expect(await isAuthorizedCron(req(`Bearer ${short}`))).toBe(false);
  });

  it("accepts a 16-char secret (the floor itself is allowed)", async () => {
    const min = "s".repeat(16);
    vi.stubEnv("CRON_SECRET", min);
    expect(await isAuthorizedCron(req(`Bearer ${min}`))).toBe(true);
  });

  it("accepts the matching bearer token, case-insensitively, with surrounding space", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    expect(await isAuthorizedCron(req(`Bearer ${SECRET}`))).toBe(true);
    expect(await isAuthorizedCron(req(`bearer ${SECRET}`))).toBe(true);
    expect(await isAuthorizedCron(req(`Bearer  ${SECRET}  `))).toBe(true);
  });

  it("refuses a missing, malformed, or wrong Authorization header", async () => {
    vi.stubEnv("CRON_SECRET", SECRET);
    expect(await isAuthorizedCron(req())).toBe(false);
    expect(await isAuthorizedCron(req(""))).toBe(false);
    expect(await isAuthorizedCron(req(SECRET))).toBe(false); // no scheme
    expect(await isAuthorizedCron(req(`Basic ${SECRET}`))).toBe(false);
    expect(await isAuthorizedCron(req("Bearer wrong-secret-value-32-chars-xx"))).toBe(false);
    expect(await isAuthorizedCron(req(`Bearer ${SECRET}extra`))).toBe(false);
    expect(await isAuthorizedCron(req(`Bearer ${SECRET.slice(0, -1)}`))).toBe(false);
  });
});
