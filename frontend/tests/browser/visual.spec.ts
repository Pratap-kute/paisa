import { expect, type Page, test } from "@playwright/test";
import {
  chartSnapshotVariants,
  chartSnapshots,
  visualRoutes,
} from "./routes.ts";

test.describe.configure({ mode: "serial" });

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
  await page.evaluate("globalThis.scrollTo(0, 0)");
  await page.waitForFunction(
    `() => {
      const height = document.documentElement.scrollHeight;
      const previous = globalThis.__visualLayout;
      globalThis.__visualLayout = {
        height,
        stableChecks: previous?.height === height ? previous.stableChecks + 1 : 0,
      };
      return globalThis.__visualLayout.stableChecks >= 4;
    }`,
    null,
    { polling: 100 },
  );
  await page.waitForTimeout(100);
}

async function applyVariant(
  page: Page,
  variant: { width: number; height: number; theme: string },
) {
  await page.setViewportSize({
    width: variant.width,
    height: variant.height,
  });
  await page.emulateMedia({
    colorScheme: variant.theme as "light" | "dark",
    reducedMotion: "reduce",
  });
  await page.addInitScript((theme) => {
    localStorage.setItem("theme-preference", theme);
  }, variant.theme);
}

function routeReady(page: Page, route: (typeof visualRoutes)[number]) {
  if (route.ready) return page.locator(route.ready);
  if (route.readyText) {
    return page.getByText(route.readyText, { exact: true });
  }
  return page.locator("body");
}

for (const route of visualRoutes) {
  for (const variant of variants) {
    test(`@visual ${route.name} ${variant.name}`, async ({ page }) => {
      await applyVariant(page, variant);

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
      await expect(routeReady(page, route).first()).toBeVisible();
      if (route.name === "dashboard") {
        await expect(page.locator("#d3-current-cash-flow")).toBeVisible();
        await expect(page.locator("#d3-current-month-breakdown")).toBeVisible();
      }
      if (route.name === "savings-goal" || route.name === "retirement-goal") {
        await expect(page.locator(".paisa-goal-detail-main svg").nth(0).locator("g").first())
          .toBeVisible({ timeout: 15_000 });
        await expect(page.locator(".paisa-goal-detail-main svg").nth(1).locator("g").first())
          .toBeVisible({ timeout: 15_000 });
        await expect(page.locator(".paisa-goal-detail-side .paisa-posting-row").first())
          .toBeVisible();
      }
      await page.evaluate("document.fonts.ready");
      await waitForStableLayout(page);
      await expect(page).toHaveScreenshot(
        `${route.name}-${variant.name}.png`,
        { fullPage: true },
      );
    });
  }
}

for (const chart of chartSnapshots) {
  for (const variant of chartSnapshotVariants) {
    test(`@visual chart ${chart.name} ${variant.name}`, async ({ page }) => {
      await applyVariant(page, variant);
      await page.goto(chart.path);
      await page.waitForLoadState("networkidle");
      if ("readyText" in chart && chart.readyText) {
        await expect(page.getByText(chart.readyText, { exact: true }))
          .toBeVisible();
      }
      const chartLocator = page.locator(chart.locator);
      await expect(chartLocator).toBeVisible();
      await page.evaluate("document.fonts.ready");
      await waitForStableLayout(page);
      await expect(chartLocator).toHaveScreenshot(
        `chart-${chart.name}-${variant.name}.png`,
      );
    });
  }
}
