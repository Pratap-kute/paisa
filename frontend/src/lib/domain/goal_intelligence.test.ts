import { expect } from "@std/expect";
import { describe, it } from "@std/testing/bdd";
import dayjs from "dayjs";
import {
  analyzeGoal,
  calculateGoalProgress,
  classifyGoalSchedule,
  contributionPace,
  goalStatusLabel,
  projectedCompletion,
  requiredContribution,
  summarizeGoalHealth,
} from "./goal_intelligence.ts";
import "dayjs/plugin/isSameOrBefore.js";
import { PaymentDueTime, pmt } from "./financial.ts";
import { setNow } from "./time.ts";
import type { GoalSummary } from "./goals_models.ts";

const asOf = dayjs("2026-09-05");
function goal(overrides: Partial<GoalSummary> = {}): GoalSummary {
  return {
    type: "savings",
    id: "house",
    name: "House",
    icon: "",
    current: 240000,
    target: 600000,
    targetDate: "2027-03-31",
    rate: 0,
    priority: 1,
    contributionHistory: ["2026-06", "2026-07", "2026-08"].map((month) => ({
      month,
      amount: 60000,
    })),
    ...overrides,
  };
}
describe("goal intelligence", () => {
  it("uses the existing beginning-of-month financial formulas", () => {
    setNow(asOf);
    const input = goal({ rate: 7 });
    const health = analyzeGoal(input, asOf);
    expect(health.requiredMonthlyContribution).toBeCloseTo(
      pmt(7 / 1200, 6, input.current, -input.target, PaymentDueTime.Begin),
      8,
    );
    expect(health.assumptions.annualReturn).toBe(7);
    expect(requiredContribution(240000, 600000, 0, dayjs("2027-03-31"), asOf))
      .toBe(60000);
  });
  it("calculates pace, coverage, gap, completion and calendar-month delay", () => {
    const health = analyzeGoal(
      goal({
        contributionHistory: ["2026-06", "2026-07", "2026-08"].map((month) => ({
          month,
          amount: 48000,
        })),
      }),
      asOf,
    );
    expect(health.actualMonthlyContribution).toBe(48000);
    expect(health.paceCoverage).toBe(0.8);
    expect(health.paceGap).toBe(12000);
    expect(health.scheduleStatus).toBe("behind");
    expect(health.projectedCompletionDate?.format("YYYY-MM-DD")).toBe(
      "2027-05-01",
    );
    expect(health.delayMonths).toBe(2);
    expect(health.attention).toBe("warning");
  });
  for (
    const [coverage, status] of [
      [1, "on-track"],
      [0.95, "on-track"],
      [0.94999, "behind"],
      [0.75, "behind"],
      [0.74999, "at-risk"],
      [0, "at-risk"],
      [-1, "at-risk"],
      [NaN, "insufficient-data"],
    ] as const
  ) {
    it(`classifies coverage ${coverage} as ${status}`, () =>
      expect(classifyGoalSchedule(coverage)).toBe(status));
  }
  it("keeps zero months in the denominator and excludes the current month", () => {
    const pace = contributionPace([
      { month: "2026-06", amount: 10000 },
      { month: "2026-07", amount: 0 },
      { month: "2026-08", amount: 10000 },
      { month: "2026-09", amount: 900000 },
      { month: "2025-01", amount: 900000 },
    ], asOf);
    expect(pace.contributionMonthsObserved).toBe(3);
    expect(pace.activeContributionMonths).toBe(2);
    expect(pace.actualMonthlyContribution).toBeCloseTo(20000 / 3);
  });
  it("cannot classify a recent lump sum confidently", () => {
    for (const count of [0, 1, 2]) {
      const health = analyzeGoal(
        goal({
          contributionHistory: goal().contributionHistory?.slice(0, count).map(
            (m) => ({ ...m, amount: 1000000 }),
          ),
        }),
        asOf,
      );
      expect(health.scheduleStatus).toBe("insufficient-data");
      expect(health.attention).toBe("none");
      expect(health.requiredMonthlyContribution).toBe(60000);
      expect(health.projectedCompletionDate).toBeUndefined();
    }
  });
  it("treats no contributions and withdrawals as at risk without inventing a completion date", () => {
    for (const amount of [0, -20000]) {
      const health = analyzeGoal(
        goal({
          contributionHistory: goal().contributionHistory?.map((m) => ({
            ...m,
            amount,
          })),
        }),
        asOf,
      );
      expect(health.scheduleStatus).toBe("at-risk");
      expect(health.projectedCompletionDate).toBeUndefined();
    }
  });
  it("does not warn about contributions when assumed growth funds the target", () => {
    const health = analyzeGoal(
      goal({ current: 590000, rate: 10, contributionHistory: [] }),
      asOf,
    );
    expect(health.requiredMonthlyContribution).toBe(0);
    expect(health.scheduleStatus).toBe("on-track");
    expect(health.attention).toBe("none");
    expect(health.paceCoverage).toBeUndefined();
  });
  it("distinguishes today from yesterday and uses one payment for this month", () => {
    const today = analyzeGoal(goal({ targetDate: "2026-09-05" }), asOf);
    expect(today.state).toBe("active");
    expect(today.requiredMonthlyContribution).toBe(360000);
    const yesterday = analyzeGoal(goal({ targetDate: "2026-09-04" }), asOf);
    expect(yesterday.state).toBe("overdue");
    expect(yesterday.attention).toBe("critical");
    expect(yesterday.requiredMonthlyContribution).toBeUndefined();
  });
  it("completion overrides an overdue deadline and keeps raw progress above 100%", () => {
    for (const current of [600000, 720000]) {
      const g = goal({ current, targetDate: "2020-01-01" });
      const health = analyzeGoal(g, asOf);
      expect(health.state).toBe("completed");
      expect(health.attention).toBe("none");
      expect(health.progressRatio).toBe(current / 600000);
      expect(health.remainingAmount).toBe(0);
      expect(goalStatusLabel(g, health)).toBe("Goal reached");
    }
  });
  it("never turns a payment-derived projection into a deadline", () => {
    for (const targetDate of ["", "invalid", "2026-02-30"]) {
      const health = analyzeGoal(
        goal({ targetDate, paymentPerPeriod: 15000, contributionHistory: [] }),
        asOf,
      );
      expect(health.scheduleStatus).toBe("no-deadline");
      expect(health.deadlineSource).toBe("derived-from-payment");
      expect(health.state).toBe("active");
      expect(health.projectionSource).toBe("configured-payment");
      expect(health.projectedCompletionDate?.format("YYYY-MM")).toBe("2028-09");
    }
    expect(
      analyzeGoal(goal({ targetDate: "", paymentPerPeriod: 0 }), asOf)
        .deadlineSource,
    ).toBe("none");
  });
  it("handles invalid targets, current values, expected returns and unbounded projections", () => {
    for (
      const target of [0, -1, NaN, Infinity, undefined as unknown as number]
    ) {
      const health = analyzeGoal(goal({ target }), asOf);
      expect(health.validTarget).toBe(false);
      expect(health.attention).toBe("none");
      expect(Number.isFinite(health.progressRatio)).toBe(true);
    }
    for (const current of [NaN, Infinity]) {
      expect(calculateGoalProgress(current, 600000).validTarget).toBe(false);
    }
    expect(calculateGoalProgress(-100, 100)).toMatchObject({
      progressRatio: -1,
      remainingAmount: 200,
    });
    for (const rate of [NaN, Infinity, -100, 1000]) {
      const health = analyzeGoal(goal({ rate }), asOf);
      expect(health.scheduleStatus).toBe("insufficient-data");
      expect(health.requiredMonthlyContribution).toBeUndefined();
      expect(health.reasons.length).toBeGreaterThan(0);
    }
    expect(projectedCompletion(0, 600000, 0, 0, asOf)).toBeUndefined();
    expect(projectedCompletion(0, 600000, 0, 0.01, asOf)).toBeUndefined();
  });
  it("keeps retirement funding separate from savings schedules", () => {
    for (const source of ["historical", "configured"] as const) {
      for (const current of [240000, 600000, 720000]) {
        const g = goal({
          type: "retirement",
          current,
          targetDate: "2000-01-01",
          swr: 4,
          yearlyExpense: 24000,
          yearlyExpenseSource: source,
        });
        const health = analyzeGoal(g, asOf);
        expect(health.scheduleStatus).toBe("no-deadline");
        expect(health.attention).toBe("none");
        expect(health.deadlineSource).toBe("none");
        expect(health.requiredMonthlyContribution).toBeUndefined();
        expect(goalStatusLabel(g, health)).toBe(
          current >= 600000 ? "Target funded" : "Tracking",
        );
      }
    }
  });
  it("orders attention by severity then user priority, and sums only active dated savings", () => {
    const slow = goal({
      id: "slow",
      priority: 100,
      contributionHistory: goal().contributionHistory?.map((m) => ({
        ...m,
        amount: 10000,
      })),
    });
    const overdue = goal({
      id: "overdue",
      priority: 0,
      targetDate: "2026-09-01",
    });
    const behind = goal({
      id: "behind",
      priority: 500,
      contributionHistory: goal().contributionHistory?.map((m) => ({
        ...m,
        amount: 48000,
      })),
    });
    const summary = summarizeGoalHealth([
      behind,
      slow,
      overdue,
      goal({ id: "none", targetDate: "" }),
      goal({ id: "retirement", type: "retirement" }),
      goal({ id: "done", current: 600000 }),
    ], asOf);
    expect(summary.attention.map((x) => x.goal.id)).toEqual([
      "overdue",
      "slow",
      "behind",
    ]);
    expect(summary.requiredMonthlyContribution).toBe(120000);
    expect(behind.priority).toBe(500);
    expect(summarizeGoalHealth([], asOf).active).toBe(0);
  });
});
