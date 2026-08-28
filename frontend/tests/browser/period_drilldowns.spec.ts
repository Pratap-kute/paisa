import { expect, test } from "@playwright/test";

test("investment drilldown focuses the requested historical month", async ({ page }) => {
  await page.goto("/assets/investment?period=2022-01");
  await expect(page.getByText("Showing January 2022")).toBeVisible();
  await expect(page.getByText("Net Investment", { exact: true })).toBeVisible();
  await expect(page.getByText("Latest FY Investment", { exact: true }))
    .toHaveCount(0);
  await expect(
    page.locator(
      "[data-testid='investment-monthly-echart'][data-chart-ready='true']",
    ),
  ).toBeVisible();
});

test("historical budget drilldown hides live-only metrics", async ({ page }) => {
  await page.goto("/expense/budget?period=2022-01");
  await expect(page.getByText("Showing January 2022")).toBeVisible();
  await expect(page.getByText("All Budgets", { exact: true })).toBeVisible();
  await expect(page.getByText("Available for Budgeting", { exact: true }))
    .toHaveCount(0);
  await expect(page.getByText("Checking Balance", { exact: true }))
    .toHaveCount(0);
});

test("insights month picker preserves URL state and browser history", async ({ page }) => {
  await page.goto("/insights?period=2022-01");
  await expect(page.getByRole("button", { name: "Select month and year" }))
    .toContainText("Jan 2022");

  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page).toHaveURL(/\/insights\?period=2022-02$/);
  await expect(page.getByRole("button", { name: "Select month and year" }))
    .toContainText("Feb 2022");

  await page.goBack();
  await expect(page).toHaveURL(/\/insights\?period=2022-01$/);
  await expect(page.getByRole("button", { name: "Select month and year" }))
    .toContainText("Jan 2022");
});
