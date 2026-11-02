import type { Dayjs } from "dayjs";
import type { Posting } from "#lib/domain/ledger";
import type { AssetBreakdown } from "#lib/domain/assets";
export interface Point {
  date: Dayjs;
  value: number;
}

export interface Forecast {
  date: Dayjs;
  value: number;
  error: number;
}

export interface RetirementGoalProgress {
  target?: number;
  yearlyExpenseSource?: "configured" | "historical";
  savingsTotal: number;
  investmentTotal: number;
  gainTotal: number;
  savingsTimeline: Point[];
  swr: number;
  yearlyExpense: number;
  xirr: number;
  name: string;
  type: string;
  icon: string;
  postings: Posting[];
  balances: Record<string, AssetBreakdown>;
  intelligence?: GoalIntelligenceData;
}

export interface SavingsGoalProgress {
  contributionHistory?: GoalContributionMonth[];
  investmentTotal: number;
  gainTotal: number;
  savingsTotal: number;
  savingsTimeline: Point[];
  target: number;
  targetDate: string;
  rate: number;
  xirr: number;
  postings: Posting[];
  name: string;
  type: string;
  icon: string;
  paymentPerPeriod: number;
  balances: Record<string, AssetBreakdown>;
  intelligence?: GoalIntelligenceData;
}

// Analysis of a goal computed by the backend. Dates are YYYY-MM-DD strings.
export interface GoalIntelligenceData {
  progressRatio: number;
  remainingAmount: number;
  validTarget: boolean;
  requiredMonthlyContribution?: number;
  actualMonthlyContribution?: number;
  contributionMonthsObserved: number;
  activeContributionMonths: number;
  paceCoverage?: number;
  paceGap?: number;
  projectedCompletionDate?: string;
  configuredCompletionDate?: string;
  projectionSource?: "recent-pace" | "configured-payment" | "assumed-growth";
  delayMonths?: number;
  state: "active" | "completed" | "overdue";
  scheduleStatus:
    "on-track" | "behind" | "at-risk" | "insufficient-data" | "no-deadline";
  attention: "none" | "warning" | "critical";
  deadlineSource: "configured" | "derived-from-payment" | "none";
  targetDate?: string;
  annualReturn?: number;
  reasons: string[];
}

export interface GoalSummary {
  type: string;
  name: string;
  id: string;
  icon: string;
  current: number;
  target: number;
  targetDate: string;
  priority: number;
  contributionHistory?: GoalContributionMonth[];
  rate?: number;
  paymentPerPeriod?: number;
  swr?: number;
  yearlyExpense?: number;
  yearlyExpenseSource?: "configured" | "historical";
  intelligence?: GoalIntelligenceData;
}

export interface GoalContributionMonth {
  month: string;
  amount: number;
}
