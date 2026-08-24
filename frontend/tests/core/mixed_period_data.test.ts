import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
import { describe, expect, it } from "vitest";
import {
  buildAllocationTimelineSeries,
  buildCashFlowSeries,
  buildMonthlyExpenseTimelineSeries,
  buildYearlyExpenseTimelineSeries,
} from "$lib/charts/mixed_period_data";
import type { Aggregate, CashFlow, Posting } from "$lib/core/utils";

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

const posting = (date: string, account: string, amount: number) =>
  ({ date: dayjs(date), account, amount, payee: account }) as Posting;

describe("mixed-period chart adapters", () => {
  it("preserves cash-flow source, use, checking, and balance values", () => {
    const flow = {
      date: dayjs("2024-01-01"),
      income: 1000,
      expenses: 400,
      tax: 100,
      investment: 200,
      liabilities: -50,
      checking: 250,
      balance: 750,
    } as CashFlow;
    const point = buildCashFlowSeries([flow]).points[0];
    expect(point.values).toMatchObject({
      income: 1000,
      expenses: 400,
      tax: 100,
      "investment-use": 200,
      "liability-use": 50,
      balance: 750,
    });
    expect(point.tooltipRows?.map((row) => [row[0], row[1]])).toContainEqual([
      "Checking",
      250,
    ]);
  });

  it("groups monthly expenses and preserves yearly monthly averages", () => {
    const data = buildMonthlyExpenseTimelineSeries(
      [
        posting("2024-01-05", "Expenses:Food", 100),
        posting("2024-02-05", "Expenses:Food", 50),
        posting("2024-02-10", "Expenses:Rent", 200),
      ],
      ["Food"],
      { from: dayjs("2024-01-01"), to: dayjs("2024-02-29") },
    );
    expect(data.points.map((point) => point.values.Food)).toEqual([100, 50]);
    expect(data.points.map((point) => point.values.yearlyAverage)).toEqual([
      75,
      75,
    ]);
    expect(data.series.map((series) => series.key)).toEqual([
      "Food",
      "yearlyAverage",
    ]);
    expect(data.points[0].tooltipRows).toContainEqual([
      "Yearly monthly average",
      75,
    ]);
  });

  it("keeps financial-year ordering and category totals", () => {
    const data = buildYearlyExpenseTimelineSeries([
      posting("2023-05-01", "Expenses:Food", 20),
      posting("2024-05-01", "Expenses:Food", 30),
    ], ["Food"]);
    expect(
      data.points.filter((point) => point.values.Food).map((point) =>
        point.values.Food
      ),
    ).toEqual([20, 30]);
  });

  it("computes allocation percentages from unchanged market amounts", () => {
    const date = dayjs("2024-01-01");
    const data = buildAllocationTimelineSeries([{
      a: { account: "Assets:Equity:A", market_amount: 75, date } as Aggregate,
      b: { account: "Assets:Debt:B", market_amount: 25, date } as Aggregate,
    }]);
    expect(data.points[0].values).toMatchObject({ Equity: 0.75, Debt: 0.25 });
    expect(data.series.map((series) => series.key)).toEqual(["Debt", "Equity"]);
  });
});
