import { render } from "@testing-library/svelte";
import { expect, test } from "vitest";
import InsightItem from "./InsightItem.svelte";
import type { Insight as _Insight } from "$lib/domain/insights";

test("renders InsightItem correctly with title, description and badge", () => {
  const insight: _Insight = {
    id: "expense_change:2026-08",
    type: "expense_change",
    category: "spending",
    severity: "warning",
    score: 65,
    value: 82400,
    previousValue: 72280,
    change: 10120,
    changePercent: 14,
    href: "/expense/monthly",
  };

  const { container } = render(InsightItem, {
    insight,
    isPartial: false,
    comparisonPeriod: "2026-07",
  });

  const link = container.querySelector("a");
  expect(link).toBeInTheDocument();
  expect(link?.getAttribute("href")).toBe("/expense/monthly");
  expect(container.textContent).toContain("Expenses increased 14%");
  expect(container.textContent).toContain("+14.0%");
});
