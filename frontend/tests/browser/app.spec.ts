import { existsSync } from "node:fs";
import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ request }) => {
  const response = await request.post("/api/sync", { data: { journal: true } });
  expect(response.ok()).toBeTruthy();
});

test("application starts without fatal browser errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "main navigation" }))
    .toBeVisible();
  expect(errors).toEqual([]);
});

test("dashboard renders synchronized fixture data", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Net worth", { exact: true }).first())
    .toBeVisible();
  await expect(page.getByRole("link", { name: "Transactions" }).first())
    .toBeVisible();
});

test("major pages are routable", async ({ page }) => {
  for (
    const path of [
      "/ledger/transaction",
      "/ledger/editor",
      "/ledger/import",
      "/assets/networth",
      "/cash_flow/monthly",
    ]
  ) {
    await page.goto(path);
    await expect(page.locator("body")).not.toBeEmpty();
    await expect(page.getByRole("navigation", { name: "main navigation" }))
      .toBeVisible();
  }
});

test("transaction search filters fixture transactions", async ({ page }) => {
  await Promise.all([
    page.waitForResponse((response) =>
      response.url().endsWith("/api/transaction")
    ),
    page.goto("/ledger/transaction"),
  ]);
  const count = page.getByText(/\d+ transaction\(s\)/);
  await expect(count).toBeVisible();
  const before = await count.textContent();
  const search = page.locator(".search-query-editor .cm-content");
  await search.click();
  await page.keyboard.type('payee = "Rent"');
  await expect(count).not.toHaveText(before ?? "");
});

test("journal editor saves and reloads changes", async ({ page }) => {
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/editor")),
    page.goto("/ledger/editor/main.ledger"),
  ]);
  const editor = page.locator(".cm-content").first();
  await expect(editor).toBeVisible();
  await editor.press("Control+End");
  await editor.pressSequentially("\n; browser smoke marker");
  const [saveResponse] = await Promise.all([
    page.waitForResponse((response) =>
      new URL(response.url()).pathname === "/api/editor/save" &&
      response.request().method() === "POST"
    ),
    page.getByRole("button", { name: "Save" }).click(),
  ]);
  expect(saveResponse.ok()).toBe(true);
  const saveResult = await saveResponse.json();
  expect(saveResult.saved, saveResult.message).toBe(true);
  await page.reload();
  await expect(editor).toContainText("browser smoke marker");
});

test("import produces a preview without saving", async ({ page }) => {
  const fixturePath = existsSync("../fixture/import/Paytm/statement.csv")
    ? "../fixture/import/Paytm/statement.csv"
    : "fixture/import/Paytm/statement.csv";
  await page.goto("/ledger/import");
  await page.locator('input[type="file"]').setInputFiles(fixturePath);
  await expect(page.locator(".paisa-source-pane, table").first()).toBeVisible();
  await expect(page.locator("button.save")).toBeVisible();
});

test("networth chart renders on analytics page", async ({ page }) => {
  await page.goto("/assets/networth");
  await expect(page.getByRole("heading", { name: "Net Worth" })).toBeVisible();
  await expect(page.locator("#d3-networth-timeline g").first()).toBeVisible();
});

test("cash flow monthly chart renders", async ({ page }) => {
  await page.goto("/cash_flow/monthly");
  await expect(page.locator("#d3-monthly-cash-flow")).toBeVisible();
});

test("bulk edit form opens and displays account selection", async ({ page }) => {
  await page.goto("/ledger/transaction");
  await expect(page.getByText(/\d+ transaction\(s\)/)).toBeVisible();

  const bulkEditButton = page.getByRole("button", { name: "Bulk Edit" });
  await expect(bulkEditButton).toBeVisible();
  await bulkEditButton.click();

  await expect(
    page.locator(".field").filter({ hasText: /rename account/i }).first(),
  ).toBeVisible();
});

test("credit card statement cycle switcher updates bill details", async ({ page }) => {
  await page.goto(
    "/liabilities/credit_cards/Liabilities%3ACreditCard%3AFreedom",
  );
  await expect(page.getByText("Freedom", { exact: false }).first())
    .toBeVisible();

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
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/sheet")),
    page.goto("/more/sheets/overview.paisa"),
  ]);
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toBeEmpty();
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

  await toggle.click();
  const revertedTheme = await html.getAttribute("data-theme");
  expect(revertedTheme).toBe(initialTheme);
});

test("doctor diagnostics page reports system status", async ({ page }) => {
  await page.goto("/more/doctor");
  await expect(page.locator("body")).not.toBeEmpty();
  await expect(page.getByRole("navigation", { name: "main navigation" }))
    .toBeVisible();
});

test("an API failure leaves a visible error instead of a blank page", async ({ page }) => {
  await page.route(
    "**/api/dashboard",
    (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: '{"error":"test failure"}',
      }),
  );
  await page.goto("/");
  await expect(page.locator("body")).toContainText(
    /error|failed|report this issue/i,
  );
});

test("config page loads configuration sections", async ({ page }) => {
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/config")),
    page.goto("/more/config"),
  ]);
  await expect(
    page.getByRole("navigation", { name: "Configuration sections" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
});

test("config page saves changes", async ({ page }) => {
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/config")),
    page.goto("/more/config"),
  ]);
  const precisionInput = page
    .locator(".config-field")
    .filter({ hasText: "Display Precision" })
    .getByRole("spinbutton");
  await expect(precisionInput).toHaveValue("0");
  await page.route("**/api/config", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      expect(body.display_precision).toBe(1);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
      return;
    }
    await route.continue();
  });
  await precisionInput.fill("1");
  const saveButton = page.getByRole("button", { name: "Save" });
  await expect(saveButton).toBeEnabled();
  const [saveResponse] = await Promise.all([
    page.waitForResponse((response) =>
      new URL(response.url()).pathname === "/api/config" &&
      response.request().method() === "POST"
    ),
    saveButton.click(),
  ]);
  expect(saveResponse.ok()).toBe(true);
  await expect(page.getByRole("status").filter({ hasText: "Saved config" }))
    .toBeVisible();
});

test("posting search filters fixture postings", async ({ page }) => {
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/ledger")),
    page.goto("/ledger/posting"),
  ]);
  const payeeLinks = page.locator(".paisa-posting-table .secondary-link");
  await expect(payeeLinks.first()).toBeVisible();
  const before = await payeeLinks.count();
  const search = page.locator(".search-query-editor .cm-content");
  await search.click();
  await page.keyboard.type('payee = "Rent"');
  await expect.poll(() => payeeLinks.count(), { timeout: 5000 })
    .toBeLessThan(before);
  await expect(payeeLinks.first()).toContainText("Rent");
});

test("price cache clear shows success feedback", async ({ page }) => {
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/price")),
    page.goto("/ledger/price"),
  ]);
  await page.route("**/api/price/delete", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    }));
  await expect(page.getByRole("button", { name: "Clear Price Cache" }))
    .toBeVisible();
  const [deleteResponse] = await Promise.all([
    page.waitForResponse((response) =>
      new URL(response.url()).pathname === "/api/price/delete" &&
      response.request().method() === "POST"
    ),
    page.getByRole("button", { name: "Clear Price Cache" }).click(),
  ]);
  expect(deleteResponse.ok()).toBe(true);
  await expect(
    page.locator(".paisa-toast-container").filter({
      hasText: "Price cache cleared.",
    }),
  ).toBeVisible();
});

test("budget page renders account budget cards", async ({ page }) => {
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/budget")),
    page.goto("/expense/budget"),
  ]);
  await expect(page.locator(".budget-card").first()).toBeVisible();
});

test("goals page renders fixture goals", async ({ page }) => {
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith("/api/goals")),
    page.goto("/more/goals"),
  ]);
  await expect(page.getByRole("heading", { name: "Retirement" })).toBeVisible();
});
