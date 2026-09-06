import { expect } from "@std/expect";
import { describe, it as test } from "@std/testing/bdd";
import type { AssetBreakdown } from "$lib/domain/assets";
import type { AccountBudget, Budget } from "$lib/domain/cash_flow";
import type { Insight } from "$lib/domain/insights";
import type { GoalSummary } from "$lib/domain/goals_models";
import {
  analyzeRecurring,
  type RecurringAnalysis,
} from "$lib/domain/recurring_analysis";
import type { Posting, Transaction } from "$lib/domain/ledger";
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
  summarizeAnalyzedRecurring,
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

function summarizeUpcomingRecurring(
  items: RecurringAnalysis[],
  asOf: dayjs.Dayjs,
  cashBalance?: number,
) {
  return summarizeAnalyzedRecurring(items, asOf, "INR", cashBalance, 14);
}
function recurring(
  key: string,
  scheduled: string | string[],
  amount: number,
  account = "Expenses:Bills",
): RecurringAnalysis {
  const dates = (Array.isArray(scheduled) ? scheduled : [scheduled]).map((d) =>
    dayjs(d)
  );
  const transaction = {
    id: key,
    date: dayjs("2026-08-01"),
    payee: key,
    postings: [
      {
        account,
        quantity: account.startsWith("Income:") ? -amount : amount,
        commodity: "INR",
      },
      {
        account: "Assets:Checking",
        quantity: account.startsWith("Income:") ? amount : -amount,
        commodity: "INR",
      },
    ] as Posting[],
  } as Transaction;
  const item = analyzeRecurring(key, [transaction], true, dayjs("2026-08-10"))!;
  item.upcomingDates = dates.filter((d) =>
    !d.isBefore(dayjs("2026-08-10"), "day")
  );
  item.flags.laterThanUsual = dates.some((d) =>
    d.isBefore(dayjs("2026-08-10"), "day")
  );
  return item;
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

  test("counts a delayed sequence once alongside its future occurrences", () => {
    const result = summarizeUpcomingRecurring([
      recurring("weekly", ["2026-08-01", "2026-08-08", "2026-08-15"], 750),
    ], dayjs("2026-08-10"));
    expect(result).toMatchObject({
      pastDueCount: 1,
      pastDueAmount: 750,
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
      "goal:overdue:goal",
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
      title: "Fourth Goal: Target date has passed",
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

test("goal attention uses shared pace thresholds, respects priority and promotes only one goal", () => {
  const asOf = dayjs("2026-08-10");
  const history = ["2026-05", "2026-06", "2026-07"].map((month) => ({
    month,
    amount: 1000,
  }));
  const candidates = [
    goal({
      id: "low",
      name: "Low",
      targetDate: "2027-02-28",
      priority: 1,
      contributionHistory: history,
    }),
    goal({
      id: "high",
      name: "High",
      targetDate: "2027-02-28",
      priority: 10,
      contributionHistory: history,
    }),
    goal({
      id: "retirement",
      type: "retirement",
      targetDate: "2020-01-01",
      priority: 100,
      contributionHistory: history,
    }),
  ];
  const items = buildDashboardAttention({
    insights: [],
    recurring: summarizeUpcomingRecurring([], asOf),
    goals: candidates,
    asOf,
  }, 10);
  expect(items).toHaveLength(1);
  expect(items[0].id).toBe("goal:at-risk:high");
  expect(items[0].title).toBe("High: At risk");
  expect(items[0].detail).toContain("recent pace");
});

test("preserves goal severity and ranks critical goals above ordinary warnings", () => {
  const asOf = dayjs("2026-08-10");
  for (
    const [amount, date, status, priority] of [
      [1000, "2026-08-01", "negative", 550],
      [1000, "2027-02-28", "negative", 550],
      [3800, "2027-02-28", "warning", 200],
    ] as const
  ) {
    const items = buildDashboardAttention({
      insights: [insight({ id: "ordinary", severity: "warning" })],
      recurring: summarizeUpcomingRecurring([], asOf),
      goals: [
        goal({
          targetDate: date,
          contributionHistory: ["2026-05", "2026-06", "2026-07"].map(
            (month) => ({ month, amount }),
          ),
        }),
      ],
      asOf,
    });
    const goalItem = items.find((item) => item.kind === "goal");
    expect(goalItem?.status).toBe(status);
    expect(goalItem?.priority).toBe(priority);
    expect(items[0].kind).toBe(status === "negative" ? "goal" : "insight");
  }
});

test("summarizeBudget uses outlook and projections directly, decoupling from insights", () => {
  const accOnTrack: AccountBudget = {
    ...account("Expenses:Rent", 10000, 10000),
    projection: {
      status: "on-track",
      projectedSpend: 10000,
      source: "historical-timing",
      effectiveBudget: 10000,
      observedSpend: 10000,
      historicalSampleCount: 5,
      elapsedDays: 10,
      daysInMonth: 31,
    },
  };

  const accAtRisk: AccountBudget = {
    ...account("Expenses:Groceries", 9600, 10000),
    projection: {
      status: "at-risk",
      projectedSpend: 9800,
      source: "historical-timing",
      effectiveBudget: 10000,
      observedSpend: 9600,
      historicalSampleCount: 5,
      elapsedDays: 10,
      daysInMonth: 31,
    },
  };

  const accLikelyOver: AccountBudget = {
    ...account("Expenses:Dining", 8000, 10000),
    projection: {
      status: "likely-over",
      projectedSpend: 13500,
      projectedOverrun: 3500,
      source: "calendar-pace",
      effectiveBudget: 10000,
      observedSpend: 8000,
      historicalSampleCount: 0,
      elapsedDays: 10,
      daysInMonth: 31,
    },
  };

  const accOverspent: AccountBudget = {
    ...account("Expenses:Shopping", 12000, 10000),
    available: -2000,
    projection: {
      status: "overspent",
      projectedSpend: 15000,
      projectedOverrun: 5000,
      source: "historical-timing",
      effectiveBudget: 10000,
      observedSpend: 12000,
      historicalSampleCount: 4,
      elapsedDays: 10,
      daysInMonth: 31,
    },
  };

  const testBudget: Budget = {
    ...budget([accOnTrack, accAtRisk, accLikelyOver, accOverspent]),
    outlook: {
      overspentCount: 1,
      likelyOverCount: 1,
      atRiskCount: 1,
      onTrackCount: 1,
      insufficientCount: 0,
      totalBudgets: 4,
      coverageCount: 4,
      projectedOverrun: 8500,
    },
  };

  // 1. Decoupled from insights: works even with null insights and insightsAvailable = false
  const summaryNoInsights = summarizeBudget(testBudget, null, false);
  expect(summaryNoInsights.configured).toBe(true);
  expect(summaryNoInsights.attentionCount).toBe(3);
  expect(summaryNoInsights.statusLabel).toBe("3 categories need attention");
  expect(summaryNoInsights.status).toBe("negative"); // overspent present -> negative

  // 2. Accounts are sorted by severity rank: overspent first, then likely-over, then at-risk
  expect(summaryNoInsights.accounts.map((a) => a.budget.account)).toEqual([
    "Expenses:Shopping",
    "Expenses:Dining",
    "Expenses:Groceries",
  ]);

  // 3. Status warning when likely-over/at-risk exist without overspent
  const warningBudget: Budget = {
    ...budget([accOnTrack, accAtRisk, accLikelyOver]),
    outlook: {
      overspentCount: 0,
      likelyOverCount: 1,
      atRiskCount: 1,
      onTrackCount: 1,
      insufficientCount: 0,
      totalBudgets: 3,
      coverageCount: 3,
      projectedOverrun: 3500,
    },
  };
  const summaryWarning = summarizeBudget(warningBudget);
  expect(summaryWarning.status).toBe("warning");
  expect(summaryWarning.statusLabel).toBe("2 categories need attention");

  // 4. Status positive when all categories on track
  const allOnTrackBudget: Budget = {
    ...budget([accOnTrack]),
    outlook: {
      overspentCount: 0,
      likelyOverCount: 0,
      atRiskCount: 0,
      onTrackCount: 1,
      insufficientCount: 0,
      totalBudgets: 1,
      coverageCount: 1,
    },
  };
  const summaryAllGood = summarizeBudget(allOnTrackBudget);
  expect(summaryAllGood.status).toBe("positive");
  expect(summaryAllGood.statusLabel).toBe("No categories need attention");
  expect(summaryAllGood.attentionCount).toBe(0);
});

test("summarizeBudget uses observedSpend instead of full-month actual when projection exists", () => {
  const accWithFuture: AccountBudget = {
    ...account("Expenses:Shopping", 11000, 10000), // actual = 11,000 (3k observed + 8k future)
    available: -1000,
    projection: {
      status: "likely-over",
      projectedSpend: 11000,
      projectedOverrun: 1000,
      source: "historical-timing",
      effectiveBudget: 10000,
      observedSpend: 3000,
      historicalSampleCount: 5,
      elapsedDays: 10,
      daysInMonth: 31,
    },
  };

  const activeBudget: Budget = {
    ...budget([accWithFuture]),
    outlook: {
      overspentCount: 0,
      likelyOverCount: 1,
      atRiskCount: 0,
      onTrackCount: 0,
      insufficientCount: 0,
      totalBudgets: 1,
      coverageCount: 1,
      projectedOverrun: 1000,
    },
  };

  const summary = summarizeBudget(activeBudget);
  // actual must be 3000 (observed spend), NOT 11000 (full-month actual including future postings)
  expect(summary.actual).toBe(3000);
  expect(summary.planned).toBe(10000);

  // Historical budget without projection continues to use actual
  const historicalAcc: AccountBudget = {
    ...account("Expenses:Shopping", 11000, 10000),
  };
  const historicalBudget: Budget = budget([historicalAcc]);
  const historicalSummary = summarizeBudget(historicalBudget);
  expect(historicalSummary.actual).toBe(11000);
});
