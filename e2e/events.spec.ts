import { expect, test } from "@playwright/test";

/**
 * Events are the chamber's main reason for a member to visit the site at all,
 * and `src/data/events.json` is rewritten daily by the scraper — so nothing
 * here may name an event. Slugs are derived from the rendered timeline, whose
 * links carry a stable `id="tl-event-<slug>"`. That id also separates real
 * event links from `/events/sponsorships`, which lives under the same path
 * prefix but is not an event.
 */
const TIMELINE_EVENT_LINK = '#upcoming-events a[id^="tl-event-"]';

test.describe("events", () => {
  test("lists upcoming events alongside the programme sections", async ({ page }) => {
    await page.goto("/events");

    // An events page with no events on it is the failure that matters, and it
    // has happened here before (an empty upcoming list after a bad scrape).
    await expect(page.locator(TIMELINE_EVENT_LINK).first()).toBeVisible();
    expect(await page.locator(TIMELINE_EVENT_LINK).count()).toBeGreaterThan(0);

    await expect(
      page.getByRole("heading", { name: "Regular Programming" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Annual Signature Events" }),
    ).toBeVisible();
  });

  test("opening an event from the timeline lands on its detail page", async ({
    page,
  }) => {
    await page.goto("/events");

    const first = page.locator(TIMELINE_EVENT_LINK).first();
    await expect(first).toBeVisible();
    const href = await first.getAttribute("href");
    expect(href).toMatch(/^\/events\/[a-z0-9-]+$/);

    await first.click();
    await page.waitForURL(`**${href}`);

    // Title and way back out. A detail page that renders with no heading is
    // the shape of the scraper-artefact bugs this site has had before.
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible();
    expect((await h1.textContent())?.trim().length ?? 0).toBeGreaterThan(0);
    await expect(
      page.getByRole("navigation", { name: "Breadcrumb" }),
    ).toBeVisible();
  });

  test("an unknown event slug 404s instead of rendering an empty page", async ({
    page,
  }) => {
    // Slugs change with every scrape; a retired event must return a real 404
    // so search engines drop it, not a 200 with nothing on it.
    const res = await page.goto("/events/this-event-does-not-exist-e2e");
    expect(res?.status()).toBe(404);
    // generateMetadata answers "Event Not Found" for an unmatched slug before
    // the page calls notFound(); the shared 404 shell says "Page Not Found".
    // Either is correct — the status code is the assertion that matters.
    await expect(page).toHaveTitle(/Not Found/);
  });
});
