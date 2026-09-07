import { expect, test } from "@playwright/test";

const result = {
  startDate: "2021-04-01",
  endDate: "2022-02-07",
  openingValue: 1000000,
  closingValue: 1400000,
  contributions: 350000,
  withdrawals: 0,
  netContribution: 350000,
  investmentReturn: 50000,
  portfolioChange: 400000,
  periodReturn: 0.064,
  sinceInceptionXirr: 0.1234,
  returnUnavailableReason: null,
  quality: { status: "complete", reasons: [] },
  openingQuotes: [],
  closingQuotes: [],
  drivers: [
    {
      account: "Assets:Equity",
      returnAmount: 70000,
      periodReturn: 0.07,
      closingValue: 1000000,
    },
    {
      account:
        "Assets:Crypto:An unusually long account name for responsive layout validation",
      returnAmount: -20000,
      periodReturn: -0.1,
      closingValue: 400000,
    },
  ],
  timeline: [
    {
      date: "2021-03-31",
      value: 1000000,
      contributionBaseline: 1000000,
      quality: { status: "complete" },
    },
    {
      date: "2022-02-07",
      value: 1400000,
      contributionBaseline: 1350000,
      quality: { status: "complete" },
    },
  ],
};

for (const width of [390, 768, 1440, 1728]) {
  for (const theme of ["light", "dark"]) {
    test(`investment performance at ${width}px ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (theme) => localStorage.setItem("theme-preference", theme),
        theme,
      );
      await page.route(
        "**/api/investment/performance**",
        (route) => route.fulfill({ json: result }),
      );
      await page.goto("/assets/gain");
      await expect(
        page.getByRole("heading", {
          name: "Investment Performance",
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.getByText("Period Return", { exact: true }))
        .toBeVisible();
      await expect(page.getByText("Performance Decomposition", { exact: true }))
        .toBeVisible();
      await expect(
        page.locator(
          "[data-testid='investment-performance-timeline'][data-chart-ready='true']",
        ),
      ).toBeVisible();
      expect(
        await page.evaluate(() =>
          document.documentElement.scrollWidth <= innerWidth
        ),
      ).toBe(true);
      await page.getByLabel("Period", { exact: true }).selectOption(
        "previous_fy",
      );
      await expect(page).toHaveURL(/preset=previous_fy/);
      const driver = page.getByRole("link", {
        name: "Assets:Equity",
        exact: true,
      });
      await expect(driver).toHaveAttribute(
        "href",
        "/assets/gain/Assets%3AEquity?preset=previous_fy",
      );
      await driver.click();
      await expect(page.getByLabel("Period", { exact: true })).toHaveValue(
        "previous_fy",
      );
      await page.reload();
      await expect(page.getByLabel("Period", { exact: true })).toHaveValue(
        "previous_fy",
      );
    });
  }
}

test("performance error is retryable and missing return is not zero", async ({ page }) => {
  let fail = true;
  await page.route(
    "**/api/investment/performance**",
    (route) =>
      fail
        ? route.fulfill({
          status: 500,
          json: { code: "investment_performance_failed" },
        })
        : route.fulfill({
          json: {
            ...result,
            periodReturn: null,
            returnUnavailableReason: "insufficient_weighted_capital",
          },
        }),
  );
  await page.goto("/assets/gain");
  await expect(page.getByRole("alert")).toContainText("Unable to load");
  fail = false;
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("status")).toContainText("capital base");
});

test("performance amount privacy", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("obscure", "true"));
  await page.route(
    "**/api/investment/performance**",
    (route) => route.fulfill({ json: result }),
  );
  await page.goto("/assets/gain");
  await expect(page.getByText("Performance Decomposition", { exact: true }))
    .toBeVisible();
  await expect(page.locator("body")).not.toContainText("14,00,000");
  await expect(page.locator("body")).not.toContainText(
    "50,000 investment return",
  );
});

test("lifetime chart navigation preserves preset and custom date query params", async ({ page }) => {
  await page.route(
    "**/api/investment/performance**",
    (route) => route.fulfill({ json: result }),
  );

  // 1. Preset query param preservation
  await page.goto("/assets/gain?preset=previous_fy");
  await page.locator("summary", { hasText: "Lifetime investment context" })
    .click();
  const chartPreset = page.locator(
    "[data-testid='asset-gain-overview-echart'][data-chart-ready='true']",
  );
  await expect(chartPreset).toBeVisible();
  await page.evaluate(() => {
    const el = document.querySelector(
      "[data-testid='asset-gain-overview-echart']",
    ) as
      | (Element & {
        __paisa_chart__?: {
          trigger: (event: string, payload: unknown) => void;
        };
      })
      | null;
    el?.__paisa_chart__?.trigger("click", {
      targetType: "series.bar",
      dataIndex: 0,
    });
  });
  await expect(page).toHaveURL(/preset=previous_fy/);
  await expect(page).toHaveURL(/\/assets\/gain\/Assets%3A/);

  // 2. Custom date query params preservation
  await page.goto("/assets/gain?from=2026-04-01&to=2026-09-06");
  await page.locator("summary", { hasText: "Lifetime investment context" })
    .click();
  const chartCustom = page.locator(
    "[data-testid='asset-gain-overview-echart'][data-chart-ready='true']",
  );
  await expect(chartCustom).toBeVisible();
  await page.evaluate(() => {
    const el = document.querySelector(
      "[data-testid='asset-gain-overview-echart']",
    ) as
      | (Element & {
        __paisa_chart__?: {
          trigger: (event: string, payload: unknown) => void;
        };
      })
      | null;
    el?.__paisa_chart__?.trigger("click", {
      targetType: "series.bar",
      dataIndex: 0,
    });
  });
  await expect(page).toHaveURL(/from=2026-04-01/);
  await expect(page).toHaveURL(/to=2026-09-06/);
  await expect(page).toHaveURL(/\/assets\/gain\/Assets%3A/);
});
