import { render } from "@testing-library/svelte";
import { expect, test } from "vitest";
import type { BudgetSummary } from "../summary";
import DashboardBudgetHealth from "./DashboardBudgetHealth.svelte";
import { formatCurrency } from "$lib/shared/formatters/currency";

test("renders likely-over with projected overrun warning rather than overspent even when available < 0", () => {
  const summary: BudgetSummary = {
    configured: true,
    actual: 3000,
    planned: 10000,
    attentionCount: 1,
    statusLabel: "1 category needs attention",
    status: "warning",
    accounts: [
      {
        budget: {
          account: "Expenses:Shopping",
          forecast: 10000,
          actual: 11000, // 3k observed + 8k future
          available: -1000, // negative because of future postings
          expenses: [],
          projection: {
            status: "likely-over",
            effectiveBudget: 10000,
            observedSpend: 3000,
            projectedSpend: 11000,
            projectedOverrun: 1000,
            source: "historical-timing",
            historicalSampleCount: 3,
            elapsedDays: 10,
            daysInMonth: 31,
          },
        },
      },
    ],
  };

  const { container } = render(DashboardBudgetHealth, {
    summary,
    period: "2026-09",
    isPartial: true,
  });

  const text = container.textContent ?? "";
  expect(text).toContain(`${formatCurrency(3000)} spent of ${formatCurrency(10000)} planned`);
  expect(text).toContain("Shopping");
  // Must show projected overrun with warning tone, NOT "Over by"
  expect(text).toContain(`~${formatCurrency(1000)} overrun`);
  expect(text).not.toContain("Over by");

  const badge = container.querySelector(".text-warning");
  expect(badge).not.toBeNull();
  expect(container.querySelector(".text-negative")).toBeNull();
});

test("renders overspent with factual overrun using observedSpend minus effectiveBudget", () => {
  const summary: BudgetSummary = {
    configured: true,
    actual: 11000,
    planned: 10000,
    attentionCount: 1,
    statusLabel: "1 category needs attention",
    status: "negative",
    accounts: [
      {
        budget: {
          account: "Expenses:Groceries",
          forecast: 10000,
          actual: 16000, // 11k observed + 5k future
          available: -6000,
          expenses: [],
          projection: {
            status: "overspent",
            effectiveBudget: 10000,
            observedSpend: 11000,
            projectedSpend: 16000,
            projectedOverrun: 6000,
            source: "calendar-pace",
            historicalSampleCount: 0,
            elapsedDays: 15,
            daysInMonth: 30,
          },
        },
      },
    ],
  };

  const { container } = render(DashboardBudgetHealth, {
    summary,
    period: "2026-09",
    isPartial: true,
  });

  const text = container.textContent ?? "";
  // Overrun must be factual (11,000 - 10,000 = 1,000), not full-month (6,000)
  expect(text).toContain(`Over by ${formatCurrency(1000)}`);
  expect(text).not.toContain(`Over by ${formatCurrency(6000)}`);

  const badge = container.querySelector(".text-negative");
  expect(badge).not.toBeNull();
});

test("falls back to available < 0 for historical budgets without projection", () => {
  const summary: BudgetSummary = {
    configured: true,
    actual: 10500,
    planned: 10000,
    attentionCount: 1,
    statusLabel: "1 category needs attention",
    status: "negative",
    accounts: [
      {
        budget: {
          account: "Expenses:Dining",
          forecast: 10000,
          actual: 10500,
          available: -500,
          expenses: [],
        },
      },
    ],
  };

  const { container } = render(DashboardBudgetHealth, {
    summary,
    period: "2026-08",
    isPartial: false,
  });

  const text = container.textContent ?? "";
  expect(text).toContain(`Over by ${formatCurrency(500)}`);
  const badge = container.querySelector(".text-negative");
  expect(badge).not.toBeNull();
});
