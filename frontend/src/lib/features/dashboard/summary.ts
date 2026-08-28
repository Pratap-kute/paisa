import type { AssetBreakdown, Networth } from "$lib/domain/assets";
import type { AccountBudget, Budget } from "$lib/domain/cash_flow";
import type { Insight } from "$lib/domain/insights";
import type { Posting } from "$lib/domain/ledger";
import {
  type InsightTone,
  presentInsight,
} from "$lib/features/insights/presentation";

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

const attentionSeverities = new Set(["critical", "warning"]);
const budgetInsightTypes = new Set(["budget_overspent", "budget_risk"]);

function toneToMetricStatus(tone: InsightTone): MetricStatus {
  if (tone === "critical") return "negative";
  if (tone === "info") return "neutral";
  return tone;
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
