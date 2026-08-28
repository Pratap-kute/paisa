import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
import type { CashFlow } from "$lib/domain/cash_flow";
import type { Posting } from "$lib/domain/ledger";
import { describe, expect, it } from "vitest";
import {
  buildMonthlyExpenseTimelineSeries,
  buildYearlyExpenseTimelineSeries,
  expenseGroupsByContribution,
} from "$lib/features/expense/chart_timeline_data";
import { buildCashFlowSeries } from "$lib/features/cash_flow/chart_data";
import { buildAllocationTimelineSeries } from "$lib/features/assets/allocation_timeline_data";
import type { Aggregate } from "$lib/domain/assets";

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
      "Calendar-year monthly average",
      75,
    ]);
    expect(data.series.at(-1)?.label).toBe("Monthly Average");
  });

  it("orders expense categories by contribution with stable ties", () => {
    expect(expenseGroupsByContribution([
      posting("2024-01-05", "Expenses:Food", 100),
      posting("2024-01-06", "Expenses:Rent", 250),
      posting("2024-01-07", "Expenses:Books", 100),
    ])).toEqual(["Rent", "Books", "Food"]);
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
