/// <reference lib="dom" />

import { expect, type Page, test } from "@playwright/test";
import { overflowRoutes } from "./routes.ts";

const knownHorizontalScrollers = [
  ".paisa-overflow-x-auto",
  ".tabulator",
  ".paisa-sheet-source",
  ".paisa-import-pane",
];

async function assertNoPageOverflow(page: Page) {
  const metrics = await page.evaluate((selectors) => {
    const root = document.documentElement;
    const known = selectors.flatMap((selector) =>
      Array.from(document.querySelectorAll(selector))
    );
    return {
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      knownMax: Math.max(0, ...known.map((el: Element) => el.scrollWidth)),
    };
  }, knownHorizontalScrollers);

  const overflow = metrics.scrollWidth - metrics.clientWidth;
  expect(
    overflow,
    `document overflow ${overflow}px at ${metrics.scrollWidth} vs ${metrics.clientWidth}`,
  ).toBeLessThanOrEqual(1);
}

async function nestedMenuPosition(page: Page) {
  const burger = page.locator(".navbar-burger");
  if (await burger.isVisible()) {
    await burger.click();
  }
  const parent = page.locator(".navbar-item.has-dropdown").filter({
    hasText: "Cash Flow",
  }).first();
  await parent.locator("button.navbar-link").click();
  const nested = parent.locator(".nested.has-dropdown").first();
  if (await nested.count() === 0) {
    return { position: "none" };
  }
  await nested.locator("button.nested-menu-trigger").click();
  return nested.locator(".dropdown-menu").evaluate((el) => ({
    position: getComputedStyle(el).position,
    left: getComputedStyle(el).left,
  }));
}

test.describe("layout invariants", () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.post("/api/sync", { data: { journal: true } });
    expect(response.ok()).toBeTruthy();
  });

  for (const width of [768, 769, 1023, 1024]) {
    test(`dashboard does not overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await expect(page.getByRole("navigation", { name: "main navigation" }))
        .toBeVisible();
      await assertNoPageOverflow(page);
    });
  }

  test("import workspace does not overflow at 1100px", async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await page.goto("/ledger/import");
    await expect(page.getByRole("navigation", { name: "main navigation" }))
      .toBeVisible();
    await assertNoPageOverflow(page);
  });

  for (const width of [390, 768, 1024, 1440]) {
    const routes = width <= 768
      ? overflowRoutes.filter((route) => route.name !== "transactions")
      : overflowRoutes;
    for (const route of routes) {
      test(`${route.name} does not overflow at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route.path);
        await expect(page.getByRole("navigation", { name: "main navigation" }))
          .toBeVisible();
        await assertNoPageOverflow(page);
      });
    }
  }

  for (const width of [800, 1023]) {
    test(`navbar nested menus stay in-flow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await expect(page.getByRole("navigation", { name: "main navigation" }))
        .toBeVisible();
      const style = await nestedMenuPosition(page);
      if (style.position !== "none") {
        expect(style.position).toBe("static");
      }
    });
  }

  test("surviving dashboard section spans the row when Budget is absent", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.route("**/api/dashboard", async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      body.budget = { budgetsByMonth: {} };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });
    await page.goto("/");
    const row = page.locator(".paisa-dashboard-operations");
    await expect(row).toBeVisible();
    await expect(row.locator(":scope > *")).toHaveCount(1);
  });

  test("surviving dashboard section spans the row when Goals are absent", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.route("**/api/dashboard", async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      body.goalSummaries = [];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });
    await page.goto("/");
    const row = page.locator(".paisa-dashboard-longterm");
    await expect(row).toBeVisible();
    await expect(row.locator(":scope > *")).toHaveCount(1);
  });

  test("empty net worth shows a single empty owner", async ({ page }) => {
    await page.route("**/api/networth", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ networthTimeline: [], xirr: 0 }),
      }));
    await page.goto("/assets/networth");
    await expect(page.locator(".paisa-chart-frame-empty")).toHaveCount(1);
    await expect(page.locator(".paisa-chart-frame-empty")).toBeVisible();
    await expect(page.locator(".legend-box")).toHaveCount(0);
  });
});
