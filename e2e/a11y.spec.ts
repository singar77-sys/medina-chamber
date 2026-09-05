import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

/**
 * Accessibility regression gate — honest, not aspirational.
 *
 * The site is NOT axe-clean today. Failing this suite on the whole existing
 * violation set would paint CI permanently red, which is the same mistake the
 * lint step already documents (`continue-on-error` over 74 real errors): a
 * gate that is red on every run is a gate everyone learns to ignore.
 *
 * So this gates on the SET OF SERIOUS/CRITICAL RULE IDS per page, baselined
 * below at what the live pages actually violate. Two properties matter:
 *
 *   • It fails on a NEW class of serious failure — a missing form label, an
 *     unlabelled control, a broken heading order — the moment it lands.
 *   • It does NOT fail when the node COUNT moves. The roster and the events
 *     list are rewritten by scrapers, so "17 low-contrast links" becomes 18
 *     without anybody touching the CSS. Gating on counts would make the
 *     scraper able to break CI.
 *
 * Moderate/minor findings are attached to every run's report instead of
 * failing it, so the remaining debt stays visible and countable.
 *
 * Maintaining this: fixing a rule means deleting its id from the baseline
 * (the test then enforces that it stays fixed). ADDING an id needs a reason
 * in the commit message — it is a deliberate decision to ship a serious
 * accessibility failure.
 */

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/**
 * Serious/critical axe rule ids each page violates today. Measured
 * 2026-09-05 against a production build:
 *
 *   page          critical  serious                       moderate/minor
 *   home          0         1 rule / 12 nodes  (contrast)  0
 *   directory     0         1 rule /  4 nodes  (contrast)  0
 *   events        0         1 rule / 13 nodes  (contrast)  0
 *   event detail  0         1 rule /  2 nodes  (contrast)  0
 *
 * Every one of those 31 nodes is the SAME defect wearing different clothes:
 * two brand tokens fail AA as text.
 *   • `--coquelicot` / .text-accent (#c84a1e) — 4.43:1 on the light surface
 *     (#f7f8fa), 3.65:1 on oxford (#0c1b33). AA wants 4.5:1. It is used for
 *     every overline and card CTA on the site, which is why the count is high
 *     and the rule count is one.
 *   • `--cambridge` (#83bca9 / #99c8b8) — 2.01:1 and 1.85:1 on the
 *     ResourceCard chips and CTAs. That one is not marginal.
 * There is also one decorative oxford-on-oxford numeral (1.26:1) in the
 * signature-events cards that axe sees as text.
 *
 * This is a design-token decision, not a test problem, so it is recorded here
 * rather than "fixed" by loosening the gate. Nudging --coquelicot two or three
 * points darker clears roughly 25 of the 31 nodes in one edit.
 */
const BASELINE: Record<string, string[]> = {
  home: ["color-contrast"],
  directory: ["color-contrast"],
  events: ["color-contrast"],
  "event detail": ["color-contrast"],
};

async function auditPage(page: Page, key: string, info: TestInfo) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();

  const bySeverity = (...impacts: string[]) =>
    results.violations.filter((v) => impacts.includes(v.impact ?? ""));

  const blocking = bySeverity("serious", "critical");
  const advisory = bySeverity("moderate", "minor");

  // Attached, not asserted: the standing debt, visible on every run.
  await info.attach(`axe-${key}`, {
    contentType: "application/json",
    body: JSON.stringify(
      {
        serious_critical: blocking.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.length,
          help: v.help,
        })),
        moderate_minor: advisory.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.length,
          help: v.help,
        })),
      },
      null,
      2,
    ),
  });

  const found = [...new Set(blocking.map((v) => v.id))].sort();
  expect(
    found,
    `serious/critical axe rules on "${key}" changed. Fixed one? Remove its id ` +
      `from BASELINE in e2e/a11y.spec.ts. Added one? That is a new accessibility ` +
      `regression — fix it rather than baselining it.`,
  ).toEqual([...BASELINE[key]].sort());
}

test.describe("accessibility", () => {
  test("home", async ({ page }, info) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await auditPage(page, "home", info);
  });

  test("member directory", async ({ page }, info) => {
    await page.goto("/membership/directory");
    // Audit the browse landing once its client-rendered chips are in the DOM —
    // scanning before that measures a page no visitor ever sees.
    await expect(
      page.getByRole("group", { name: "Industry filters" }),
    ).toBeVisible();
    await auditPage(page, "directory", info);
  });

  test("events", async ({ page }, info) => {
    await page.goto("/events");
    await expect(
      page.locator('#upcoming-events a[id^="tl-event-"]').first(),
    ).toBeVisible();
    await auditPage(page, "events", info);
  });

  test("event detail", async ({ page }, info) => {
    // Derived, never hardcoded: the scraper rewrites events.json daily.
    await page.goto("/events");
    const href = await page
      .locator('#upcoming-events a[id^="tl-event-"]')
      .first()
      .getAttribute("href");
    expect(href).toBeTruthy();
    await page.goto(href as string);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await auditPage(page, "event detail", info);
  });
});
