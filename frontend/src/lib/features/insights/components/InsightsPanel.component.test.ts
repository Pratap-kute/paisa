import { render } from "@testing-library/svelte";
import { expect, test } from "vitest";
import InsightsPanel from "./InsightsPanel.svelte";
import type { Insight as _Insight } from "$lib/domain/insights";

test("renders InsightsPanel with top insights and link", () => {
  const insights: _Insight[] = [
    {
      id: "i1",
      type: "expense_change",
      category: "spending",
      severity: "warning",
      score: 70,
      value: 50000,
      changePercent: 15,
      href: "/expense/monthly",
    },
    {
      id: "i2",
      type: "savings_rate_change",
      category: "savings",
      severity: "positive",
      score: 60,
      value: 35,
      previousValue: 30,
      change: 5,
      href: "/assets/investment",
    },
  ];

  const { container } = render(InsightsPanel, {
    insights,
    loading: false,
    maxItems: 5,
  });

  expect(container.textContent).toContain("Financial Insights");
  expect(container.textContent).toContain("View all 2");
  const links = container.querySelectorAll("a");
  expect(links.length).toBeGreaterThan(1);
});

test("renders empty when no insights", () => {
  const { container } = render(InsightsPanel, {
    insights: [],
    loading: false,
  });

  expect(container.textContent?.trim()).toBe("");
});
