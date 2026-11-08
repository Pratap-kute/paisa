import { expect, test } from "@playwright/test";

test.describe("app shell", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("tab title follows client-side navigation", async ({ page }) => {
    await page.goto("/ledger/transaction");
    await expect(page).toHaveTitle("Transactions - Paisa");

    await page
      .locator('aside nav[aria-label="main navigation"]')
      .getByRole("link", { name: "Dashboard" })
      .click();
    await expect(page).toHaveURL("/");
    await expect(page).toHaveTitle("Dashboard - Paisa");
  });

  test("sidebar collapses to a rail and stays collapsed after reload", async ({
    page,
  }) => {
    await page.goto("/");
    const sidebar = page.locator("#desktop-sidebar");
    await expect(sidebar).toHaveCSS("width", "256px");

    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect(sidebar).toHaveCSS("width", "64px");
    await expect(
      sidebar.getByRole("link", { name: "Transactions" }),
    ).toHaveAttribute("title", "Transactions");

    await page.reload();
    await expect(sidebar).toHaveCSS("width", "64px");

    await page.getByRole("button", { name: "Expand sidebar" }).click();
    await expect(sidebar).toHaveCSS("width", "256px");
  });

  test("a group icon in the rail reopens the sidebar with the group open", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    const sidebar = page.locator("#desktop-sidebar");
    await expect(sidebar).toHaveCSS("width", "64px");

    await sidebar.getByRole("button", { name: "Cash Flow" }).click();
    await expect(sidebar).toHaveCSS("width", "256px");
    await expect(
      sidebar.getByRole("link", { name: "Income Statement" }),
    ).toBeVisible();
  });

  test("page content fills the width a collapsed sidebar gives back", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1797, height: 945 });
    await page.goto("/");
    const content = page.locator(".paisa-page-content").first();
    await expect(content).toBeVisible();

    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect(page.locator("#desktop-sidebar")).toHaveCSS("width", "64px");

    // 64px rail + 24px page padding, with no centred side margin. Before the
    // cap followed the sidebar, this window left ~43px of margin each side.
    await expect
      .poll(async () => (await content.boundingBox())?.x)
      .toBeCloseTo(88, 0);
  });
});
