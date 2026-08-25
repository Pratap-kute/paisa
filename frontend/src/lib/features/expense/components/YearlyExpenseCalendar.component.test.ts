import { cleanup, render } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import YearlyExpenseCalendar from "./YearlyExpenseCalendar.svelte";

afterEach(cleanup);

describe("YearlyExpenseCalendar", () => {
  it("renders month composition, totals, empty months, and rich detail", () => {
    const colorFor = vi.fn((key: string) =>
      key === "Food" ? "#00aa00" : "#0000aa"
    );
    const points = Array.from({ length: 12 }, (_, index) => ({
      key: `2024-${String(index + 1).padStart(2, "0")}`,
      label: `${index === 0 ? "Jan" : "Feb"} 2024`,
      value: index === 0 ? 150 : 0,
      tooltipRows: index === 0
        ? [{ label: "Food", value: 100 }, { label: "Travel", value: 50 }]
        : [],
      segments: index === 0
        ? [{ key: "Food", value: 100 }, { key: "Travel", value: 50 }]
        : [],
      hasActivity: index === 0,
    }));

    const { container, getAllByRole } = render(YearlyExpenseCalendar, {
      data: { granularity: "month", period: "2024", points, maxValue: 150 },
      ariaLabel: "Yearly expense activity",
      testId: "yearly-calendar",
      colorFor,
    });

    const calendar = container.querySelector("[data-testid='yearly-calendar']");
    const months = getAllByRole("button");
    expect(calendar?.getAttribute("data-chart-ready")).toBe("true");
    expect(months).toHaveLength(12);
    expect(months[0].getAttribute("style")).toContain("conic-gradient");
    expect(months[0].getAttribute("data-tippy-content")).toContain("Food");
    expect(months[0].getAttribute("data-tippy-content")).toContain("Total");
    expect(months[0]).not.toHaveAttribute("title");
    expect(months[0].getAttribute("aria-label")).toContain("Total");
    expect(months[1].textContent).toContain("No activity");
    expect(colorFor).toHaveBeenCalledWith("Food");
    expect(colorFor).toHaveBeenCalledWith("Travel");
  });
});
