import { expect } from "@std/expect";
import { describe, it as test } from "@std/testing/bdd";
import type { AssetBreakdown } from "$lib/domain/assets";
import type { AccountBudget, Budget } from "$lib/domain/cash_flow";
import type { Insight } from "$lib/domain/insights";
import dayjs from "dayjs";

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
});
globalThis.USER_CONFIG = {
  accounts: [],
  default_currency: "INR",
  readonly: false,
  display_precision: 2,
  locale: "en-IN",
  journal_path: "",
  db_path: "",
  financial_year_starting_month: 4,
  amount_alignment_column: 0,
  week_starting_day: 1,
  goals: {},
};

const {
  buildExpenseTrend,
  buildNetWorthTrend,
  periodUrl,
  summarizeBudget,
  summarizeCash,
  summarizeInsights,
} = await import("./summary.ts");

function cash(group: string, marketAmount: number): AssetBreakdown {
  return {
    group,
    marketAmount,
    investmentAmount: 0,
    withdrawalAmount: 0,
    balanceUnits: 0,
    xirr: 0,
    gainAmount: 0,
    absoluteReturn: 0,
  };
}

function insight(overrides: Partial<Insight>): Insight {
  return {
    id: "test",
    type: "expense_change",
    category: "spending",
    severity: "info",
    score: 1,
    ...overrides,
  };
}

function account(
  account: string,
  actual: number,
  forecast: number,
): AccountBudget {
  return {
    account,
    date: dayjs("2026-08-01"),
    actual,
    forecast,
    budgeted: forecast,
    available: forecast - actual,
    rollover: 0,
    expenses: [],
  };
}

function budget(accounts: AccountBudget[]): Budget {
  return {
    date: dayjs("2026-08-01"),
    accounts,
    endOfMonthBalance: 0,
    availableThisMonth: 0,
    forecast: 0,
  };
}

describe("dashboard summaries", () => {
  test("distinguishes missing, zero, and negative cash and sorts deterministically", () => {
    expect(summarizeCash({}).available).toBe(false);
    expect(summarizeCash({ zero: cash("Assets:Zero", 0) })).toMatchObject({
      available: true,
      total: 0,
      status: "neutral",
    });

    const result = summarizeCash({
      low: cash("Assets:Low", -20),
      b: cash("Assets:B", 10),
      a: cash("Assets:A", 10),
      high: cash("Assets:High", 30),
    });
    expect(result.total).toBe(30);
    expect(result.accounts.map((item) => item.group)).toEqual([
      "Assets:High",
      "Assets:A",
      "Assets:B",
    ]);
    expect(summarizeCash({ debt: cash("Assets:Debt", -1) }).status).toBe(
      "negative",
    );
  });

  test("selects the first attention insight without reordering backend results", () => {
    const info = insight({ id: "info", severity: "info", score: 100 });
    const warning = insight({ id: "warning", severity: "warning", score: 80 });
    const critical = insight({
      id: "critical",
      severity: "critical",
      score: 70,
    });
    expect(summarizeInsights([info, warning, critical])).toEqual({
      attentionCount: 2,
      preview: warning,
    });
    expect(summarizeInsights([info]).preview).toBe(info);
  });

  test("builds trends only when the matching insights exist", () => {
    const networth = { balanceAmount: 100 } as never;
    expect(buildNetWorthTrend(networth, [])).toBeUndefined();
    expect(buildNetWorthTrend(networth, [insight({
      type: "networth_change",
      change: -20,
      value: 100,
      previousValue: 120,
    })])).toMatchObject({ status: "negative" });
    expect(buildExpenseTrend([])).toBeUndefined();
    expect(
      buildExpenseTrend([insight({
        change: -30,
        changePercent: -30,
        value: 70,
        previousValue: 100,
      })])?.status,
    ).toBe("positive");
  });

  test("summarizes configured and unavailable budget states and limits attention accounts", () => {
    expect(summarizeBudget(undefined, [], true).statusLabel).toBe(
      "Not configured",
    );
    const configured = budget([
      account("Expenses:A", 10, 20),
      account("Expenses:B", 30, 20),
      account("Expenses:C", 18, 20),
      account("Expenses:D", 19, 20),
    ]);
    expect(summarizeBudget(configured, [], false).statusLabel).toBe(
      "Status unavailable",
    );
    expect(summarizeBudget(configured, [], true).statusLabel).toBe(
      "No categories need attention",
    );

    const alerts = ["B", "C", "D", "A"].map((name, index) =>
      insight({
        id: name,
        type: index === 0 ? "budget_overspent" : "budget_risk",
        category: "budget",
        severity: "warning",
        account: `Expenses:${name}`,
      })
    );
    const result = summarizeBudget(configured, alerts, true);
    expect(result.actual).toBe(77);
    expect(result.planned).toBe(80);
    expect(result.attentionCount).toBe(4);
    expect(result.accounts.map((item) => item.budget.account)).toEqual([
      "Expenses:B",
      "Expenses:C",
      "Expenses:D",
    ]);
  });

  test("keeps full net-worth navigation separate from monthly drilldowns", () => {
    expect(periodUrl("/expense/monthly", "2026-08")).toBe(
      "/expense/monthly?period=2026-08",
    );
  });
});
