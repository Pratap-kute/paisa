import { expect, type Page, test } from "@playwright/test";

test.describe.configure({ mode: "parallel" });

const pages = [
  { name: "dashboard", path: "/", readyText: "Net worth" },
  { name: "assets-allocation", path: "/assets/allocation" },
  {
    name: "assets-analysis",
    path: "/assets/analysis",
    ready: "#d3-portfolio-security-type > g",
  },
  { name: "assets-balance", path: "/assets/balance" },
  { name: "assets-gain", path: "/assets/gain" },
  { name: "assets-gain-detail", path: "/assets/gain/Assets%3AEquity" },
  { name: "assets-investment", path: "/assets/investment" },
  { name: "networth", path: "/assets/networth", readyText: "Net worth" },
  { name: "cash-flow-income-statement", path: "/cash_flow/income_statement" },
  { name: "cash-flow-monthly", path: "/cash_flow/monthly" },
  {
    name: "cash-flow-recurring",
    path: "/cash_flow/recurring",
    ready: ".columns.mb-4 .box",
  },
  { name: "cash-flow-yearly", path: "/cash_flow/yearly" },
  { name: "expense-budget", path: "/expense/budget", ready: ".budget-card" },
  { name: "expense-monthly", path: "/expense/monthly" },
  { name: "expense-yearly", path: "/expense/yearly" },
  { name: "income", path: "/income" },
  { name: "ledger-editor", path: "/ledger/editor" },
  { name: "ledger-editor-file", path: "/ledger/editor/main.ledger" },
  { name: "ledger-import", path: "/ledger/import" },
  { name: "ledger-posting", path: "/ledger/posting" },
  { name: "ledger-price", path: "/ledger/price" },
  { name: "transactions", path: "/ledger/transaction", ready: "p.is-6" },
  {
    name: "liabilities-balance",
    path: "/liabilities/balance",
    readyText: "HomeLoan",
  },
  {
    name: "credit-cards",
    path: "/liabilities/credit_cards",
    readyText: "Freedom",
  },
  {
    name: "credit-card-detail",
    path: "/liabilities/credit_cards/Liabilities%3ACreditCard%3AFreedom",
  },
  { name: "liabilities-interest", path: "/liabilities/interest" },
  { name: "liabilities-repayment", path: "/liabilities/repayment" },
  { name: "about", path: "/more/about" },
  { name: "config", path: "/more/config" },
  { name: "doctor", path: "/more/doctor" },
  { name: "goals", path: "/more/goals", readyText: "Retirement" },
  { name: "retirement-goal", path: "/more/goals/retirement/Retirement" },
  { name: "savings-goal", path: "/more/goals/savings/House" },
  {
    name: "logs",
    path: "/more/logs",
    readyText: "paisa server started on port 7500",
  },
  { name: "sheets", path: "/more/sheets" },
  { name: "sheet-detail", path: "/more/sheets/overview.paisa" },
  { name: "tax-capital-gains", path: "/more/tax/capital_gains" },
  { name: "tax-harvest", path: "/more/tax/harvest" },
  { name: "tax-schedule-al", path: "/more/tax/schedule_al" },
  { name: "login", path: "/login" },
] as const;

const mockLogs = {
  logs: [
    {
      time: "2022-02-07T10:00:00Z",
      level: "info",
      msg: "paisa server started on port 7500",
      port: 7500,
    },
    {
      time: "2022-02-07T10:00:01Z",
      level: "info",
      msg: "loaded ledger journal with 42 transactions",
      file: "main.ledger",
    },
    {
      time: "2022-02-07T10:00:02Z",
      level: "warning",
      msg: "commodity price history partially synced",
      source: "yahoo",
    },
    {
      time: "2022-02-07T10:00:03Z",
      level: "error",
      msg: "failed to fetch latest exchange rate",
      symbol: "USD/INR",
    },
    {
      time: "2022-02-07T10:00:04Z",
      level: "info",
      msg: "client session authenticated",
      user: "demo",
    },
  ],
};

const variants = [
  { name: "desktop-light", width: 1440, height: 900, theme: "light" },
  { name: "desktop-dark", width: 1440, height: 900, theme: "dark" },
  { name: "mobile-light", width: 390, height: 844, theme: "light" },
  { name: "mobile-dark", width: 390, height: 844, theme: "dark" },
] as const;

async function waitForStableLayout(page: Page) {
  await page.waitForFunction(
    `() => {
      const height = document.documentElement.scrollHeight;
      const previous = globalThis.__visualLayout;
      globalThis.__visualLayout = {
        height,
        stableChecks: previous?.height === height ? previous.stableChecks + 1 : 0,
      };
      return globalThis.__visualLayout.stableChecks >= 2;
    }`,
    null,
    { polling: 100 },
  );
}

for (const route of pages) {
  for (const variant of variants) {
    test(`@visual ${route.name} ${variant.name}`, async ({ page }) => {
      await page.setViewportSize({
        width: variant.width,
        height: variant.height,
      });
      await page.emulateMedia({
        colorScheme: variant.theme,
        reducedMotion: "reduce",
      });
      await page.addInitScript((theme) => {
        localStorage.setItem("theme-preference", theme);
      }, variant.theme);

      if (route.name === "logs") {
        await page.route("**/api/logs", (r) =>
          r.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(mockLogs),
          }));
      }

      await page.goto(route.path);
      await page.waitForLoadState("networkidle");
      const ready = "ready" in route
        ? page.locator(route.ready)
        : "readyText" in route
        ? page.getByText(route.readyText, { exact: true })
        : page.locator("body");
      await expect(ready.first()).toBeVisible();
      await page.evaluate("document.fonts.ready");
      await waitForStableLayout(page);
      await expect(page).toHaveScreenshot(
        `${route.name}-${variant.name}.png`,
        { fullPage: true },
      );
    });
  }
}
