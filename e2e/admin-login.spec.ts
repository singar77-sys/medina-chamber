import { expect, test } from "@playwright/test";

/**
 * Render and refusal only. No credential goes in this repo, and the suite runs
 * with CHAT_ADMIN_TOKEN / ADMIN_SESSION_SECRET blanked, so a successful login
 * is neither possible nor desirable here.
 *
 * The refusal path is the half that carries the security guarantee anyway:
 * `getAdminAuthStatus()` is a fail-closed floor — with no usable credential
 * configured the route must 503 rather than silently fall back to a legacy
 * shared token, and a wrong password must 401. Either way the visitor stays
 * on the login screen with the reason shown. The assertion below accepts both
 * outcomes on purpose, so this test is correct whether or not the machine
 * running it has admin credentials configured.
 */

test.describe("admin login", () => {
  test("renders the form and keeps Sign in disabled until a password is typed", async ({
    page,
  }) => {
    await page.goto("/admin/login");

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    const submit = page.getByRole("button", { name: "Sign in" });
    await expect(submit).toBeDisabled();

    await page.getByLabel("Password").fill("anything");
    await expect(submit).toBeEnabled();
  });

  test("a rejected password leaves the visitor logged out on the login screen", async ({
    page,
  }) => {
    await page.goto("/admin/login");

    await page.getByLabel("Password").fill("this-is-not-the-admin-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    // The visible failure reason, whichever fail-closed branch answered.
    await expect(
      page.getByText(/Invalid password|not configured|misconfigured/i),
    ).toBeVisible();

    // The load-bearing assertion: no session was minted and no admin surface
    // was reached. An admin bypass has shipped on this site before.
    expect(new URL(page.url()).pathname).toBe("/admin/login");
    await expect(page.getByLabel("Password")).toHaveValue("");
  });
});
