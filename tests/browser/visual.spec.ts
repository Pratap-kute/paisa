import { expect, test } from "@playwright/test";

const pages = [
  { name: "dashboard", path: "/", readyText: "Net worth" },
  { name: "assets-allocation", path: "/assets/allocation" },
  { name: "assets-analysis", path: "/assets/analysis" },
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
    readyText: "Rent",
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
  { name: "logs", path: "/more/logs" },
  { name: "sheets", path: "/more/sheets" },
  { name: "sheet-detail", path: "/more/sheets/overview.paisa" },
  { name: "tax-capital-gains", path: "/more/tax/capital_gains" },
  { name: "tax-harvest", path: "/more/tax/harvest" },
  { name: "tax-schedule-al", path: "/more/tax/schedule_al" },
  { name: "login", path: "/login" },
] as const;

const variants = [
  { name: "desktop-light", width: 1440, height: 900, theme: "light" },
  { name: "desktop-dark", width: 1440, height: 900, theme: "dark" },
  { name: "mobile-light", width: 390, height: 844, theme: "light" },
  { name: "mobile-dark", width: 390, height: 844, theme: "dark" },
] as const;

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

      await page.goto(route.path);
      await page.waitForLoadState("networkidle");
      const ready = "ready" in route
        ? page.locator(route.ready)
        : "readyText" in route
        ? page.getByText(route.readyText, { exact: true })
        : page.locator("body");
      await expect(ready.first()).toBeVisible();
      await page.evaluate("document.fonts.ready");
      await expect(page).toHaveScreenshot(
        `${route.name}-${variant.name}.png`,
        { fullPage: true },
      );
    });
  }
}
