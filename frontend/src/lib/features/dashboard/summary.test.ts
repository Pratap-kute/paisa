import { expect } from "@std/expect";
import { describe, it as test } from "@std/testing/bdd";
import type { AssetBreakdown } from "$lib/domain/assets";
import type { AccountBudget, Budget } from "$lib/domain/cash_flow";
import type { Insight } from "$lib/domain/insights";
import type { GoalSummary } from "$lib/domain/goals_models";
import type {
  TransactionSchedule,
  TransactionSequence,
} from "$lib/domain/recurring";
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
  buildDashboardAttention,
  buildExpensePace,
  buildNetWorthTrend,
  periodUrl,
  summarizeBudget,
  summarizeCash,
  summarizeInsights,
  summarizeUpcomingRecurring,
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

function recurring(
  key: string,
  scheduled: string | string[],
  amount: number,
  account = "Expenses:Bills",
): TransactionSequence {
  const transaction = {
    id: key,
    date: dayjs("2026-08-01"),
    payee: key,
    beginLine: 1,
    endLine: 2,
    fileName: "main.ledger",
    postings: [
      { account, amount } as never,
      {
        account: "Assets:Checking",
        amount: account.startsWith("Income:") ? amount : -amount,
      } as never,
    ],
  };
  const schedules: TransactionSchedule[] = (
    Array.isArray(scheduled) ? scheduled : [scheduled]
  ).map((date) => ({
    key,
    amount,
    scheduled: dayjs(date),
    actual: null,
    transaction: null,
  }));
  return {
    key,
    period: "",
    interval: 30,
    transactions: [transaction],
    schedules,
    pastSchedules: schedules.filter((schedule) =>
      schedule.scheduled.isBefore(dayjs("2026-08-10"), "day")
    ),
    futureSchedules: schedules.filter((schedule) =>
      !schedule.scheduled.isBefore(dayjs("2026-08-10"), "day")
    ),
    schedulesByMonth: {},
  } as TransactionSequence;
}

function goal(overrides: Partial<GoalSummary> = {}): GoalSummary {
  return {
    id: "goal",
    type: "savings",
    name: "Emergency Fund",
    icon: "fa-solid fa-piggy-bank",
    current: 72_000,
    target: 100_000,
    targetDate: "2026-08-01",
    priority: 0,
    ...overrides,
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

  test("projects current-month expenses after the first two days", () => {
    expect(buildExpensePace(1_000, "2026-08", dayjs("2026-08-02")))
      .toBeUndefined();
    expect(buildExpensePace(0, "2026-08", dayjs("2026-08-10")))
      .toBeUndefined();
    expect(buildExpensePace(1_000, "2026-07", dayjs("2026-08-10")))
      .toBeUndefined();
    expect(buildExpensePace(10_000, "2026-08", dayjs("2026-08-10")))
      .toMatchObject({ projectedExpenses: 31_000, status: "neutral" });
    expect(buildExpensePace(2_800, "2026-02", dayjs("2026-02-28")))
      .toMatchObject({ projectedExpenses: 2_800 });
  });

  test("marks a deterministic projection above the configured budget", () => {
    expect(buildExpensePace(10_000, "2026-08", dayjs("2026-08-10"), 25_000))
      .toMatchObject({
        projectedExpenses: 31_000,
        overBudget: 6_000,
        status: "warning",
      });
  });

  test("summarizes outgoing recurring obligations within an inclusive 14-day horizon", () => {
    const result = summarizeUpcomingRecurring(
      [
        recurring("past", "2026-08-09", 500),
        recurring("today", "2026-08-10", 1_000),
        recurring("boundary", "2026-08-24", 2_000),
        recurring("outside", "2026-08-25", 4_000),
        recurring("salary", "2026-08-15", 50_000, "Income:Salary"),
        recurring("transfer", "2026-08-15", 3_000, "Assets:Savings"),
      ],
      dayjs("2026-08-10"),
      5_000,
    );
    expect(result).toMatchObject({
      upcomingAmount: 3_000,
      upcomingCount: 2,
      pastDueAmount: 500,
      pastDueCount: 1,
      cashAfterUpcoming: 2_000,
    });
    expect(result.earliestDueDate?.format("YYYY-MM-DD")).toBe("2026-08-10");
  });

  test("preserves missing cash and reports a deterministic shortage", () => {
    const sequences = [recurring("rent", "2026-08-12", 8_000)];
    const withoutCash = summarizeUpcomingRecurring(
      sequences,
      dayjs("2026-08-10"),
    );
    expect(withoutCash.upcomingAmount).toBe(8_000);
    expect(withoutCash.cashAfterUpcoming).toBeUndefined();
    expect(summarizeUpcomingRecurring(sequences, dayjs("2026-08-10"), 5_000))
      .toMatchObject({ cashAfterUpcoming: -3_000 });
    expect(summarizeUpcomingRecurring([], dayjs("2026-08-10")))
      .toMatchObject({ upcomingCount: 0, pastDueCount: 0 });
  });

  test("counts every weekly occurrence inside the recurring horizon", () => {
    const result = summarizeUpcomingRecurring([
      recurring("weekly", ["2026-08-12", "2026-08-19"], 1_000),
    ], dayjs("2026-08-10"));
    expect(result).toMatchObject({
      upcomingCount: 2,
      upcomingAmount: 2_000,
      pastDueCount: 0,
    });
  });

  test("counts past-due and future occurrences from the same sequence", () => {
    const result = summarizeUpcomingRecurring([
      recurring("weekly", ["2026-08-01", "2026-08-08", "2026-08-15"], 750),
    ], dayjs("2026-08-10"));
    expect(result).toMatchObject({
      pastDueCount: 2,
      pastDueAmount: 1_500,
      upcomingCount: 1,
      upcomingAmount: 750,
    });
  });

  test("orders, deduplicates, and caps cross-domain attention", () => {
    const recurringSummary = summarizeUpcomingRecurring(
      [recurring("rent", "2026-08-09", 8_000)],
      dayjs("2026-08-10"),
      5_000,
    );
    const items = buildDashboardAttention({
      insights: [
        insight({ id: "warning-low", severity: "warning", score: 10 }),
        insight({ id: "critical", severity: "critical", score: 1 }),
        insight({ id: "warning-high", severity: "warning", score: 20 }),
      ],
      recurring: recurringSummary,
      goals: [goal()],
      asOf: dayjs("2026-08-10"),
    });
    expect(items.map((item) => item.id)).toEqual([
      "insight:critical",
      "recurring:past-due",
      "insight:warning-high",
    ]);

    const duplicateBudget = buildDashboardAttention({
      insights: [
        insight({
          id: "risk",
          type: "budget_risk",
          account: "Expenses:Food",
          severity: "warning",
          score: 5,
        }),
        insight({
          id: "overspent",
          type: "budget_overspent",
          account: "Expenses:Food",
          severity: "warning",
          score: 10,
        }),
      ],
      recurring: summarizeUpcomingRecurring([], dayjs("2026-08-10")),
      asOf: dayjs("2026-08-10"),
    });
    expect(duplicateBudget).toHaveLength(1);
    expect(duplicateBudget[0].id).toBe("insight:overspent");
  });

  test("preserves descending insight score order within a severity", () => {
    const items = buildDashboardAttention({
      insights: [
        insight({ id: "a-low", severity: "warning", score: 10 }),
        insight({ id: "z-high", severity: "warning", score: 90 }),
      ],
      recurring: summarizeUpcomingRecurring([], dayjs("2026-08-10")),
      asOf: dayjs("2026-08-10"),
    });
    expect(items.map((item) => item.id)).toEqual([
      "insight:z-high",
      "insight:a-low",
    ]);
  });

  test("does not use informational insights to fill attention slots", () => {
    expect(buildDashboardAttention({
      insights: [insight({ id: "context", severity: "info", score: 100 })],
      recurring: summarizeUpcomingRecurring([], dayjs("2026-08-10")),
      asOf: dayjs("2026-08-10"),
    })).toEqual([]);
  });

  test("adds only overdue incomplete goals and inspects every supplied goal", () => {
    const items = buildDashboardAttention({
      insights: undefined,
      recurring: summarizeUpcomingRecurring([], dayjs("2026-08-10")),
      goals: [
        goal({ id: "complete", current: 100_000 }),
        goal({ id: "future", targetDate: "2026-09-01" }),
        goal({ id: "invalid", targetDate: "" }),
        goal({ id: "overdue", name: "Fourth Goal" }),
      ],
      asOf: dayjs("2026-08-10"),
    });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "goal:overdue:overdue",
      title: "Fourth Goal goal is overdue",
      iconIsGlyph: true,
    });
  });

  test("does not manufacture positive attention when insights are missing", () => {
    expect(buildDashboardAttention({
      insights: null,
      recurring: summarizeUpcomingRecurring([], dayjs("2026-08-10")),
      goals: [],
      asOf: dayjs("2026-08-10"),
    })).toEqual([]);
  });
});
