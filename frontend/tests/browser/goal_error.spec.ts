import { expect, test } from "@playwright/test";

const goalRoutes = [
  { name: "savings-goal", path: "/more/goals/savings/House" },
  { name: "retirement-goal", path: "/more/goals/retirement/Retirement" },
] as const;

for (const route of goalRoutes) {
  test(`@goal-error ${route.name} has no page errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto(route.path);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    expect(errors, `${route.name} page errors`).toEqual([]);
  });
}
