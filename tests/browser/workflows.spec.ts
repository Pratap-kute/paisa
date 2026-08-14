import { expect, test } from "@playwright/test";

test.beforeAll(async ({ request }) => {
  const response = await request.post("/api/sync", { data: { journal: true } });
  expect(response.ok()).toBeTruthy();
});

test("bulk edit form opens and displays account selection", async ({ page }) => {
  await page.goto("/ledger/transaction");
  await expect(page.locator("p.is-6").filter({ hasText: "transaction(s)" })).toBeVisible();

  const bulkEditButton = page.getByRole("button", { name: "Bulk Edit" });
  await expect(bulkEditButton).toBeVisible();
  await bulkEditButton.click();

  // Form should be revealed
  await expect(page.locator(".field").filter({ hasText: /rename account/i }).first()).toBeVisible();
});

test("credit card statement cycle switcher updates bill details", async ({ page }) => {
  await page.goto("/liabilities/credit_cards/Liabilities%3ACreditCard%3AFreedom");
  await expect(page.getByText("Freedom", { exact: false }).first()).toBeVisible();

  const select = page.locator("select");
  await expect(select).toBeVisible();

  const options = await select.locator("option").all();
  if (options.length > 1) {
    const secondOptionValue = await options[1].getAttribute("value");
    await select.selectOption({ index: 1 });
    await expect(select).toHaveValue(secondOptionValue ?? "");
  }
});

test("interactive sheets editor loads calculations", async ({ page }) => {
  await page.goto("/more/sheets/overview.paisa");
  await expect(page.locator(".cm-content")).toBeVisible();
  await expect(page.getByRole("button", { name: /save/i })).toBeVisible();
});

test("theme toggle switches document theme between light and dark", async ({ page }) => {
  await page.goto("/");
  const toggle = page.locator("button.theme-toggle");
  await expect(toggle).toBeVisible();

  const html = page.locator("html");
  const initialTheme = (await html.getAttribute("data-theme")) || "light";
  await toggle.click();

  const toggledTheme = await html.getAttribute("data-theme");
  expect(toggledTheme).not.toBe(initialTheme);

  // Toggle back
  await toggle.click();
  const revertedTheme = await html.getAttribute("data-theme");
  expect(revertedTheme).toBe(initialTheme);
});

test("doctor diagnostics page reports system status", async ({ page }) => {
  await page.goto("/more/doctor");
  await expect(page.locator("body")).not.toBeEmpty();
  await expect(page.getByRole("navigation", { name: "main navigation" })).toBeVisible();
});
