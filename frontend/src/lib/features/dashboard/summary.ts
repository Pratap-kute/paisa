import type { AssetBreakdown, Networth } from "$lib/domain/assets";
import type { AccountBudget, Budget } from "$lib/domain/cash_flow";
import type { Insight } from "$lib/domain/insights";
import type { GoalSummary } from "$lib/domain/goals_models";
import type { Posting } from "$lib/domain/ledger";
import type { TransactionSequence } from "$lib/domain/recurring";
import { now } from "$lib/domain/time";
import { totalRecurring } from "$lib/domain/transaction_sequence";
import {
  type InsightTone,
  presentInsight,
} from "$lib/features/insights/presentation";
import { formatCurrency } from "$lib/shared/formatters/currency";
import { iconGlyphOr } from "$lib/shared/ui/icon";
import dayjs, { type Dayjs } from "dayjs";

export type MetricStatus =
  | "neutral"
  | "positive"
  | "negative"
  | "warning"
  | "primary";

export interface DashboardTrend {
  text: string;
  status: MetricStatus;
}

export interface CashSummary {
  available: boolean;
  total: number;
  count: number;
  status: MetricStatus;
  accounts: AssetBreakdown[];
}

export interface BudgetSummary {
  configured: boolean;
  actual: number;
  planned: number;
  attentionCount: number;
  statusLabel: string;
  status: MetricStatus;
  accounts: Array<{ budget: AccountBudget; insight: Insight }>;
}

export interface DashboardInsightsSummary {
  attentionCount: number;
  preview?: Insight;
}

export interface DashboardAttentionItem {
  id: string;
  kind: "insight" | "budget" | "recurring" | "goal" | "cash";
  title: string;
  detail?: string;
  icon: string;
  iconIsGlyph?: boolean;
  status: MetricStatus;
  href: string;
  priority: number;
}

export interface ExpensePace {
  projectedExpenses: number;
  overBudget?: number;
  status: MetricStatus;
}

export interface UpcomingRecurringSummary {
  horizonDays: number;
  upcomingAmount: number;
  upcomingCount: number;
  pastDueAmount: number;
  pastDueCount: number;
  earliestDueDate?: Dayjs;
  cashAfterUpcoming?: number;
}

export interface DashboardAttentionInput {
  insights?: Insight[] | null;
  recurring: UpcomingRecurringSummary;
  goals?: GoalSummary[] | null;
  asOf: Dayjs;
  isPartial?: boolean;
  comparisonPeriod?: string;
}

export const MIN_EXPENSE_PROJECTION_DAYS = 3;
export const DEFAULT_RECURRING_HORIZON_DAYS = 14;

const attentionSeverities = new Set(["critical", "warning"]);
const budgetInsightTypes = new Set(["budget_overspent", "budget_risk"]);

function toneToMetricStatus(tone: InsightTone): MetricStatus {
  if (tone === "critical") return "negative";
  if (tone === "info") return "neutral";
  return tone;
}

function insightKey(insight: Insight): string {
  return insight.id || `${insight.type}:${insight.account ?? ""}`;
}

function sortInsights(insights: Insight[]): Insight[] {
  return insights.slice().sort((left, right) =>
    (right.score ?? 0) - (left.score ?? 0) ||
    insightKey(left).localeCompare(insightKey(right))
  );
}

function isOutgoingRecurring(sequence: TransactionSequence): boolean {
  const postings = sequence.transactions[0]?.postings ?? [];
  const hasObligation = postings.some((posting) =>
    posting.amount > 0 &&
    (posting.account.startsWith("Expenses:") ||
      posting.account.startsWith("Liabilities:"))
  );
  const fundedFromAsset = postings.some((posting) =>
    posting.amount < 0 && posting.account.startsWith("Assets:")
  );
  return hasObligation && fundedFromAsset;
}

export function buildExpensePace(
  currentMonthExpenses: number,
  period: string,
  asOf: Dayjs | null | undefined,
  plannedBudget?: number,
): ExpensePace | undefined {
  const currentDate = asOf?.isValid() ? asOf : now();
  if (
    period !== currentDate.format("YYYY-MM") ||
    !Number.isFinite(currentMonthExpenses) ||
    currentMonthExpenses <= 0
  ) return undefined;

  const elapsedDays = currentDate.date();
  const daysInMonth = currentDate.daysInMonth();
  if (
    elapsedDays < MIN_EXPENSE_PROJECTION_DAYS ||
    elapsedDays > daysInMonth ||
    daysInMonth <= 0
  ) return undefined;

  const projectedExpenses = currentMonthExpenses / elapsedDays * daysInMonth;
  if (!Number.isFinite(projectedExpenses)) return undefined;
  const validBudget = Number.isFinite(plannedBudget) &&
    (plannedBudget ?? 0) > 0;
  const overBudget = validBudget && projectedExpenses > plannedBudget!
    ? projectedExpenses - plannedBudget!
    : undefined;
  return {
    projectedExpenses,
    overBudget,
    status: overBudget === undefined ? "neutral" : "warning",
  };
}

export function summarizeUpcomingRecurring(
  sequences: TransactionSequence[] | null | undefined,
  asOf: Dayjs,
  cashBalance?: number,
  horizonDays = DEFAULT_RECURRING_HORIZON_DAYS,
): UpcomingRecurringSummary {
  const summary: UpcomingRecurringSummary = {
    horizonDays,
    upcomingAmount: 0,
    upcomingCount: 0,
    pastDueAmount: 0,
    pastDueCount: 0,
  };
  if (!asOf.isValid() || horizonDays < 0) return summary;

  const start = asOf.startOf("day");
  const end = start.add(horizonDays, "day").endOf("day");
  for (const sequence of sequences ?? []) {
    if (!isOutgoingRecurring(sequence)) continue;
    const schedules = sequence.schedules ?? [
      ...(sequence.pastSchedules ?? []),
      ...(sequence.futureSchedules ?? []),
    ];
    const defaultAmount = totalRecurring(sequence);
    for (const schedule of schedules) {
      if (schedule.actual) continue;
      const due = schedule.scheduled;
      const amount = Number.isFinite(schedule.amount) && schedule.amount > 0
        ? schedule.amount
        : defaultAmount;
      if (!due?.isValid() || !Number.isFinite(amount) || amount <= 0) continue;
      if (due.isBefore(start, "day")) {
        summary.pastDueCount++;
        summary.pastDueAmount += amount;
        continue;
      }
      if (due.isAfter(end, "day")) continue;
      summary.upcomingCount++;
      summary.upcomingAmount += amount;
      if (!summary.earliestDueDate || due.isBefore(summary.earliestDueDate)) {
        summary.earliestDueDate = due;
      }
    }
  }
  if (Number.isFinite(cashBalance)) {
    summary.cashAfterUpcoming = cashBalance! - summary.upcomingAmount;
  }
  return summary;
}

export function buildDashboardAttention(
  input: DashboardAttentionInput,
  limit = 3,
): DashboardAttentionItem[] {
  const allInsights = input.insights ?? [];
  const budgetTypes = new Set(["budget_overspent", "budget_risk"]);
  const seenInsights = new Set<string>();
  const seenBudgetAccounts = new Set<string>();
  const result: DashboardAttentionItem[] = [];

  const addInsights = (candidates: Insight[], priority: number) => {
    for (const insight of sortInsights(candidates)) {
      const key = insightKey(insight);
      if (seenInsights.has(key)) continue;
      const isBudget = budgetTypes.has(insight.type);
      const budgetAccount = insight.account ?? "";
      if (isBudget && seenBudgetAccounts.has(budgetAccount)) continue;
      const presentation = presentInsight(
        insight,
        input.isPartial,
        input.comparisonPeriod,
      );
      seenInsights.add(key);
      if (isBudget) seenBudgetAccounts.add(budgetAccount);
      result.push({
        id: `insight:${key}`,
        kind: isBudget ? "budget" : "insight",
        title: presentation.title,
        detail: presentation.description || undefined,
        icon: presentation.icon,
        status: insight.severity === "critical"
          ? "negative"
          : insight.severity === "warning"
          ? "warning"
          : toneToMetricStatus(presentation.tone),
        href: presentation.href || "/insights",
        priority,
      });
    }
  };

  addInsights(
    allInsights.filter((insight) => insight.severity === "critical"),
    700,
  );
  if (input.recurring.pastDueCount > 0) {
    const count = input.recurring.pastDueCount;
    result.push({
      id: "recurring:past-due",
      kind: "recurring",
      title: `${count} recurring ${
        count === 1 ? "payment is" : "payments are"
      } past due`,
      detail: input.recurring.pastDueAmount > 0
        ? `${formatCurrency(input.recurring.pastDueAmount)} overdue`
        : undefined,
      icon: "fa-solid fa-clock-rotate-left",
      status: "negative",
      href: "/cash_flow/recurring",
      priority: 600,
    });
  }
  addInsights(
    allInsights.filter((insight) =>
      insight.severity === "warning" && !budgetTypes.has(insight.type)
    ),
    500,
  );
  addInsights(
    allInsights.filter((insight) =>
      insight.severity === "warning" && budgetTypes.has(insight.type)
    ),
    400,
  );
  if (
    input.recurring.upcomingAmount > 0 &&
    input.recurring.cashAfterUpcoming !== undefined &&
    input.recurring.cashAfterUpcoming < 0
  ) {
    result.push({
      id: "cash:recurring-shortfall",
      kind: "cash",
      title: "Upcoming payments exceed available cash",
      detail: `${
        formatCurrency(input.recurring.upcomingAmount)
      } due in the next ${input.recurring.horizonDays} days · ${
        formatCurrency(Math.abs(input.recurring.cashAfterUpcoming))
      } short`,
      icon: "fa-solid fa-wallet",
      status: "negative",
      href: "/cash_flow/recurring",
      priority: 300,
    });
  }

  const overdueGoals = (input.goals ?? []).filter((goal) => {
    const targetDate = goal.targetDate ? dayjs(goal.targetDate) : null;
    return targetDate?.isValid() && targetDate.isBefore(input.asOf, "day") &&
      Number.isFinite(goal.current) && Number.isFinite(goal.target) &&
      goal.current < goal.target;
  }).sort((left, right) =>
    left.targetDate.localeCompare(right.targetDate) ||
    left.name.localeCompare(right.name)
  );
  for (const goal of overdueGoals) {
    result.push({
      id: `goal:overdue:${goal.id || `${goal.type}:${goal.name}`}`,
      kind: "goal",
      title: `${goal.name} goal is overdue`,
      detail: `${formatCurrency(goal.current)} of ${
        formatCurrency(goal.target)
      } completed`,
      icon: iconGlyphOr(goal.icon),
      iconIsGlyph: true,
      status: "warning",
      href: `/more/goals/${goal.type}/${encodeURIComponent(goal.name)}`,
      priority: 200,
    });
  }
  return result.slice(0, Math.max(0, limit));
}

export function periodUrl(path: string, period: string): string {
  return `${path}?period=${encodeURIComponent(period)}`;
}

export function summarizeCash(
  balances: Record<string, AssetBreakdown> | null | undefined,
  limit = 3,
): CashSummary {
  const accounts = Object.values(balances ?? {}).sort((left, right) =>
    right.marketAmount - left.marketAmount ||
    left.group.localeCompare(right.group)
  );
  const total = accounts.reduce(
    (sum, account) => sum + account.marketAmount,
    0,
  );
  return {
    available: accounts.length > 0,
    total,
    count: accounts.length,
    status: total < 0 ? "negative" : "neutral",
    accounts: accounts.slice(0, limit),
  };
}

export function currentExpenses(
  expenses: Record<string, Posting[]> | null | undefined,
  period: string,
): Posting[] {
  return expenses?.[period] ?? [];
}

export function selectInsight(
  insights: Insight[] | null | undefined,
  type: string,
): Insight | undefined {
  return insights?.find((insight) => insight.type === type);
}

export function buildNetWorthTrend(
  networth: Networth | null | undefined,
  insights: Insight[] | null | undefined,
): DashboardTrend | undefined {
  if (!networth) return undefined;
  const insight = selectInsight(insights, "networth_change");
  if (!insight) return undefined;
  const presentation = presentInsight(insight);
  return presentation.heroMetric
    ? {
      text: `${presentation.heroMetric} this month`,
      status: Number(insight.change ?? 0) < 0 ? "negative" : "positive",
    }
    : undefined;
}

export function buildExpenseTrend(
  insights: Insight[] | null | undefined,
  isPartial?: boolean,
  comparisonPeriod?: string,
): DashboardTrend | undefined {
  const insight = selectInsight(insights, "expense_change");
  if (!insight) return undefined;
  const presentation = presentInsight(insight, isPartial, comparisonPeriod);
  if (!presentation.heroMetric || !presentation.heroLabel) return undefined;
  return {
    text: `${presentation.heroMetric} ${presentation.heroLabel}`,
    status: toneToMetricStatus(presentation.tone),
  };
}

export function summarizeInsights(
  insights: Insight[] | null | undefined,
): DashboardInsightsSummary {
  const all = insights ?? [];
  const attention = all.filter((insight) =>
    attentionSeverities.has(insight.severity)
  );
  return {
    attentionCount: attention.length,
    preview: attention[0] ?? all[0],
  };
}

export function summarizeBudget(
  budget: Budget | null | undefined,
  insights: Insight[] | null | undefined,
  insightsAvailable: boolean,
  limit = 3,
): BudgetSummary {
  if (!budget?.accounts?.length) {
    return {
      configured: false,
      actual: 0,
      planned: 0,
      attentionCount: 0,
      statusLabel: "Not configured",
      status: "neutral",
      accounts: [],
    };
  }

  const budgetInsights = (insights ?? []).filter((insight) =>
    budgetInsightTypes.has(insight.type) &&
    attentionSeverities.has(insight.severity)
  );
  const accountsByName = new Map(
    budget.accounts.map((account) => [account.account, account]),
  );
  const seen = new Set<string>();
  const accounts: BudgetSummary["accounts"] = [];
  for (const insight of budgetInsights) {
    if (!insight.account || seen.has(insight.account)) continue;
    const account = accountsByName.get(insight.account);
    if (!account) continue;
    seen.add(insight.account);
    accounts.push({ budget: account, insight });
    if (accounts.length === limit) break;
  }

  const attentionCount = budgetInsights.length;
  return {
    configured: true,
    actual: budget.accounts.reduce((sum, account) => sum + account.actual, 0),
    planned: budget.accounts.reduce(
      (sum, account) => sum + account.forecast,
      0,
    ),
    attentionCount,
    statusLabel: !insightsAvailable
      ? "Status unavailable"
      : attentionCount > 0
      ? `${attentionCount} ${
        attentionCount === 1 ? "category needs" : "categories need"
      } attention`
      : "No categories need attention",
    status: !insightsAvailable
      ? "neutral"
      : attentionCount > 0
      ? "warning"
      : "positive",
    accounts,
  };
}
