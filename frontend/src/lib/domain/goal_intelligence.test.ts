import { describe, expect, it } from "bun:test";
import {
  analyzeGoal,
  goalStatusLabel,
  goalStatusShortLabel,
  summarizeGoalHealth,
} from "./goal_intelligence.ts";
import { goal } from "./testing/goal_fixtures.ts";

// The analysis itself (pace, coverage, projections) is computed and tested in
// the backend; these tests cover how it is read and worded.
describe("goal intelligence", () => {
  it("parses the backend dates and keeps the numbers as supplied", () => {
    const health = analyzeGoal(goal("behind"));
    expect(health.scheduleStatus).toBe("behind");
    expect(health.attention).toBe("warning");
    expect(health.requiredMonthlyContribution).toBe(60000);
    expect(health.actualMonthlyContribution).toBe(48000);
    expect(health.projectedCompletionDate?.format("YYYY-MM-DD")).toBe(
      "2027-05-01",
    );
    expect(health.targetDate?.format("YYYY-MM-DD")).toBe("2027-03-31");
    expect(health.delayMonths).toBe(2);
  });

  it("exposes the assumed return only when the backend supplies one", () => {
    expect(analyzeGoal(goal("onTrack")).assumptions.annualReturn).toBe(0);
    const withoutRate = goal("onTrack");
    delete withoutRate.intelligence?.annualReturn;
    expect(analyzeGoal(withoutRate).assumptions.annualReturn).toBeUndefined();
  });

  it("is safe when the analysis is missing", () => {
    const health = analyzeGoal(goal("onTrack", { intelligence: undefined }));
    expect(health.validTarget).toBe(false);
    expect(health.attention).toBe("none");
    expect(health.reasons.length).toBeGreaterThan(0);
    expect(goalStatusLabel(goal(), health)).toBe("Target unavailable");
  });

  it("words each status", () => {
    const label = (scenario: Parameters<typeof goal>[0], type = "savings") => {
      const g = goal(scenario, { type });
      return goalStatusLabel(g, analyzeGoal(g));
    };
    expect(label("onTrack")).toBe("On track");
    expect(label("behind")).toBe("Behind plan");
    expect(label("atRisk")).toBe("At risk");
    expect(label("shortHistory")).toBe("More contribution history needed");
    expect(label("noDeadlineNoPay")).toBe("No deadline configured");
    expect(label("overdue")).toBe("Target date has passed");
    expect(label("completed")).toBe("Goal reached");
    expect(label("retirementActive", "retirement")).toBe("Tracking");
    expect(label("retirementFunded", "retirement")).toBe("Target funded");

    const history = goal("shortHistory");
    expect(goalStatusShortLabel(history, analyzeGoal(history))).toBe(
      "More history",
    );
    const none = goal("noDeadlineNoPay");
    expect(goalStatusShortLabel(none, analyzeGoal(none))).toBe("No deadline");
  });

  it("orders attention by severity then priority and sums only active required pace", () => {
    const slow = goal("atRisk", { id: "slow", priority: 100 });
    const overdue = goal("overdue", { id: "overdue", priority: 0 });
    const behind = goal("behind", { id: "behind", priority: 500 });
    const summary = summarizeGoalHealth([
      behind,
      slow,
      overdue,
      goal("noHistory", { id: "none" }),
      goal("retirementActive", { id: "retirement", type: "retirement" }),
      goal("completedExact", { id: "done" }),
    ]);
    expect(summary.attention.map((x) => x.goal.id)).toEqual([
      "overdue",
      "slow",
      "behind",
    ]);
    // behind + slow + none are active with a required pace; overdue is not.
    expect(summary.requiredMonthlyContribution).toBe(180000);
    expect(summary.active).toBe(5);
    expect(summary.onTrack).toBe(0);
    expect(summarizeGoalHealth([]).active).toBe(0);
  });
});
