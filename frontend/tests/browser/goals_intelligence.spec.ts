import { expect, test } from "@playwright/test";

const history = ["2021-11", "2021-12", "2022-01"].map((month) => ({
  month,
  amount: 48000,
}));
const savings = {
  type: "savings",
  id: "savings-test",
  name: "Home down payment and family emergency savings with a long name",
  icon: "",
  current: 240000,
  target: 600000,
  targetDate: "2022-08-31",
  rate: 0,
  priority: 10,
  contributionHistory: history,
};
for (const width of [390, 768, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`goal intelligence is readable at ${width}px ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (theme) => localStorage.setItem("theme-preference", theme),
        theme,
      );
      await page.route(
        "**/api/goals",
        (route) =>
          route.fulfill({
            json: {
              goals: [savings, {
                ...savings,
                type: "retirement",
                id: "retirement-test",
                name: "Retirement",
                swr: 4,
                yearlyExpense: 24000,
                yearlyExpenseSource: "configured",
              }],
            },
          }),
      );
      await page.goto("/more/goals");
      await expect(page.getByText("Needs Attention", { exact: true }))
        .toBeVisible();
      await expect(page.getByText("Behind plan", { exact: true }).first())
        .toBeVisible();
      await expect(page.getByText("Tracking", { exact: true })).toBeVisible();
      await expect(page.getByText("All Goals", { exact: true })).toBeVisible();
      expect(
        await page.evaluate(() =>
          document.documentElement.scrollWidth <= innerWidth
        ),
      ).toBe(true);
      const link = page.getByRole("link", { name: savings.name }).last();
      await expect(link).toHaveAttribute(
        "href",
        `/more/goals/savings/${encodeURIComponent(savings.name)}`,
      );
      await expect(page.locator(".fa-grip-vertical")).toHaveCount(2);
    });
  }
}

test("goals overview handles no configured goals", async ({ page }) => {
  await page.route(
    "**/api/goals",
    (route) => route.fulfill({ json: { goals: [] } }),
  );
  await page.goto("/more/goals");
  await expect(page.getByText(/haven't configured any goals/)).toBeVisible();
  await expect(page.getByText("Needs Attention", { exact: true })).toHaveCount(
    0,
  );
});

test("details retain charts alongside plan, actual and outlook", async ({ page }) => {
  await page.goto("/more/goals/savings/House");
  for (
    const heading of [
      "Plan",
      "Actual",
      "Outlook",
      "Historical XIRR",
      "Current Balance",
      "Monthly Investment",
    ]
  ) {
    await expect(page.getByText(heading, { exact: true })).toBeVisible();
  }
  await expect(
    page.locator(
      "[data-testid='savings-goal-progress-echart'][data-chart-ready='true']",
    ),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      document.documentElement.scrollWidth <= innerWidth
    ),
  ).toBe(true);
});

test("drag handle keeps priority changes under user control", async ({ page }) => {
  let saved:
    | { goals?: { savings?: { name: string; priority: number }[] } }
    | undefined;
  await page.route("**/api/config", async (route) => {
    if (route.request().method() === "POST") {
      saved = route.request().postDataJSON();
      await route.fulfill({ json: { success: true } });
    } else {
      await route.continue();
    }
  });
  await page.goto("/more/goals");
  const handles = page.locator(".fa-grip-vertical");
  await expect(handles).toHaveCount(2);
  expect(saved).toBeUndefined();
  const first = await handles.first().boundingBox();
  const second = await handles.last().boundingBox();
  if (!first || !second) throw new Error("Goal drag handles are missing");
  await page.mouse.move(
    second.x + second.width / 2,
    second.y + second.height / 2,
  );
  await page.mouse.down();
  await page.waitForTimeout(100);
  await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2, {
    steps: 20,
  });
  await page.waitForTimeout(400);
  await page.mouse.up();
  await expect.poll(() =>
    saved?.goals?.savings?.find((goal) => goal.name === "House")?.priority
  ).toBe(2);
});

test(
  "dated Savings chart draws the required path label",
  async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      const original = CanvasRenderingContext2D.prototype.fillText;
      const labels: string[] = [];
      Object.assign(globalThis, { goalChartLabels: labels });
      CanvasRenderingContext2D.prototype.fillText = function (
        ...args: Parameters<typeof original>
      ) {
        labels.push(args[0]);
        return original.apply(this, args);
      };
    });
    await page.goto("/more/goals/savings/House");
    const chart = page.locator(
      "[data-testid='savings-goal-progress-echart'][data-chart-ready='true']",
    );
    await expect(chart).toBeVisible();
    await expect.poll(() =>
      page.evaluate(() =>
        (globalThis as unknown as { goalChartLabels: string[] }).goalChartLabels
          .includes("Required path")
      )
    ).toBe(true);
    await chart.screenshot({ path: testInfo.outputPath("required-path.png") });
  },
);
