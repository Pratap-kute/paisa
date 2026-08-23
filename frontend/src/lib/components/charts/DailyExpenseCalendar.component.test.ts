import { render } from "@testing-library/svelte";
import { expect, test } from "vitest";
import DailyExpenseCalendar from "./DailyExpenseCalendar.svelte";

test("renders aligned dates, activity intensity, and useful detail text", () => {
  const points = Array.from({ length: 29 }, (_, index) => ({
    key: `2024-02-${String(index + 1).padStart(2, "0")}`,
    label: `${String(index + 1).padStart(2, "0")} Feb 2024`,
    value: index === 2 ? 100 : 0,
    hasActivity: index === 2,
    tooltipRows: index === 2
      ? [{ label: "Rent", detail: "Expenses:Rent", value: 100 }]
      : [],
  }));
  const { getAllByRole, getByRole } = render(DailyExpenseCalendar, {
    data: {
      granularity: "day",
      period: "2024-02",
      points,
      maxValue: 100,
    },
    ariaLabel: "February expenses",
    testId: "expense-calendar",
  });

  const days = getAllByRole("gridcell");
  expect(days).toHaveLength(29);
  expect(days[0]).toHaveStyle("--calendar-column: 4");
  expect(days[2]).toHaveStyle("--expense-intensity: 100%");
  expect(days[2].getAttribute("title")).toContain("Rent (Expenses:Rent)");
  expect(getByRole("grid", { name: "February expenses" }))
    .toHaveAttribute("data-chart-ready", "true");
});
