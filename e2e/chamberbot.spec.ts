import { expect, test } from "@playwright/test";

/**
 * ChamberBot, end to end, for $0.
 *
 * `getAIProvider()` in src/app/api/chat/route.ts returns null when BOTH
 * ANTHROPIC_API_KEY and OPENAI_API_KEY are falsy, and the route short-circuits
 * to `offlineFallbackStream()` — a fixed `OFFLINE_LINES` array. playwright.config.ts
 * blanks both keys in the webServer env, so the whole path a visitor takes
 * (mount → open → type → submit → stream → render) runs against the real route
 * and the real streaming client, with no model call. Asserting on the last
 * offline line is therefore also a live assertion that the kill switch held:
 * if a real key ever leaks into the test env, this test goes red rather than
 * quietly billing a model call on every CI run.
 */

test("ChamberBot opens, accepts a message, and renders a reply in the log", async ({
  page,
}) => {
  await page.goto("/");

  // The widget is code-split and mounted by DeferredGlobals on the first idle
  // slice (requestIdleCallback, 3s timeout) or the first interaction — so the
  // button legitimately does not exist at first paint.
  const launcher = page.getByRole("button", { name: "Open chamber assistant" });
  await expect(launcher).toBeVisible({ timeout: 20_000 });
  await launcher.click();

  const panel = page.getByRole("dialog", { name: "ChamberBot chat" });
  await expect(panel).toBeVisible();

  await panel
    .getByRole("textbox", { name: "Message ChamberBot" })
    .fill("What events are coming up?");
  await panel.getByRole("button", { name: "Send" }).click();

  // The visitor's own message has to land in the transcript, and a reply has
  // to stream back into it. Both live in the role="log" region.
  const log = panel.getByRole("log");
  await expect(log).toContainText("What events are coming up?");
  await expect(log).toContainText("Try me again in a minute.", {
    timeout: 20_000,
  });
});
