import { expect, type Page, test } from "@playwright/test";

const routes = [
  { name: "dashboard", path: "/", readyText: "Net worth" },
  { name: "expense-monthly", path: "/expense/monthly" },
  { name: "transactions", path: "/ledger/transaction", readyText: "Transactions" },
  { name: "ledger-import", path: "/ledger/import" },
  { name: "config", path: "/more/config" },
  { name: "ledger-editor", path: "/ledger/editor" },
] as const;

async function applySmokeViewport(page: Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => {
    localStorage.setItem("theme-preference", "light");
  });
}

function readyLocator(page: Page, route: (typeof routes)[number]) {
  if ("readyText" in route && route.readyText) {
    return page.getByText(route.readyText, { exact: true });
  }
  return page.locator("body");
}

for (const route of routes) {
  test(`phase4 production smoke ${route.name}`, async ({ page }) => {
    await applySmokeViewport(page);
    await page.goto(route.path);
    await page.waitForLoadState("networkidle");
    await expect(readyLocator(page, route).first()).toBeVisible();
  });
}

test("/dev/ui is not available in preview production mode", async ({ page }) => {
  await page.goto("/dev/ui");
  await expect(page.getByRole("heading", { name: "Paisa UI Lab" })).toHaveCount(
    0,
  );
  await expect(page.locator("body")).toContainText("Page not found");
});
