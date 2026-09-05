import { expect, test, type Page } from "@playwright/test";

/**
 * The member directory is the site's highest-traffic interactive surface and
 * its most fragile one — every view below is pure client state on a
 * force-dynamic route.
 *
 * Two hard-won constraints shape every test in this file:
 *
 *  1. `DirectoryClient.tsx` syncs filter state to the URL with
 *     `window.history.replaceState`, deliberately, because `router.replace`
 *     on this route triggers an RSC refetch that tears the filter state down
 *     (the "results flash then vanish" bug). Playwright's `waitForURL` and
 *     `waitForNavigation` never fire for a `replaceState`, so URL assertions
 *     here poll `page.url()` instead. The write is also debounced 250ms.
 *  2. Member cards render only after client state, so nothing may be asserted
 *     on first paint of the landing page.
 */

/** Member cards are the only links to a member page that carry a heading —
 *  the Community Investor marquee at the foot of the page links to the same
 *  URLs with an image inside. Verified: 70 marquee anchors, 0 with an <h3>. */
const MEMBER_CARD = 'a[href^="/membership/directory/"]:has(h3)';

/** First industry chip's label, read at runtime. The category list is derived
 *  from the roster, which the weekly scraper rewrites — hardcoding "Insurance"
 *  is a dated bomb. */
async function firstIndustry(page: Page): Promise<string> {
  const chip = page
    .getByRole("group", { name: "Industry filters" })
    .getByRole("button")
    .first();
  await expect(chip).toBeVisible();
  const label = (await chip.textContent())?.trim();
  expect(label, "an industry chip should carry a visible label").toBeTruthy();
  return label as string;
}

test.describe("member directory", () => {
  test("picking an industry filters to member cards and records it in the URL", async ({
    page,
  }) => {
    await page.goto("/membership/directory");

    const industry = await firstIndustry(page);
    const filters = page.getByRole("group", { name: "Industry filters" });
    await filters.getByRole("button", { name: industry, exact: true }).click();

    // Clicking swaps the browse band out for the results view, which mounts a
    // second chip strip. Re-resolve, then assert the chip reads as selected —
    // this is the "is the filter actually applied" signal, not a class name.
    await expect(
      page
        .getByRole("group", { name: "Industry filters" })
        .getByRole("button", { name: industry, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");

    // The point of the filter: real, clickable businesses appear.
    await expect(page.locator(MEMBER_CARD).first()).toBeVisible();
    expect(await page.locator(MEMBER_CARD).count()).toBeGreaterThan(0);

    // A filtered directory has to be shareable. replaceState + 250ms debounce,
    // so poll rather than wait for a navigation that never happens.
    await expect
      .poll(() => new URL(page.url()).searchParams.get("category"), {
        message: "the applied category should end up in the URL",
      })
      .toBe(industry);
  });

  test("a deep-linked category renders results without a further click", async ({
    page,
  }) => {
    await page.goto("/membership/directory");
    const industry = await firstIndustry(page);

    // The URL is the shareable artefact; if it does not restore the view, the
    // link a member emails to a customer lands on the wrong page.
    await page.goto(
      `/membership/directory?category=${encodeURIComponent(industry)}`,
    );

    await expect(page.locator(MEMBER_CARD).first()).toBeVisible();
    await expect(
      page
        .getByRole("group", { name: "Industry filters" })
        .getByRole("button", { name: industry, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("Clear all returns the directory to the browse landing", async ({ page }) => {
    await page.goto("/membership/directory");
    const industry = await firstIndustry(page);
    await page
      .getByRole("group", { name: "Industry filters" })
      .getByRole("button", { name: industry, exact: true })
      .click();
    await expect(page.locator(MEMBER_CARD).first()).toBeVisible();

    await page.getByRole("button", { name: "Clear all" }).click();

    // Back in browse mode: the results grid is gone and the browse band's
    // "Browse all members" CTA is back. A filter that cannot be removed is a
    // dead end — every applied filter is meant to be individually removable.
    await expect(page.locator(MEMBER_CARD)).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: /Browse all members/ }),
    ).toBeVisible();
    await expect
      .poll(() => new URL(page.url()).searchParams.toString())
      .toBe("");
  });

  test("typing a query keeps every character and turns it into a removable filter", async ({
    page,
  }) => {
    await page.goto("/membership/directory");

    const search = page.getByRole("textbox", { name: "Search chamber members" });
    await expect(search).toBeVisible();
    await search.click();

    // Regression cover for a real, shipped bug: the browse band and the
    // results view each render their OWN search input, so the first keystroke
    // unmounted the field being typed into and focus dropped to <body> —
    // every character after the first went nowhere (or "/" opened the command
    // palette). `pressSequentially` types one key at a time through that
    // unmount, which `fill` would not.
    await search.pressSequentially("insurance", { delay: 30 });

    const active = page.getByRole("textbox", { name: "Search chamber members" });
    await expect(active).toHaveValue("insurance");

    // The query has to be visible as a filter the visitor can take off again.
    await expect(page.getByText("“insurance”")).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear all" })).toBeVisible();
  });

  test("a member card opens that member's page", async ({ page }) => {
    await page.goto("/membership/directory");
    const industry = await firstIndustry(page);
    await page
      .getByRole("group", { name: "Industry filters" })
      .getByRole("button", { name: industry, exact: true })
      .click();

    const card = page.locator(MEMBER_CARD).first();
    await expect(card).toBeVisible();
    const name = (await card.locator("h3").first().textContent())?.trim();
    expect(name).toBeTruthy();

    await card.click();
    await page.waitForURL(/\/membership\/directory\/[^/?]+$/);

    // The listing and the profile must agree about who this business is.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      name as string,
    );
  });
});
