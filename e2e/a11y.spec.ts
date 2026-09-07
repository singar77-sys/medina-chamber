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
 * Serious/critical axe rule ids each page violates today.
 *
 * 2026-09-05 measured 31 colour-contrast nodes across these four pages
 * (12 / 4 / 13 / 2). They were one defect in four costumes: the brand accent
 * and cambridge were being used as small text on light surfaces at 4.43:1,
 * 3.90:1, 2.01:1 and 1.85:1, and the light-mode `.text-cambridge` remap was
 * additionally painting a light-surface orange onto oxford cards at 3.65:1.
 *
 * 2026-09-07 fixed that at the token level (see --text-accent-aa in
 * src/app/globals.css) and re-measured against a production build:
 *
 *   page          before  after   note
 *   home            12      0     CLEAN
 *   directory        4      0     CLEAN
 *   events          13      3     three known nodes, exempted BY NODE below
 *   event detail     2      0     CLEAN
 *
 * All four pages now ENFORCE the whole rule set. BASELINE is empty everywhere.
 *
 * Two dark-mode failures are known and NOT gated here (this suite runs in
 * Playwright's default light colour scheme): `link-name` on the header logo
 * link, and `.text-emerald` (#005450) on the dark events surface at 1.9:1.
 * Both live outside this gate's pages-as-configured.
 */
const BASELINE: Record<string, string[]> = {
  home: [],
  directory: [],
  events: [],
  "event detail": [],
};

interface NodeExemption {
  /** axe rule id this exemption applies to — and only this one. */
  rule: string;
  /** Matched against the offending node's own HTML. */
  match: RegExp;
  /** EXACTLY how many nodes may match. More or fewer fails. */
  count: number;
  why: string;
}

/**
 * Per-NODE exemptions, not per-rule ones.
 *
 * `events: ["color-contrast"]` in BASELINE used to be the whole story, and it
 * exempted the RULE across the entire page: a brand-new contrast failure
 * anywhere on /events was absorbed in silence. The comment said "3 nodes", but
 * the comment was documentation, not a gate.
 *
 * These are the three nodes, identified by the markup that causes them. Any
 * other contrast failure on /events is not exempt and fails the suite, and the
 * count is asserted exactly — a fourth wordmark, or a fixed one, both fail here
 * and make somebody update this list deliberately.
 */
const NODE_EXEMPTIONS: Record<string, NodeExemption[]> = {
  home: [],
  directory: [],
  "event detail": [],
  events: [
    {
      rule: "color-contrast",
      // <span aria-hidden class="… text-[5.5rem] … text-cambridge/[0.13] …">GOLF</span>
      match: /text-cambridge\/\[0\.13\]/,
      count: 3,
      why:
        "The three signature-event cards each render a giant decorative wordmark " +
        "as a real text node, which composites to #1b3042 on #0c1b33 = 1.26:1 " +
        "against the 3:1 large text needs. It carries no information (aria-hidden, " +
        "repeats the card title), so the fix is to stop shipping it as text — move " +
        "it to a background or pseudo-element — or raise the wash to a legible " +
        "opacity. Both are design calls inside src/app/events/page.tsx.",
    },
  ],
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
          // The markup, so a baseline decision can be made from the report.
          html: v.nodes.map((n) => n.html.slice(0, 160)),
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

  // Split every offending NODE into "one of the known ones" and "new".
  const exemptions = NODE_EXEMPTIONS[key] ?? [];
  const matched = new Map<NodeExemption, number>();
  const unexpected: { rule: string; html: string }[] = [];

  for (const violation of blocking) {
    for (const node of violation.nodes) {
      const exemption = exemptions.find(
        (e) => e.rule === violation.id && e.match.test(node.html),
      );
      if (exemption) {
        matched.set(exemption, (matched.get(exemption) ?? 0) + 1);
      } else {
        unexpected.push({ rule: violation.id, html: node.html.slice(0, 240) });
      }
    }
  }

  const found = [...new Set(unexpected.map((u) => u.rule))].sort();
  expect(
    found,
    `serious/critical axe rules on "${key}" changed. Fixed one? Remove its id ` +
      `from BASELINE in e2e/a11y.spec.ts. Added one? That is a new accessibility ` +
      `regression — fix it rather than baselining it.
` +
      `Offending nodes:
${JSON.stringify(unexpected, null, 2)}`,
  ).toEqual([...BASELINE[key]].sort());

  // Exact counts, so the exemption cannot quietly grow to cover new markup and
  // cannot outlive the defect it documents.
  for (const exemption of exemptions) {
    expect(
      matched.get(exemption) ?? 0,
      `"${key}" expected exactly ${exemption.count} exempt ${exemption.rule} ` +
        `node(s) matching ${exemption.match}. ${exemption.why}
` +
        `If the defect is fixed, delete this exemption. If the markup grew, that ` +
        `is a new instance of a known accessibility failure — do not just bump ` +
        `the number.`,
    ).toBe(exemption.count);
  }
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
