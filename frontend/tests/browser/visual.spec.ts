import { expect, type Page, test } from "@playwright/test";
import {
  chartSnapshots,
  chartSnapshotVariants,
  visualRoutes,
} from "./routes.ts";

test.describe.configure({ mode: "parallel" });

const browserErrors = new WeakMap<Page, string[]>();

test.beforeEach(({ page }) => {
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
});

test.afterEach(({ page }) => {
  expect(browserErrors.get(page) ?? []).toEqual([]);
});

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
  { name: "tablet-light", width: 768, height: 900, theme: "light" },
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
}

async function expectStableChartSurfaces(page: Page) {
  const charts = page.locator("[data-chart-ready='true']");
  const count = await charts.count();
  if (count === 0) return;

  const first = await charts.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      const parent = element.parentElement?.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        parentWidth: parent?.width ?? 0,
      };
    })
  );
  await page.evaluate(() =>
    new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    )
  );
  const second = await charts.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      const parent = element.parentElement?.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        parentWidth: parent?.width ?? 0,
      };
    })
  );

  expect(second).toHaveLength(first.length);
  second.forEach((size, index) => {
    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);
    expect(Math.abs(size.width - first[index].width)).toBeLessThanOrEqual(1);
    expect(Math.abs(size.height - first[index].height)).toBeLessThanOrEqual(1);
    expect(size.width).toBeLessThanOrEqual(size.parentWidth + 1);
  });
}

async function expectDarkSelectTheme(page: Page) {
  const control = page.locator(".svelte-select").first();
  await expect(control).toBeVisible();
  const colors = await control.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      background: style.backgroundColor,
      foreground: style.color,
      inputBackground: style.getPropertyValue("--paisa-input-bg").trim(),
      inputForeground: style.getPropertyValue("--paisa-input-text").trim(),
    };
  });
  expect(colors.background).toBe("rgb(15, 23, 42)");
  expect(colors.foreground).toBe("rgb(248, 250, 252)");
  expect(colors.inputBackground).toBe("#0f172a");
  expect(colors.inputForeground).toBe("#f8fafc");
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
      if (route.name === "ledger-price") {
        await page.route("**/api/price", async (apiRoute) => {
          if (new URL(apiRoute.request().url()).pathname === "/api/price") {
            await apiRoute.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ prices: {} }),
            });
            return;
          }
          await apiRoute.continue();
        });
      }

      await page.goto(route.path);
      await page.waitForLoadState("networkidle");
      if (route.name === "cash-flow-yearly") {
        await page.getByRole("combobox").selectOption({ label: "2021 - 22" });
      }
      await expect(routeReady(page, route).first()).toBeVisible();
      if (route.name === "dashboard") {
        await expect(
          page.locator(
            "[data-testid='dashboard-cash-flow-echart'][data-chart-ready='true']",
          ),
        ).toBeVisible();
        await expect(
          page.locator(
            "[data-testid='dashboard-expense-breakdown-echart'][data-chart-ready='true']",
          ),
        ).toBeVisible();
        await expect(
          page.locator("[data-testid='dashboard-kpis'] .paisa4-metric-label"),
        ).toHaveText(["Net Worth", "Cash Balance", "Expenses", "Budget"]);
        await expect(page.getByText("Net Investment", { exact: true }))
          .toHaveCount(0);
        await expect(page.getByText("Gain / Loss", { exact: true }))
          .toHaveCount(0);
        await expect(page.getByText("XIRR", { exact: true })).toHaveCount(0);
        expect(
          await page.locator("[data-testid='dashboard-insight-preview']")
            .count(),
        ).toBeLessThanOrEqual(1);
        expect(
          await page.locator("[data-testid='dashboard-budget-item']").count(),
        ).toBeLessThanOrEqual(3);
        expect(
          await page.locator("[data-testid='dashboard-cash-account']").count(),
        ).toBeLessThanOrEqual(3);
        expect(
          await page.locator("[data-testid='dashboard-recent-item']").count(),
        ).toBeLessThanOrEqual(5);
        expect(
          await page.locator("[data-testid='dashboard-goal-item']").count(),
        ).toBeLessThanOrEqual(3);
        expect(
          await page.locator("[data-testid='dashboard-recurring-item']")
            .count(),
        ).toBeLessThanOrEqual(5);
      }
      if (route.name === "savings-goal" || route.name === "retirement-goal") {
        const prefix = route.name === "savings-goal" ? "savings" : "retirement";
        await expect(
          page.locator(
            `[data-testid='${prefix}-goal-progress-echart'][data-chart-ready='true']`,
          ),
        )
          .toBeVisible({ timeout: 15_000 });
        await expect(
          page.locator(
            `[data-testid='${prefix}-goal-investment-echart'][data-chart-ready='true']`,
          ),
        )
          .toBeVisible({ timeout: 15_000 });
        await expect(
          page.locator(".paisa-goal-detail-side .paisa-posting-row").first(),
        )
          .toBeVisible();
      }
      await page.evaluate("document.fonts.ready");
      await waitForStableLayout(page);
      await expectStableChartSurfaces(page);
      if (variant.theme === "dark" && route.name === "ledger-import") {
        await expectDarkSelectTheme(page);
        await page.locator(".svelte-select").click();
        await expect(page.locator(".svelte-select-list")).toBeVisible();
        const listBackground = await page.locator(".svelte-select-list")
          .evaluate((element) => getComputedStyle(element).backgroundColor);
        expect(listBackground).toBe("rgb(30, 41, 59)");
        await page.keyboard.press("Escape");
        await expect(page.locator(".svelte-select-list")).toBeHidden();
      }
      if (variant.theme === "dark" && route.name === "config") {
        await page.getByRole("tab", { name: "Allocation Targets" }).click();
        await page.getByRole("button", { name: "Add" }).click();
        await expectDarkSelectTheme(page);
      }
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
      if ("selectOption" in chart) {
        await page.getByRole("combobox").selectOption({
          label: chart.selectOption,
        });
      }
      if ("readyText" in chart && typeof chart.readyText === "string") {
        await expect(page.getByText(chart.readyText, { exact: true }))
          .toBeVisible();
      }
      const chartLocator = page.locator(
        `${chart.locator}[data-chart-ready='true']`,
      );
      await expect(chartLocator).toBeVisible();
      await page.evaluate("document.fonts.ready");
      await waitForStableLayout(page);
      await expectStableChartSurfaces(page);
      await expect(chartLocator).toHaveScreenshot(
        `chart-${chart.name}-${variant.name}.png`,
        { maxDiffPixelRatio: chart.name === "networth" ? 0.01 : 0.005 },
      );
    });
  }
}
