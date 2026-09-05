import { expect, test } from "@playwright/test";

test.describe("home", () => {
  test("renders the hero, the primary nav, and both hero CTAs", async ({ page }) => {
    await page.goto("/");

    // The h1 is split across three <span>s ("Medina" / "Means" / "business"),
    // so the accessible name is whitespace-normalised differently than the
    // source reads. Assert on the one word that is stable across that.
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Medina");
    await expect(page).toHaveTitle(/Greater Medina Chamber of Commerce/);

    // The nav is the site's spine. If it stops rendering, every page on the
    // site loses its way out.
    await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();

    // The two hero CTAs are the top of both funnels the site exists for:
    // joining, and finding a member.
    await expect(
      page.getByRole("link", { name: /Join the Chamber/ }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Browse the Directory" }),
    ).toBeVisible();
  });

  test("the hero CTA reaches a working member directory", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Browse the Directory" }).click();
    await page.waitForURL("**/membership/directory");

    // Not "a div exists": the directory is only useful if a visitor can
    // actually search it or browse it by industry.
    await expect(
      page.getByRole("textbox", { name: "Search chamber members" }),
    ).toBeVisible();
    await expect(
      page.getByRole("group", { name: "Industry filters" }),
    ).toBeVisible();
  });
});
