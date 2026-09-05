import { defineConfig, devices } from "@playwright/test";

/**
 * Browser regression gate.
 *
 * CI already proves the source compiles, unit-tests pass, and `next build`
 * succeeds. None of that proves a visitor can actually search the directory,
 * open an event, or get an answer out of ChamberBot. This suite covers that
 * gap and nothing else — a small set of journeys that a real person would
 * notice breaking, chosen for determinism over coverage. A flaky browser
 * suite is worse than no browser suite: it gets ignored inside two weeks and
 * then a real regression rides through a red run nobody reads.
 *
 * ── Why a PRODUCTION server, not `next dev` ────────────────────────────
 * `next dev` compiles each route on first request, so the first visit to a
 * page can take tens of seconds and every timeout has to be padded to cover
 * a compile that usually isn't happening. It also runs React in StrictMode
 * (double-invoked effects) and skips ISR entirely — three ways for local and
 * CI to disagree. `next build && next start` is what Vercel actually serves,
 * so what the suite exercises is what visitors get.
 *
 * ── Why every runtime secret is blanked ────────────────────────────────
 * CI has no secrets. A developer's machine has `.env.local`, which Next
 * loads automatically into `next start`. Left alone, the SAME test would run
 * against a live Postgres + Upstash locally and against the static-roster /
 * in-memory fallbacks in CI — two different applications, one test suite,
 * and a green local run that proves nothing about the gate. Blanking them
 * here pins both environments to the secret-free path.
 *
 * Blanking is also a cost and blast-radius control:
 *   • ANTHROPIC_API_KEY / OPENAI_API_KEY — `getAIProvider()` in
 *     src/app/api/chat/route.ts returns null when BOTH are falsy, and the
 *     route short-circuits to `offlineFallbackStream()`. The full ChamberBot
 *     path (open → type → submit → stream → render) then runs for $0. With a
 *     real key present, every single run would bill a model call.
 *   • UPSTASH_* — otherwise the suite would write chat sessions, chat logs,
 *     rate-limit counters and spend-cap counters into PRODUCTION Redis on
 *     every run.
 *   • DATABASE_URL — the directory falls back to the bundled static roster,
 *     which is the same code path CI takes.
 *
 * The mechanism: @next/env only applies a `.env.local` value when the key is
 * `undefined` in the process env it snapshotted at boot. An empty string is
 * defined, so it wins — and it is falsy, so every `if (process.env.X)` guard
 * in the app takes the "not configured" branch. Verified to survive a
 * cmd.exe shell spawn on Windows as well as CI's bash.
 */

const PORT = 3210;
const BASE_URL = `http://127.0.0.1:${PORT}`;

/** Runtime secrets forced off, so a laptop with .env.local runs CI's app. */
const SECRET_FREE_ENV: Record<string, string> = {
  ANTHROPIC_API_KEY: "",
  OPENAI_API_KEY: "",
  DATABASE_URL: "",
  DATABASE_URL_UNPOOLED: "",
  UPSTASH_REDIS_REST_URL: "",
  UPSTASH_REDIS_REST_TOKEN: "",
  UPSTASH_VECTOR_REST_URL: "",
  UPSTASH_VECTOR_REST_TOKEN: "",
  STRIPE_SECRET_KEY: "",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "",
  RESEND_API_KEY: "",
  BLOB_READ_WRITE_TOKEN: "",
  CHAT_ADMIN_TOKEN: "",
  ADMIN_SESSION_SECRET: "",
  PORTAL_AUTH_SECRET: "",
  CRON_SECRET: "",
  // Sentry off: no test traffic in the production issue stream, and the
  // client SDK is 500KB of JS the browser does not need to download 17 times.
  SENTRY_DSN: "",
  NEXT_PUBLIC_SENTRY_DSN: "",
  // Set rather than blanked: getSiteOrigin() throws in production when this
  // is missing, and an absent value is exactly the difference between a
  // laptop and CI that the rest of this block exists to erase.
  NEXT_PUBLIC_SITE_URL: BASE_URL,
};

export default defineConfig({
  testDir: "./e2e",
  // Per-test ceiling. Every assertion in the suite is on locally served,
  // already-built pages; 30s is generous and still fails fast on a hang.
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  // A committed `test.only` silently shrinks the gate to one test while
  // still reporting green. Refuse it in CI.
  forbidOnly: !!process.env.CI,
  // One retry in CI only. Locally a flake must be visible, not papered over.
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    // Only pay for artifacts on a retry — a green run writes nothing.
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    // The site honours prefers-reduced-motion properly: globals.css pins
    // every .fade-in-* to opacity 1 / transform none, so scroll-triggered
    // content is settled the moment it renders. That removes the single
    // largest source of timing flake AND makes the axe colour-contrast
    // results honest (a half-faded element reports a bogus contrast ratio).
    reducedMotion: "reduce",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // 1440 wide, not Playwright's 1280 default: the header swaps the
        // desktop nav for the hamburger at Tailwind's `xl` (exactly 1280px),
        // so the default viewport sits on the breakpoint boundary.
        viewport: { width: 1440, height: 900 },
      },
      testIgnore: /.*\.mobile\.spec\.ts/,
    },
    {
      // Mobile-only journeys (the drawer nav). Pixel 5 is a Chromium device
      // profile, so this reuses the one downloaded browser.
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
      testMatch: /.*\.mobile\.spec\.ts/,
    },
  ],
  webServer: {
    command: `pnpm build && pnpm exec next start --port ${PORT}`,
    url: BASE_URL,
    // The build dominates: a cold `next build` on this app is minutes, not
    // seconds. CI never reuses, so it always pays it once.
    timeout: 600_000,
    reuseExistingServer: !process.env.CI,
    env: SECRET_FREE_ENV,
    stdout: "ignore",
    stderr: "pipe",
  },
});
