/** Run manually against scripts/test_server.ts; never use a hosted demo. */
import { Buffer } from "node:buffer";
import { chromium } from "@playwright/test";
import { fromFileUrl } from "@std/path";

const baseURL = `http://127.0.0.1:${
  Deno.env.get("PAISA_E2E_FRONTEND_PORT") ?? 5173
}`;
const output = fromFileUrl(
  new URL("../../docs/images/showcase/", import.meta.url),
);
await Deno.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    timezoneId: "UTC",
    locale: "en-IN",
    colorScheme: "light",
  });
  await context.addInitScript(() => {
    localStorage.setItem("theme-preference", "light");
    localStorage.setItem("obscure", "false");
  });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date("2022-02-07T12:00:00Z"));
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const screens = [
    [
      "dashboard",
      "/",
      "[data-testid='dashboard-cash-flow-echart'][data-chart-ready='true']",
    ],
    ["expenses-budget", "/expense/budget", "text=All Budgets"],
    [
      "investments",
      "/assets/analysis",
      "[data-testid='portfolio-security-type-echart'][data-chart-ready='true']",
    ],
    ["import", "/ledger/import", "input[type=file]"],
    ["account-suggestions", "/ledger/import", "input[type=file]"],
    ["ledger-editor", "/ledger/editor/main.ledger", ".cm-content"],
    ["goals-recurring", "/more/goals", "text=Retirement"],
    ["financial-insights", "/insights?period=2022-02", "text=Financial Health"],
    [
      "investment-performance",
      "/assets/gain",
      "[data-testid='investment-performance-timeline'][data-chart-ready='true']",
    ],
    [
      "scenario-planning",
      "/more/scenarios",
      "[data-testid='scenario-projection'][data-chart-ready='true']",
    ],
    ["doctor", "/more/doctor", "[data-testid='diagnosis-attention-section']"],
    [
      "recurring",
      "/cash_flow/recurring",
      "[data-testid='recurring-intelligence-row']",
    ],
    [
      "liabilities",
      "/liabilities/interest",
      "[data-testid='interest-overview-echart'][data-chart-ready='true']",
    ],
    ["credit-cards", "/liabilities/credit_cards", "text=Amount Due"],
  ];
  const selectedNames = new Set(
    (Deno.env.get("PAISA_SHOWCASE_NAMES") ?? "")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean),
  );
  const selectedScreens = selectedNames.size === 0
    ? screens
    : screens.filter(([name]) => selectedNames.has(name));
  for (const [name, route, ready] of selectedScreens) {
    await page.goto(baseURL + route);
    await page.locator(ready).first().waitFor({
      state: name === "import" ? "attached" : "visible",
    });
    if (name === "import" || name === "account-suggestions") {
      // Entirely invented statement: no bank identifiers or personal records.
      const csv =
        "Date,Activity,Source/Destination,Wallet Txn ID,Comment,Debit,Credit,Transaction Breakup,Status\n" +
        "1/2/2022 12:00,Demo groceries,Main Wallet,DEMO001,Synthetic merchant rule,850,,,SUCCESS\n" +
        "2/2/2022 12:00,Shopping,Main Wallet,DEMO002,Synthetic historical match,1200,,,SUCCESS\n" +
        "3/2/2022 12:00,Brand New Merchant,Main Wallet,DEMO003,Synthetic unknown,240,,,SUCCESS\n" +
        "4/2/2022 12:00,Transfer to savings,Main Wallet,DEMO004,Synthetic transfer,2500,,,SUCCESS\n";
      await page.locator("input[type=file]").setInputFiles({
        name: "synthetic-statement.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(csv),
      });
      await page.locator(".svelte-select").first().click();
      await page.getByText("Paytm", { exact: true }).click();
      await page.locator(".preview-editor .cm-content").filter({
        hasText: "2022",
      }).waitFor();
      await page.locator("[data-testid='prediction-review-bar']").waitFor();
      if (name === "account-suggestions") {
        await page.getByTitle("Brand New Merchant").click();
        await page.locator("[data-testid='prediction-detail']").waitFor();
      }
    }
    if (name === "scenario-planning") {
      await page.locator("#monthlyExpenses").fill("50000");
      await page.locator("text=Baseline:").first().waitFor();
      await page.waitForTimeout(500);
    }
    if (name === "ledger-editor") {
      await page.locator(".cm-content").first().press("Control+Home");
    }
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => {
      (document.activeElement as HTMLElement)?.blur();
      scrollTo(0, 0);
    });
    await page.waitForTimeout(1500);
    if (errors.length) throw new Error(errors.join("\n"));
    await page.screenshot({
      path: `${output}/${name}.png`,
      animations: "disabled",
    });
    console.log(`Captured ${name}: ${route}`);
  }
} finally {
  await browser.close();
}
