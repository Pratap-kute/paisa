import type { RecurringAnalysis } from "$lib/domain/recurring_analysis";
import type { AssetBreakdown, Networth } from "$lib/domain/assets";
import type { AccountBudget, Budget } from "$lib/domain/cash_flow";
import type { Insight } from "$lib/domain/insights";
import type { GoalSummary } from "$lib/domain/goals_models";
import {
  goalStatusLabel,
  summarizeGoalHealth,
} from "$lib/domain/goal_intelligence";
import type { Posting } from "$lib/domain/ledger";
import { now } from "$lib/domain/time";
import {
  type InsightTone,
  presentInsight,
} from "$lib/features/insights/presentation";
import { formatCurrency } from "$lib/shared/formatters/currency";
import { iconGlyphOr } from "$lib/shared/ui/icon";
import type { Dayjs } from "dayjs";

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
  accounts: Array<{ budget: AccountBudget; insight?: Insight }>;
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
      } later than usual`,
      detail: input.recurring.pastDueAmount > 0
        ? `${
          formatCurrency(input.recurring.pastDueAmount)
        } expected; no payment found`
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

  const goalAttention = summarizeGoalHealth(input.goals ?? [], input.asOf)
    .attention.slice(0, 1);
  for (const { goal, analysis } of goalAttention) {
    result.push({
      id: `goal:${
        analysis.state === "overdue" ? "overdue" : analysis.scheduleStatus
      }:${goal.id || `${goal.type}:${goal.name}`}`,
      kind: "goal",
      title: `${goal.name}: ${goalStatusLabel(goal, analysis)}`,
      detail: analysis.state === "overdue"
        ? `${formatCurrency(analysis.remainingAmount)} remaining`
        : `${
          formatCurrency(analysis.actualMonthlyContribution ?? 0)
        }/month recent pace · ${
          formatCurrency(analysis.requiredMonthlyContribution ?? 0)
        }/month required`,
      icon: iconGlyphOr(goal.icon),
      iconIsGlyph: true,
      status: analysis.attention === "critical" ? "negative" : "warning",
      href: `/more/goals/${goal.type}/${encodeURIComponent(goal.name)}`,
      priority: analysis.attention === "critical" ? 550 : 200,
    });
  }
  return result.sort((a, b) => b.priority - a.priority).slice(
    0,
    Math.max(0, limit),
  );
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
  insights?: Insight[] | null | undefined,
  insightsAvailable = true,
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

  const accountsByName = new Map(
    budget.accounts.map((account) => [account.account, account]),
  );

  const outlook = budget.outlook;
  let attentionCount = 0;
  let status: MetricStatus = "positive";
  let statusLabel = "No categories need attention";

  if (outlook) {
    attentionCount = (outlook.overspentCount ?? 0) +
      (outlook.likelyOverCount ?? 0) +
      (outlook.atRiskCount ?? 0);
    if (attentionCount > 0) {
      status = (outlook.overspentCount ?? 0) > 0 ? "negative" : "warning";
      statusLabel = `${attentionCount} ${
        attentionCount === 1 ? "category needs" : "categories need"
      } attention`;
    } else {
      status = "positive";
      statusLabel = "No categories need attention";
    }
  } else if (!insightsAvailable) {
    statusLabel = "Status unavailable";
    status = "neutral";
  } else {
    const budgetInsights = (insights ?? []).filter((insight) =>
      budgetInsightTypes.has(insight.type) &&
      attentionSeverities.has(insight.severity)
    );
    attentionCount = budgetInsights.length;
    status = attentionCount > 0 ? "warning" : "positive";
    statusLabel = attentionCount > 0
      ? `${attentionCount} ${
        attentionCount === 1 ? "category needs" : "categories need"
      } attention`
      : "No categories need attention";
  }

  const attentionAccounts: Array<{ budget: AccountBudget; insight?: Insight }> =
    [];
  const seenAccounts = new Set<string>();

  const insightByAccount = new Map<string, Insight>();
  for (const ins of insights ?? []) {
    if (ins.account && budgetInsightTypes.has(ins.type)) {
      insightByAccount.set(ins.account, ins);
    }
  }

  const severityRank: Record<string, number> = {
    "overspent": 3,
    "likely-over": 2,
    "at-risk": 1,
  };

  const candidateAccounts = budget.accounts
    .filter((acc) => {
      const projStatus = acc.projection?.status;
      return projStatus === "overspent" || projStatus === "likely-over" ||
        projStatus === "at-risk";
    })
    .sort((a, b) => {
      const rankA = severityRank[a.projection?.status ?? ""] ?? 0;
      const rankB = severityRank[b.projection?.status ?? ""] ?? 0;
      if (rankB !== rankA) return rankB - rankA;
      const overrunA = a.projection?.projectedOverrun ?? 0;
      const overrunB = b.projection?.projectedOverrun ?? 0;
      return overrunB - overrunA;
    });

  for (const acc of candidateAccounts) {
    if (seenAccounts.has(acc.account)) continue;
    seenAccounts.add(acc.account);
    attentionAccounts.push({
      budget: acc,
      insight: insightByAccount.get(acc.account),
    });
    if (attentionAccounts.length === limit) break;
  }

  if (attentionAccounts.length === 0 && insights) {
    for (const ins of insights) {
      if (
        !ins.account || seenAccounts.has(ins.account) ||
        !budgetInsightTypes.has(ins.type)
      ) continue;
      const acc = accountsByName.get(ins.account);
      if (!acc) continue;
      seenAccounts.add(ins.account);
      attentionAccounts.push({ budget: acc, insight: ins });
      if (attentionAccounts.length === limit) break;
    }
  }

  return {
    configured: true,
    actual: budget.accounts.reduce((sum, account) => sum + account.actual, 0),
    planned: budget.accounts.reduce(
      (sum, account) => sum + account.forecast,
      0,
    ),
    attentionCount,
    statusLabel,
    status,
    accounts: attentionAccounts,
  };
}

// Adapt the shared analysis to the existing dashboard attention contract.
export function summarizeAnalyzedRecurring(
  items: RecurringAnalysis[],
  asOf: Dayjs,
  currency: string,
  cashBalance?: number,
  horizonDays = 7,
): UpcomingRecurringSummary {
  const summary: UpcomingRecurringSummary = {
    horizonDays,
    upcomingAmount: 0,
    upcomingCount: 0,
    pastDueAmount: 0,
    pastDueCount: 0,
  };
  if (!asOf.isValid() || horizonDays < 0) return summary;
  for (const item of items) {
    if (
      !item.confirmed || !item.cashObligation || item.cashCommodity !== currency
    ) continue;
    if (item.flags.laterThanUsual) {
      summary.pastDueCount++;
      summary.pastDueAmount += item.expectedCashOutflowAmount ?? 0;
    }
    for (const date of item.upcomingDates) {
      if (date.isAfter(asOf.add(horizonDays, "day"), "day")) continue;
      summary.upcomingCount++;
      summary.upcomingAmount += item.expectedCashOutflowAmount ?? 0;
      if (!summary.earliestDueDate || date.isBefore(summary.earliestDueDate)) {
        summary.earliestDueDate = date;
      }
    }
  }
  if (cashBalance !== undefined) {
    summary.cashAfterUpcoming = cashBalance - summary.upcomingAmount;
  }
  return summary;
}
