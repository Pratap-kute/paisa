import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";
import { describe, expect, it } from "vitest";
import {
  buildGainAccountSeries,
  buildGoalInvestmentSeries,
  buildGoalProgressSeries,
  buildMonthlyIncomeSeries,
  buildMonthlyInvestmentSeries,
  buildNetworthSeries,
  buildRepaymentSeries,
  buildYearlyIncomeSeries,
  buildYearlyIncomeValueSeries,
  buildYearlyInvestmentSeries,
} from "$lib/charts/time_series_data";
import type {
  Forecast,
  Income,
  IncomeYearlyCard,
  InvestmentYearlyCard,
  Networth,
  Point,
  Posting,
} from "$lib/core/utils";

dayjs.extend(isSameOrBefore);

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

function networth(
  date: string,
  values: Pick<
    Networth,
    | "balanceAmount"
    | "investmentAmount"
    | "withdrawalAmount"
    | "netInvestmentAmount"
    | "gainAmount"
  >,
): Networth {
  return { date: dayjs(date), ...values } as Networth;
}

describe("time-series ECharts adapters", () => {
  it("preserves net worth, net investment, and gain/loss timeline values", () => {
    const data = buildNetworthSeries([
      networth("2022-02-01", {
        balanceAmount: 160,
        investmentAmount: 120,
        withdrawalAmount: 20,
        netInvestmentAmount: 100,
        gainAmount: 60,
      }),
      networth("2022-01-01", {
        balanceAmount: 90,
        investmentAmount: 100,
        withdrawalAmount: 0,
        netInvestmentAmount: 100,
        gainAmount: -10,
      }),
    ]);

    expect(data.series.map((series) => series.key)).toEqual([
      "networth",
      "investment",
      "gain",
      "loss",
    ]);
    expect(data.points.map((point) => point.values.networth)).toEqual([
      160,
      90,
    ]);
    expect(data.points[0].values.investment).toBe(100);
    expect(data.points[1].values.loss).toBe(90);
  });

  it("groups monthly investment credits and debits by investment account family", () => {
    const data = buildMonthlyInvestmentSeries([
      posting("Assets:Equity:Brokerage", 100, "2022-01-10"),
      posting("Assets:Equity:Brokerage", -25, "2022-01-12"),
      posting("Assets:Debt:PPF", 40, "2022-01-15"),
    ]);

    expect(data.series.map((series) => series.key)).toEqual([
      "Debt-credit",
      "Debt-debit",
      "Equity-credit",
      "Equity-debit",
    ]);
    expect(data.points[0].values["Equity-credit"]).toBe(100);
    expect(data.points[0].values["Equity-debit"]).toBe(-25);
    expect(data.points[0].values["Debt-credit"]).toBe(40);
  });

  it("groups yearly investment cards without changing debit or credit signs", () => {
    const data = buildYearlyInvestmentSeries([
      {
        start_date: dayjs("2021-04-01"),
        end_date: dayjs("2022-03-31"),
        postings: [
          posting("Assets:Equity:Brokerage", 300),
          posting("Assets:Equity:Brokerage", -50),
        ],
      } as InvestmentYearlyCard,
    ]);

    expect(data.points[0].period).toBe("2021 - 22");
    expect(data.points[0].values["Equity-credit"]).toBe(300);
    expect(data.points[0].values["Equity-debit"]).toBe(-50);
  });

  it("groups monthly and yearly income as positive income totals", () => {
    const monthly = buildMonthlyIncomeSeries([
      {
        date: dayjs("2022-01-01"),
        postings: [
          posting("Income:Salary:Acme", -1000),
          posting("Income:Tax:TDS", 200),
        ],
      } as Income,
    ]);
    const yearly = buildYearlyIncomeSeries([
      {
        start_date: dayjs("2021-04-01"),
        end_date: dayjs("2022-03-31"),
        postings: [
          posting("Income:Salary:Acme", -1200),
          posting("Income:Interest:Bank", -100),
        ],
      } as IncomeYearlyCard,
    ]);
    const net = buildYearlyIncomeValueSeries(
      "Net Income",
      "net_income",
      "red",
      [
        {
          start_date: dayjs("2021-04-01"),
          end_date: dayjs("2022-03-31"),
          net_income: 900,
        } as IncomeYearlyCard,
      ],
    );

    expect(monthly.points[0].values.Salary).toBe(1000);
    expect(monthly.points[0].values.Tax).toBe(-200);
    expect(yearly.points[0].values.Salary).toBe(1200);
    expect(yearly.points[0].values.Interest).toBe(100);
    expect(net.points[0].values.net_income).toBe(900);
  });

  it("groups monthly repayments by liability account", () => {
    const data = buildRepaymentSeries([
      posting("Liabilities:Home Loan", 500, "2022-01-01"),
      posting("Liabilities:Car Loan", 100, "2022-01-15"),
    ]);

    expect(data.points[0].values["Home Loan"]).toBe(500);
    expect(data.points[0].values["Car Loan"]).toBe(100);
  });

  it("preserves goal actual, forecast, milestone, and monthly investment values", () => {
    const points: Point[] = [
      { date: dayjs("2022-01-01"), value: 100 },
    ];
    const forecasts: Forecast[] = [
      { date: dayjs("2022-02-01"), value: 150, error: 10 },
    ];
    const progress = buildGoalProgressSeries(points, forecasts, forecasts, 200);
    const investment = buildGoalInvestmentSeries([
      posting(
        "Assets:Equity:Brokerage",
        80,
        dayjs().subtract(1, "month").format("YYYY-MM-DD"),
      ),
    ], 75);

    expect(progress.points.map((point) => point.values.actual)).toContain(100);
    expect(progress.points.map((point) => point.values.forecast)).toContain(
      150,
    );
    expect(progress.points.map((point) => point.values.milestone)).toContain(
      150,
    );
    expect(investment.series[0].markLine?.value).toBe(75);
    expect(investment.points.some((point) => point.values.total === 80)).toBe(
      true,
    );
  });

  it("preserves account gain detail balance and investment timeline values", () => {
    const data = buildGainAccountSeries([
      networth("2022-01-01", {
        balanceAmount: 120,
        investmentAmount: 100,
        withdrawalAmount: 0,
        netInvestmentAmount: 100,
        gainAmount: 20,
      }),
    ]);

    expect(data.points[0].values.balance).toBe(120);
    expect(data.points[0].values.investment).toBe(100);
    expect(data.points[0].values.gain).toBe(120);
  });
});
