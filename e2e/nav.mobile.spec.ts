import { expect, test } from "@playwright/test";

/**
 * Runs only in the `mobile-chrome` project (see the `.mobile.spec.ts` match in
 * playwright.config.ts). The hamburger is `xl:hidden`, so on a desktop
 * viewport this drawer does not exist at all — and it is the only way most of
 * the chamber's traffic can move around the site.
 *
 * Top-level items with children render as accordion BUTTONS in the drawer, not
 * links ("Events" opens a section; "Directory" is a plain link). Both shapes
 * are covered below.
 */

/** aria-labelledby="mobile-menu-title" → the accessible name is "Menu". Named
 *  explicitly so this never collides with the ChamberBot dialog. */
const DRAWER = { name: "Menu" };

test("the drawer's accordion reaches a real page and closes behind it", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Open menu" }).click();
  const drawer = page.getByRole("dialog", DRAWER);
  await expect(drawer).toBeVisible();

  // "Events" is a section, not a link — its children only exist once expanded.
  const section = drawer.getByRole("button", { name: "Events" });
  await expect(section).toHaveAttribute("aria-expanded", "false");
  await section.click();
  await expect(section).toHaveAttribute("aria-expanded", "true");

  await drawer.getByRole("link", { name: /Upcoming Events/ }).click();
  await page.waitForURL("**/events");

  // A drawer that stays open over the page it just opened is the classic
  // mobile-nav failure, and it is invisible to every other kind of test.
  await expect(page.getByRole("dialog", DRAWER)).toBeHidden();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("the drawer's direct links navigate, and it can be dismissed instead", async ({
  page,
}) => {
  await page.goto("/");

  // Dismiss without navigating. Two controls are labelled "Close menu" — the
  // full-screen backdrop button and the X in the drawer header — so a bare
  // locator would be strict-mode ambiguous. `.last()` is the header X.
  await page.getByRole("button", { name: "Open menu" }).click();
  const drawer = page.getByRole("dialog", DRAWER);
  await expect(drawer).toBeVisible();
  await drawer.getByRole("button", { name: "Close menu" }).last().click();
  await expect(page.getByRole("dialog", DRAWER)).toBeHidden();
  expect(new URL(page.url()).pathname).toBe("/");

  // Reopen and take a top-level link (no children → rendered as a Link).
  await page.getByRole("button", { name: "Open menu" }).click();
  await page
    .getByRole("dialog", DRAWER)
    .getByRole("link", { name: "Directory", exact: true })
    .click();
  await page.waitForURL("**/membership/directory");
  await expect(
    page.getByRole("textbox", { name: "Search chamber members" }),
  ).toBeVisible();
});
