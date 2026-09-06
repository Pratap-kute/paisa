import dayjs, { type Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { nper, PaymentDueTime, pmt } from "./financial";
import type { GoalContributionMonth, GoalSummary } from "./goals_models";
import { now } from "./time";

dayjs.extend(customParseFormat);

export const GOAL_POLICY = {
  historyMonths: 6,
  minimumObservedMonths: 3,
  onTrackCoverage: 0.95,
  behindCoverage: 0.75,
  maximumProjectionMonths: 1200,
} as const;

export type GoalState = "active" | "completed" | "overdue";
export type GoalScheduleStatus =
  | "on-track"
  | "behind"
  | "at-risk"
  | "insufficient-data"
  | "no-deadline";
export type GoalAttention = "none" | "warning" | "critical";
export interface GoalIntelligence {
  progressRatio: number;
  remainingAmount: number;
  validTarget: boolean;
  requiredMonthlyContribution?: number;
  actualMonthlyContribution?: number;
  contributionMonthsObserved: number;
  activeContributionMonths: number;
  contributionHistory: GoalContributionMonth[];
  paceCoverage?: number;
  paceGap?: number;
  projectedCompletionDate?: Dayjs;
  configuredCompletionDate?: Dayjs;
  projectionSource?: "recent-pace" | "configured-payment" | "assumed-growth";
  delayMonths?: number;
  state: GoalState;
  scheduleStatus: GoalScheduleStatus;
  attention: GoalAttention;
  deadlineSource: "configured" | "derived-from-payment" | "none";
  targetDate?: Dayjs;
  assumptions: { annualReturn?: number };
  reasons: string[];
}

export function goalDate(value: string | undefined): Dayjs | undefined {
  if (!value) return undefined;
  const date = dayjs(value, "YYYY-MM-DD", true);
  return date.isValid() ? date : undefined;
}

export function calculateGoalProgress(current: number, target: number) {
  const validTarget = Number.isFinite(target) && target > 0 &&
    Number.isFinite(current);
  const ratio = validTarget ? current / target : 0;
  const remaining = validTarget ? Math.max(target - current, 0) : 0;
  return {
    validTarget: validTarget && Number.isFinite(ratio) &&
      Number.isFinite(remaining),
    progressRatio: Number.isFinite(ratio) ? ratio : 0,
    remainingAmount: Number.isFinite(remaining) ? remaining : 0,
  };
}

// The backend supplies zero months after activity begins. Missing months in a
// partial/older contract are not silently treated as observed zero activity.
export function contributionPace(
  history: GoalContributionMonth[] = [],
  asOf = now(),
) {
  const end = asOf.startOf("month");
  const start = end.subtract(GOAL_POLICY.historyMonths, "month");
  const months = new Map<string, GoalContributionMonth>();
  for (const item of history) {
    const month = goalDate(`${item.month}-01`);
    if (
      month && !month.isBefore(start) && month.isBefore(end) &&
      Number.isFinite(item.amount)
    ) {
      months.set(item.month, item);
    }
  }
  const series = [...months.values()].sort((a, b) =>
    a.month.localeCompare(b.month)
  );
  const average = series.length
    ? series.reduce((sum, item) => sum + item.amount / series.length, 0)
    : undefined;
  return {
    contributionHistory: series,
    contributionMonthsObserved: series.length,
    activeContributionMonths: series.filter((item) => item.amount > 0).length,
    actualMonthlyContribution: Number.isFinite(average) ? average : undefined,
  };
}

// Same beginning-of-month payment and nominal annual-rate convention as
// solvePMTOrNper. Reuse financial.ts; never infer future returns from XIRR.
export function requiredContribution(
  current: number,
  target: number,
  annualRate: number,
  deadline: Dayjs,
  asOf = now(),
) {
  if (deadline.isBefore(asOf, "day")) return undefined;
  // A deadline this month still requires the remaining payment this month.
  const months = Math.max(1, deadline.diff(asOf.startOf("month"), "month"));
  const value = pmt(
    annualRate / 1200,
    months,
    current,
    -target,
    PaymentDueTime.Begin,
  );
  return Number.isFinite(value) ? Math.max(0, value) : undefined;
}

export function projectedCompletion(
  current: number,
  target: number,
  annualRate: number,
  payment: number,
  asOf = now(),
) {
  if (current >= target) return asOf.startOf("day");
  if (payment === 0 && annualRate === 0) return undefined;
  const months = nper(
    annualRate / 1200,
    payment,
    current,
    -target,
    PaymentDueTime.Begin,
  );
  if (
    !Number.isFinite(months) || months <= 0 ||
    months > GOAL_POLICY.maximumProjectionMonths
  ) return undefined;
  const date = asOf.startOf("month").add(Math.ceil(months), "month");
  return date.isValid() ? date : undefined;
}

export function classifyGoalSchedule(coverage: number): GoalScheduleStatus {
  if (!Number.isFinite(coverage)) return "insufficient-data";
  if (coverage >= GOAL_POLICY.onTrackCoverage) return "on-track";
  if (coverage >= GOAL_POLICY.behindCoverage) return "behind";
  return "at-risk";
}

export function analyzeGoal(goal: GoalSummary, asOf = now()): GoalIntelligence {
  const progress = calculateGoalProgress(goal.current, goal.target);
  const retirement = goal.type === "retirement";
  const deadline = retirement ? undefined : goalDate(goal.targetDate);
  const result: GoalIntelligence = {
    ...progress,
    ...contributionPace(retirement ? [] : goal.contributionHistory, asOf),
    state: progress.validTarget && goal.current >= goal.target
      ? "completed"
      : "active",
    scheduleStatus: deadline ? "insufficient-data" : "no-deadline",
    attention: "none",
    deadlineSource: deadline
      ? "configured"
      : !retirement && (goal.paymentPerPeriod ?? 0) > 0
      ? "derived-from-payment"
      : "none",
    targetDate: deadline,
    assumptions: {},
    reasons: [],
  };
  if (!progress.validTarget) {
    result.reasons.push(
      "A valid positive target and current balance are needed",
    );
  }
  if (retirement || !progress.validTarget) {
    return result;
  }
  const rate = goal.rate ?? 0;
  const validRate = Number.isFinite(rate) && rate > -100 && rate <= 100;
  if (validRate) result.assumptions.annualReturn = rate;
  if (result.state === "completed") return result;
  if (deadline?.isBefore(asOf, "day")) {
    result.state = "overdue";
    result.attention = "critical";
    result.reasons.push("Target date has passed");
  }
  if (!validRate) {
    result.reasons.push(
      "Expected annual return must be greater than -100% and at most 100%",
    );
    return result;
  }
  const configuredPayment = goal.paymentPerPeriod;
  if (
    !deadline && configuredPayment !== undefined &&
    Number.isFinite(configuredPayment) && configuredPayment > 0
  ) {
    result.configuredCompletionDate = projectedCompletion(
      goal.current,
      goal.target,
      rate,
      configuredPayment,
      asOf,
    );
  }
  if (deadline && result.state !== "overdue") {
    result.requiredMonthlyContribution = requiredContribution(
      goal.current,
      goal.target,
      rate,
      deadline,
      asOf,
    );
  }
  const actual = result.actualMonthlyContribution;
  const required = result.requiredMonthlyContribution;
  if (actual !== undefined && required !== undefined) {
    const gap = Math.max(required - actual, 0);
    if (Number.isFinite(gap)) result.paceGap = gap;
    if (required > 0 && Number.isFinite(actual / required)) {
      result.paceCoverage = actual / required;
    }
  }
  const reliable =
    result.contributionMonthsObserved >= GOAL_POLICY.minimumObservedMonths;
  if (deadline && result.state !== "overdue") {
    if (required === 0) result.scheduleStatus = "on-track";
    else if (reliable && result.paceCoverage !== undefined) {
      result.scheduleStatus = classifyGoalSchedule(result.paceCoverage);
    } else result.reasons.push("More contribution history needed");
    if (result.scheduleStatus === "at-risk") result.attention = "critical";
    if (result.scheduleStatus === "behind") result.attention = "warning";
  }
  // A short lump sum cannot create a confident actual-pace projection. Without
  // a deadline, the configured payment can still supply a clearly labelled plan.
  const payment = reliable
    ? actual
    : !deadline
    ? goal.paymentPerPeriod
    : undefined;
  if (payment !== undefined && Number.isFinite(payment)) {
    result.projectedCompletionDate = projectedCompletion(
      goal.current,
      goal.target,
      rate,
      payment,
      asOf,
    );
    result.projectionSource = reliable ? "recent-pace" : "configured-payment";
  } else if (required === 0) {
    result.projectedCompletionDate = projectedCompletion(
      goal.current,
      goal.target,
      rate,
      0,
      asOf,
    );
    result.projectionSource = "assumed-growth";
  }
  if (deadline && result.projectedCompletionDate) {
    result.delayMonths = Math.max(
      0,
      result.projectedCompletionDate.startOf("month").diff(
        deadline.startOf("month"),
        "month",
      ),
    );
  }
  return result;
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

export function summarizeGoalHealth(goals: GoalSummary[], asOf = now()) {
  const analyzed = goals.map((goal) => ({
    goal,
    analysis: analyzeGoal(goal, asOf),
  }));
  const severity = (analysis: GoalIntelligence) =>
    analysis.state === "overdue"
      ? 3
      : analysis.scheduleStatus === "at-risk"
      ? 2
      : 1;
  const attention = analyzed.filter(({ goal, analysis }) =>
    goal.type === "savings" && analysis.attention !== "none"
  )
    .sort((a, b) =>
      severity(b.analysis) - severity(a.analysis) ||
      b.goal.priority - a.goal.priority ||
      a.goal.name.localeCompare(b.goal.name)
    );
  const total = analyzed.reduce(
    (sum, { analysis }) =>
      sum +
      (analysis.state === "active"
        ? analysis.requiredMonthlyContribution ?? 0
        : 0),
    0,
  );
  return {
    analyzed,
    attention,
    active:
      analyzed.filter(({ analysis }) => analysis.state !== "completed").length,
    onTrack:
      analyzed.filter(({ analysis }) =>
        analysis.state === "active" && analysis.scheduleStatus === "on-track"
      ).length,
    requiredMonthlyContribution: Number.isFinite(total) ? total : undefined,
  };
}
