import dayjs, { type Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import type { GoalIntelligenceData, GoalSummary } from "./goals_models";

dayjs.extend(customParseFormat);

// The backend owns the goal analysis (progress, required contribution, pace,
// projected completion and schedule status). This module only converts it into
// the shape the views use and words the status.
export type GoalState = GoalIntelligenceData["state"];
export type GoalScheduleStatus = GoalIntelligenceData["scheduleStatus"];
export type GoalAttention = GoalIntelligenceData["attention"];
export interface GoalIntelligence extends Omit<
  GoalIntelligenceData,
  | "projectedCompletionDate"
  | "configuredCompletionDate"
  | "targetDate"
  | "annualReturn"
> {
  projectedCompletionDate?: Dayjs;
  configuredCompletionDate?: Dayjs;
  targetDate?: Dayjs;
  assumptions: { annualReturn?: number };
}

const UNAVAILABLE: GoalIntelligenceData = {
  progressRatio: 0,
  remainingAmount: 0,
  validTarget: false,
  contributionMonthsObserved: 0,
  activeContributionMonths: 0,
  state: "active",
  scheduleStatus: "no-deadline",
  attention: "none",
  deadlineSource: "none",
  reasons: ["Goal analysis is unavailable"],
};

function goalDate(value: string | undefined): Dayjs | undefined {
  if (!value) return undefined;
  const date = dayjs(value, "YYYY-MM-DD", true);
  return date.isValid() ? date : undefined;
}

export function analyzeGoal(goal: GoalSummary): GoalIntelligence {
  const { annualReturn, ...data } = goal.intelligence ?? UNAVAILABLE;
  return {
    ...data,
    projectedCompletionDate: goalDate(data.projectedCompletionDate),
    configuredCompletionDate: goalDate(data.configuredCompletionDate),
    targetDate: goalDate(data.targetDate),
    assumptions: { annualReturn },
  };
}

export function goalStatusLabel(
  goal: GoalSummary,
  analysis: GoalIntelligence,
): string {
  if (!analysis.validTarget) return "Target unavailable";
  if (analysis.state === "completed") {
    return goal.type === "retirement" ? "Target funded" : "Goal reached";
  }
  if (analysis.state === "overdue") return "Target date has passed";
  if (goal.type === "retirement") return "Tracking";
  return {
    "on-track": "On track",
    behind: "Behind plan",
    "at-risk": "At risk",
    "insufficient-data": "More contribution history needed",
    "no-deadline": "No deadline configured",
  }[analysis.scheduleStatus];
}

export function goalStatusShortLabel(
  goal: GoalSummary,
  analysis: GoalIntelligence,
): string {
  if (!analysis.validTarget) return "Unavailable";
  if (analysis.state === "overdue") return "Overdue";
  if (analysis.state === "active" && goal.type === "savings") {
    if (analysis.scheduleStatus === "insufficient-data") return "More history";
    if (analysis.scheduleStatus === "no-deadline") return "No deadline";
  }
  return goalStatusLabel(goal, analysis);
}

export function summarizeGoalHealth(goals: GoalSummary[]) {
  const analyzed = goals.map((goal) => ({
    goal,
    analysis: analyzeGoal(goal),
  }));
  const severity = (analysis: GoalIntelligence) =>
    analysis.state === "overdue"
      ? 3
      : analysis.scheduleStatus === "at-risk"
        ? 2
        : 1;
  const attention = analyzed
    .filter(
      ({ goal, analysis }) =>
        goal.type === "savings" && analysis.attention !== "none",
    )
    .sort(
      (a, b) =>
        severity(b.analysis) - severity(a.analysis) ||
        b.goal.priority - a.goal.priority ||
        a.goal.name.localeCompare(b.goal.name),
    );
  const total = analyzed.reduce(
    (sum, { analysis }) =>
      sum +
      (analysis.state === "active"
        ? (analysis.requiredMonthlyContribution ?? 0)
        : 0),
    0,
  );
  return {
    analyzed,
    attention,
    active: analyzed.filter(({ analysis }) => analysis.state !== "completed")
      .length,
    onTrack: analyzed.filter(
      ({ analysis }) =>
        analysis.state === "active" && analysis.scheduleStatus === "on-track",
    ).length,
    requiredMonthlyContribution: Number.isFinite(total) ? total : undefined,
  };
}
