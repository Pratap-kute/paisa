import { render } from "@testing-library/svelte";
import { expect, test } from "vitest";
import InsightCard from "./InsightCard.svelte";
import type { Insight as _Insight } from "$lib/domain/insights";

test("renders InsightCard correctly with hero metric and title", () => {
  const insight: _Insight = {
    id: "budget_overspent:2026-08:Expenses:Food",
    type: "budget_overspent",
    category: "budget",
    severity: "critical",
    score: 85,
    value: 12500,
    previousValue: 10000,
    change: 2500,
    account: "Expenses:Food",
    href: "/expense/budget",
  };

  const { container } = render(InsightCard, {
    insight,
    isPartial: false,
    comparisonPeriod: "2026-07",
  });

  const link = container.querySelector("a");
  expect(link).toBeInTheDocument();
  expect(link?.getAttribute("href")).toBe("/expense/budget");
  expect(container.textContent).toContain("Food budget exceeded");
  expect(container.textContent).toContain("125%");
});
