import { render } from "@testing-library/svelte";
import { expect, test } from "vitest";
import dayjs from "dayjs";
import BudgetCard from "./BudgetCard.svelte";
import type { AccountBudget } from "$lib/domain/cash_flow";

Object.defineProperty(globalThis, "USER_CONFIG", {
  configurable: true,
  value: {
    accounts: [],
    default_currency: "INR",
    readonly: false,
    display_precision: 2,
    locale: "en-IN",
    journal_path: "",
    db_path: "",
    financial_year_starting_month: 4,
    amount_alignment_column: 0,
    week_starting_day: 1,
    goals: {},
  },
});

function createBudget(overrides: Partial<AccountBudget>): AccountBudget {
  return {
    account: "Expenses:Food:Groceries",
    date: dayjs("2026-09-01"),
    actual: 5000,
    forecast: 10000,
    budgeted: 10000,
    available: 5000,
    rollover: 0,
    expenses: [],
    ...overrides,
  };
}

test("renders on-track budget card with projection badge", () => {
  const accountBudget = createBudget({
    projection: {
      status: "on-track",
      effectiveBudget: 10000,
      observedSpend: 5000,
      projectedSpend: 8500,
      projectedRemaining: 1500,
      source: "historical-timing",
      historicalSampleCount: 5,
      elapsedDays: 15,
      daysInMonth: 30,
    },
  });

  const { container } = render(BudgetCard, { accountBudget });
  expect(container.textContent).toContain("Groceries");
  expect(container.textContent).toContain("Budget");
  expect(container.textContent).toContain("Spent");
  expect(container.textContent).toContain("Available");
  expect(container.textContent).toContain("Projected");
  expect(container.textContent).toContain("✓ On track");
});

test("renders likely-over budget card with warning styling and projected overrun", () => {
  const accountBudget = createBudget({
    projection: {
      status: "likely-over",
      effectiveBudget: 10000,
      observedSpend: 8000,
      projectedSpend: 13500,
      projectedOverrun: 3500,
      source: "calendar-pace",
      historicalSampleCount: 0,
      elapsedDays: 10,
      daysInMonth: 30,
    },
  });

  const { container } = render(BudgetCard, { accountBudget });
  expect(container.textContent).toContain("Likely over");
  expect(container.textContent).toContain("3,500");

  const badge = container.querySelector(".bg-warning-subtle");
  expect(badge).toBeInTheDocument();
  expect(badge?.textContent).toContain("Likely over");
});

test("renders at-risk budget card", () => {
  const accountBudget = createBudget({
    projection: {
      status: "at-risk",
      effectiveBudget: 10000,
      observedSpend: 9600,
      projectedSpend: 9800,
      projectedRemaining: 200,
      source: "historical-timing",
      historicalSampleCount: 4,
      elapsedDays: 20,
      daysInMonth: 30,
    },
  });

  const { container } = render(BudgetCard, { accountBudget });
  expect(container.textContent).toContain("At risk");
});

test("renders overspent card when observed spend exceeds effective budget", () => {
  const accountBudget = createBudget({
    forecast: 5000,
    actual: 6500,
    projection: {
      status: "overspent",
      effectiveBudget: 5000,
      observedSpend: 6500,
      projectedSpend: 8000,
      projectedOverrun: 3000,
      source: "calendar-pace",
      historicalSampleCount: 0,
      elapsedDays: 12,
      daysInMonth: 30,
    },
  });

  const { container } = render(BudgetCard, { accountBudget });
  expect(container.textContent).toContain("Overspent");
});

test("distinguishes observed spend from future-dated postings without false overspent", () => {
  // Today is Sep 6. Observed spend is ₹3,000.
  // There is a future posting for ₹8,000 on Sep 20, so full-month actual is ₹11,000.
  // Budget is ₹10,000.
  // The user is NOT overspent today (Available: ₹7,000).
  // Status is 'likely-over', and the UI shows committed future spend.
  const accountBudget = createBudget({
    forecast: 10000,
    actual: 11000,
    projection: {
      status: "likely-over",
      effectiveBudget: 10000,
      observedSpend: 3000,
      projectedSpend: 11000,
      projectedOverrun: 1000,
      source: "historical-timing",
      historicalSampleCount: 3,
      elapsedDays: 6,
      daysInMonth: 30,
    },
  });

  const { container } = render(BudgetCard, { accountBudget });
  // Should show factual Available ₹7,000, not Overspent!
  expect(container.textContent).toContain("Available");
  expect(container.textContent).toContain("7,000");
  // Should show 11,000 committed
  expect(container.textContent).toContain("11,000");
  expect(container.textContent).toContain("committed");
  // Projection badge warns about likely overrun
  expect(container.textContent).toContain("Likely over");
});

test("renders more data needed badge for early month without historical samples", () => {
  const accountBudget = createBudget({
    projection: {
      status: "insufficient-data",
      effectiveBudget: 10000,
      observedSpend: 500,
      source: "insufficient-data",
      historicalSampleCount: 0,
      elapsedDays: 1,
      daysInMonth: 30,
    },
  });

  const { container } = render(BudgetCard, { accountBudget });
  expect(container.textContent).toContain("More data needed");
});

test("renders historical budget card without projection or projected spend", () => {
  const accountBudget = createBudget({
    projection: undefined,
  });

  const { container } = render(BudgetCard, { accountBudget });
  expect(container.textContent).not.toContain("Projected");
  expect(container.textContent).not.toContain("On track");
  expect(container.textContent).not.toContain("Likely over");
});
