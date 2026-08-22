import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import {
  buildAllocationTargetComparison,
  buildCreditCardYearlySpendsComparison,
  buildExpenseBreakdownComparison,
  buildGainOverviewComparison,
} from "$lib/charts/bar_comparison_data";
import type { AllocationTarget, Gain, Posting } from "$lib/core/utils";

function posting(
  account: string,
  amount: number,
  date = "2022-01-10",
): Posting {
  return {
    account,
    amount,
    date: dayjs(date),
    payee: account,
  } as Posting;
}

describe("bar/comparison ECharts adapters", () => {
  it("preserves expense category totals and shares", () => {
    const data = buildExpenseBreakdownComparison([
      posting("Expenses:Food:Groceries", 100, "2022-01-01"),
      posting("Expenses:Food:Restaurant", 50, "2022-01-02"),
      posting("Expenses:Travel:Taxi", 50, "2022-01-03"),
    ], {
      color: (category) => `color-${category}`,
    });

    const food = data.points.find((point) => point.key === "Food");
    const travel = data.points.find((point) => point.key === "Travel");

    expect(food?.value).toBe(150);
    expect(food?.secondaryValue).toBe(75);
    expect(food?.color).toBe("color-Food");
    expect(travel?.value).toBe(50);
    expect(data.points.reduce((sum, point) => sum + point.value, 0)).toBe(200);
  });

  it("preserves yearly credit-card totals and month breakdowns", () => {
    const data = buildCreditCardYearlySpendsComparison({
      "2022": { Jan: 100, Feb: 50 },
      "2021": { Dec: 25 },
    });

    expect(data.points.map((point) => point.key)).toEqual(["2021", "2022"]);
    expect(data.points[1].value).toBe(150);
    expect(data.points[1].tooltipRows?.map((row) => [row.label, row.value]))
      .toContainEqual(["Jan", 100]);
  });

  it("preserves allocation target, current, and diff values", () => {
    const data = buildAllocationTargetComparison([
      { name: "Equity", target: 60, current: 65 } as AllocationTarget,
      { name: "Debt", target: 40, current: 35 } as AllocationTarget,
    ]);

    expect(data.points.map((point) => point.key)).toEqual(["Debt", "Equity"]);
    expect(data.points[0].value).toBe(35);
    expect(data.points[0].target).toBe(40);
    expect(data.points[0].secondaryValue).toBe(-5);
  });

  it("preserves gain overview balance, investment, withdrawal, gain, and XIRR", () => {
    const data = buildGainOverviewComparison([
      {
        account: "Assets:Equity:Brokerage",
        xirr: 12.5,
        networth: {
          investmentAmount: 1000,
          withdrawalAmount: 100,
          gainAmount: 250,
          balanceAmount: 1150,
        },
      } as Gain,
    ]);

    expect(data.points[0].key).toBe("Assets:Equity:Brokerage");
    expect(data.points[0].value).toBe(1150);
    expect(data.points[0].secondaryValue).toBe(12.5);
    expect(data.points[0].tooltipRows?.map((row) => [row.label, row.value]))
      .toEqual([
        ["Investment", 1000],
        ["Withdrawal", 100],
        ["Gain", 250],
        ["Balance", 1150],
        ["XIRR", 12.5],
      ]);
  });
});
