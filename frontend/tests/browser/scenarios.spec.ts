import { expect, test } from "@playwright/test";

const assumption = (value: number | null, sampleCount = 6) => ({
  value,
  sampleCount,
  source: value == null ? "insufficient_data" : "historical_median",
});
const snapshot = {
  asOfDate: "2026-09-07",
  startDate: "2026-10-01",
  currency: "INR",
  horizonMonths: 60,
  currentCash: 100000,
  currentInvestmentValue: 200000,
  currentNetWorth: 150000,
  staticNetWorthComponent: -150000,
  monthlyIncome: assumption(150000),
  monthlyExpenses: assumption(80000),
  monthlyInvestmentTransfer: assumption(40000),
  quality: { status: "complete", reasons: [] },
};
const projection = {
  openingCash: 100000,
  openingInvestment: 200000,
  openingNetWorth: 150000,
  endingCash: 50000,
  endingInvestment: 1000000,
  endingNetWorth: 900000,
  minimumCashBalance: 50000,
  openingCashNegative: false,
  firstNegativeCashMonth: null,
  points: [{
    month: "2026-10",
    cash: 80000,
    investment: 300000,
    netWorth: 230000,
  }, { month: "2026-11", cash: 50000, investment: 1000000, netWorth: 900000 }],
};
const result = {
  available: true,
  snapshot,
  quality: snapshot.quality,
  baseline: projection,
  scenario: {
    ...projection,
    endingCash: -25000,
    endingInvestment: 1075000,
    minimumCashBalance: -25000,
    firstNegativeCashMonth: "2026-11",
    points: [projection.points[0], {
      month: "2026-11",
      cash: -25000,
      investment: 1075000,
      netWorth: 900000,
    }],
  },
  impact: {
    endingCashDelta: -75000,
    endingInvestmentDelta: 75000,
    endingNetWorthDelta: 0,
    investmentGrowthDelta: 0,
    minimumCashDelta: -75000,
  },
};

test.beforeEach(async ({ page }) => {
  await page.route(
    "**/api/scenario/baseline*",
    (route) => route.fulfill({ json: snapshot }),
  );
  await page.route(
    "**/api/scenario/evaluate",
    (route) => route.fulfill({ json: result }),
  );
});

test("scenario controls, events, reset and cash risk", async ({ page }) => {
  await page.goto("/more/scenarios");
  await expect(page.getByRole("heading", { name: "What-if Scenarios" }))
    .toBeVisible();
  await expect(
    page.locator(
      '[data-testid="scenario-projection"][data-chart-ready="true"]',
    ),
  ).toBeVisible();
  await expect(
    page.getByText("Cash turns negative in 2026-11.", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Monthly Income", { exact: true }).fill("170000");
  await expect(page.getByText("1,50,000 → 1,70,000", { exact: false }))
    .toBeVisible();
  const evaluated = page.waitForRequest((r) =>
    r.url().endsWith("/scenario/evaluate") &&
    r.postDataJSON().horizonMonths === 12
  );
  await page.getByRole("button", { name: "1Y", exact: true }).click();
  await evaluated;
  await page.getByLabel("Expected Annual Return (%)").fill("8");
  await page.getByLabel("Use separate scenario return rate").check();
  await page.getByLabel("Scenario Annual Return (%)", { exact: true }).fill(
    "-10",
  );
  await page.getByRole("button", { name: "+ Add Event" }).click();
  await page.getByLabel("Amount", { exact: true }).fill("500000");
  await page.getByLabel("Description").fill(
    "A long bonus description for an illustrative one-time cash event",
  );
  const request = page.waitForRequest((r) =>
    r.url().endsWith("/scenario/evaluate") &&
    r.postDataJSON().oneTimeEvents?.[0]?.amount === 500000
  );
  await request;
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.getByLabel("Monthly Income", { exact: true })).toHaveValue(
    "150000",
  );
  await expect(page.getByLabel("Expected Annual Return (%)"))
    .toHaveValue("0");
  await expect(page.getByLabel("Use separate scenario return rate")).not
    .toBeChecked();
  await expect(page.getByRole("button", { name: "Reset", exact: true }))
    .toBeDisabled();
});

test("missing baseline is unavailable and manual values are retained", async ({ page }) => {
  await page.route(
    "**/api/scenario/baseline*",
    (route) =>
      route.fulfill({
        json: {
          ...snapshot,
          monthlyIncome: assumption(null, 0),
          quality: {
            status: "unavailable",
            reasons: [{ code: "insufficient_income_history", field: "income" }],
          },
        },
      }),
  );
  await page.route(
    "**/api/scenario/evaluate",
    (route) =>
      route.fulfill({
        json: {
          ...result,
          available: false,
          baseline: null,
          scenario: null,
          impact: null,
        },
      }),
  );
  await page.goto("/more/scenarios");
  await expect(page.getByText("Comparison unavailable.", { exact: false }))
    .toBeVisible();
  await page.getByLabel("Monthly Income", { exact: true }).fill("150000");
  await expect(page.getByText("Comparison unavailable.", { exact: false }))
    .toBeVisible();
  await expect(page.getByLabel("Monthly Income", { exact: true })).toHaveValue(
    "150000",
  );
  await expect(page.locator('[data-testid="scenario-projection"]')).toHaveCount(
    0,
  );
});

test("validation error and retry", async ({ page }) => {
  let status = 400;
  await page.route(
    "**/api/scenario/evaluate",
    (route) =>
      status === 400
        ? route.fulfill({
          status: 400,
          json: { code: "scenario_insufficient_investment_balance" },
        })
        : status === 500
        ? route.fulfill({
          status: 500,
          json: { code: "scenario_calculation_failed" },
        })
        : route.fulfill({ json: result }),
  );
  await page.goto("/more/scenarios");
  await expect(page.getByRole("alert")).toContainText("withdrawal exceeds");
  await expect(page.getByRole("button", { name: "Retry", exact: true }))
    .toHaveCount(0);

  status = 500;
  await page.getByLabel("Monthly Income", { exact: true }).fill("160000");
  await expect(page.getByRole("alert")).toContainText("Unable to calculate");
  await expect(page.getByRole("button", { name: "Retry", exact: true }))
    .toBeVisible();

  status = 200;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.locator('[data-testid="scenario-projection"]'))
    .toBeVisible();
});

test("stale evaluation cannot replace newer inputs", async ({ page }) => {
  await page.route("**/api/scenario/evaluate", async (route) => {
    const income = route.request().postDataJSON().monthlyIncome;
    if (income === 160000) {
      await new Promise((resolve) => setTimeout(resolve, 900));
    }
    await route.fulfill({
      json: {
        ...result,
        available: income !== 160000,
        ...(income === 160000
          ? { baseline: null, scenario: null, impact: null }
          : {}),
      },
    });
  });
  await page.goto("/more/scenarios");
  await expect(page.locator('[data-testid="scenario-projection"]'))
    .toBeVisible();
  const old = page.waitForRequest((r) =>
    r.url().endsWith("/scenario/evaluate") &&
    r.postDataJSON().monthlyIncome === 160000
  );
  await page.getByLabel("Monthly Income", { exact: true }).fill("160000");
  await old;
  await page.getByLabel("Monthly Income", { exact: true }).fill("170000");
  await expect(page.locator('[data-testid="scenario-projection"]'))
    .toBeVisible();
  await page.waitForTimeout(1100);
  await expect(page.locator('[data-testid="scenario-projection"]'))
    .toBeVisible();
  await expect(page.getByText("Comparison unavailable.", { exact: false }))
    .toHaveCount(0);
});

for (const width of [390, 768, 1440, 1728]) {
  for (const theme of ["light", "dark"] as const) {
    test(`@visual scenarios ${width} ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(
        (theme) => localStorage.setItem("theme-preference", theme),
        theme,
      );
      await page.emulateMedia({ colorScheme: theme });
      await page.goto("/more/scenarios");
      await expect(
        page.locator(
          '[data-testid="scenario-projection"][data-chart-ready="true"]',
        ),
      ).toBeVisible();
      await page.getByRole("button", { name: "+ Add Event" }).click();
      await page.getByLabel("Amount", { exact: true }).fill("50000000");
      await page.getByLabel("Description").fill(
        "A long description of a future bonus or withdrawal to verify responsive controls",
      );
      await expect(
        page.locator(
          '[data-testid="scenario-projection"][data-chart-ready="true"]',
        ),
      ).toBeVisible();
      expect(
        await page.evaluate(() =>
          document.documentElement.scrollWidth <= innerWidth
        ),
      ).toBe(true);
      await page.evaluate(() => {
        (document.activeElement as HTMLElement)?.blur();
        globalThis.scrollTo(0, 0);
      });
      await expect(page).toHaveScreenshot(`scenarios-${width}-${theme}.png`, {
        fullPage: true,
      });
    });
  }
}

test("privacy masks scenario inputs, metrics and chart tooltips", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("obscure", "true"));
  await page.goto("/more/scenarios");
  await expect(
    page.locator(
      '[data-testid="scenario-projection"][data-chart-ready="true"]',
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Monthly Income", { exact: true })).toHaveValue(
    "••••",
  );
  await expect(page.getByLabel("Monthly Income", { exact: true }))
    .toBeDisabled();
  await page.getByRole("button", { name: "+ Add Event" }).click();
  await expect(page.getByLabel("Amount", { exact: true })).toHaveValue("••••");
  await expect(page.locator("body")).not.toContainText("1,50,000");
  await expect(page.locator("body")).not.toContainText("10,75,000");
  await expect(page.locator('[data-testid="scenario-projection"]'))
    .toBeVisible();
  await page.locator('[data-testid="scenario-projection"] canvas').first()
    .hover();
  await expect(page.locator("body")).not.toContainText("10,75,000");
});

test("baseline loading and retry do not fabricate zero values", async ({ page }) => {
  let fail = true;
  await page.route("**/api/scenario/baseline*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.fulfill(
      fail
        ? { status: 500, json: { code: "scenario_calculation_failed" } }
        : { json: snapshot },
    );
  });
  await page.goto("/more/scenarios");
  await expect(page.getByText("Loading baseline…", { exact: true }))
    .toBeVisible();
  await expect(page.getByRole("alert")).toContainText(
    "Unable to load baseline",
  );
  fail = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.locator(
      '[data-testid="scenario-projection"][data-chart-ready="true"]',
    ),
  ).toBeVisible();
});

test("large comparison values remain readable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(
    "**/api/scenario/evaluate",
    (route) =>
      route.fulfill({
        json: {
          ...result,
          baseline: { ...projection, endingNetWorth: 123456789000 },
          scenario: { ...projection, endingNetWorth: -123456789000 },
        },
      }),
  );
  await page.goto("/more/scenarios");
  await expect(
    page.locator(
      '[data-testid="scenario-projection"][data-chart-ready="true"]',
    ),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      document.documentElement.scrollWidth <= innerWidth
    ),
  ).toBe(true);
  for (const metric of await page.locator(".paisa4-metric-value").all()) {
    expect(await metric.evaluate((el) => el.scrollWidth <= el.clientWidth))
      .toBe(true);
  }
});
