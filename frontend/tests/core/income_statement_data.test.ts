import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import { buildIncomeStatementWaterfall } from "$lib/charts/income_statement_data";
import {
  buildIncomeStatementWaterfallOption,
  incomeStatementAxisRange,
} from "$lib/charts/echarts/waterfall";
import type { IncomeStatement } from "$lib/core/utils";

describe("income statement waterfall adapter", () => {
  it("preserves ordered start, delta, end, and breakdown values", () => {
    const statement = {
      startingBalance: 100,
      endingBalance: 195,
      date: dayjs("2024-03-31"),
      income: { "Income:Salary": -200 },
      tax: { "Expenses:Tax": 30 },
      interest: { "Income:Interest": -10 },
      pnl: { "Income:CapitalGains": 20 },
      equity: { "Equity:Opening": 5 },
      liabilities: { "Liabilities:Loan": -40 },
      expenses: { "Expenses:Food": 140 },
    } as IncomeStatement;
    const data = buildIncomeStatementWaterfall(statement);
    expect(data.steps.map((step) => step.id)).toEqual([
      "start",
      "income",
      "tax",
      "interest",
      "pnl",
      "equity",
      "liabilities",
      "expenses",
      "end",
    ]);
    expect(data.steps[1]).toMatchObject({ start: 100, delta: 200, end: 300 });
    expect(data.steps[2]).toMatchObject({ start: 300, delta: -30, end: 270 });
    expect(data.steps[1].breakdown).toEqual([{
      account: "Income:Salary",
      value: 200,
    }]);
    expect(data.steps.at(-1)?.end).toBe(statement.endingBalance);
  });

  it("keeps an explicit ending balance even when source sections do not reconcile", () => {
    const statement = {
      startingBalance: 10,
      endingBalance: 99,
      date: dayjs(),
      income: {},
      tax: {},
      interest: {},
      pnl: {},
      equity: {},
      liabilities: {},
      expenses: {},
    } as IncomeStatement;
    expect(buildIncomeStatementWaterfall(statement).endingBalance).toBe(99);
  });

  it("zooms the chart to the cumulative bridge without changing step values", () => {
    const data = buildIncomeStatementWaterfall({
      startingBalance: 18_731_450,
      endingBalance: 20_817_436,
      date: dayjs(),
      income: { "Income:Salary": -1_748_750 },
      tax: { "Expenses:Tax": 524_625 },
      interest: { "Income:Interest": -372_083 },
      pnl: { "Income:CapitalGains": 661_377 },
      equity: {},
      liabilities: {},
      expenses: { "Expenses:Food": 171_600 },
    } as IncomeStatement);

    const range = incomeStatementAxisRange(data);
    const option = buildIncomeStatementWaterfallOption(data);

    expect(range.min).toBeGreaterThan(0);
    expect(range.min).toBeLessThanOrEqual(
      Math.min(...data.steps.map((step) => step.end)),
    );
    expect(range.max).toBeGreaterThanOrEqual(
      Math.max(...data.steps.map((step) => step.end)),
    );
    expect(option.baseOption.yAxis).toMatchObject({
      min: range.min,
      max: range.max,
      scale: true,
    });
    expect(option.baseOption.series[1].data[1].value).toBe(1_748_750);
    expect(option.baseOption.series[1].data[2].value).toBe(524_625);
  });

  it("provides a finite axis for empty chart data", () => {
    expect(incomeStatementAxisRange({ steps: [], endingBalance: 0 })).toEqual({
      min: 0,
      max: 1,
    });
  });
});
