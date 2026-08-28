import type { Insight } from "$lib/domain/insights";
import { restName } from "$lib/domain/account";
import {
  formatCurrency,
  formatFloat,
  formatPercentage,
} from "$lib/shared/formatters/currency";
import dayjs from "dayjs";

export type InsightTone =
  | "positive"
  | "warning"
  | "critical"
  | "info"
  | "neutral";

export interface InsightTag {
  label: string;
  tone?: "positive" | "warning" | "critical" | "info" | "neutral";
}

export interface InsightPresentation {
  id: string;
  type: string;
  category: string;
  categoryLabel: string;
  severity: string;
  score: number;
  title: string;
  description: string;
  icon: string;
  tone: InsightTone;
  badgeText?: string;
  heroMetric?: string;
  heroLabel?: string;
  progressPercent?: number;
  progressTone?: "positive" | "warning" | "critical";
  tags?: InsightTag[];
  actionText?: string;
  href?: string;
}

function getPeriodName(periodStr?: string): string {
  if (!periodStr) return "previous period";
  const d = dayjs(`${periodStr}-01`);
  return d.isValid() ? d.format("MMMM") : periodStr;
}

const categoryLabels: Record<string, string> = {
  spending: "Spending",
  savings: "Savings",
  networth: "Wealth",
  budget: "Budget",
  recurring: "Recurring",
  investment: "Investments",
  cash: "Cash & Liquidity",
};

export function presentInsight(
  insight: Insight,
  isPartial?: boolean,
  comparisonPeriod?: string,
): InsightPresentation {
  const compName = getPeriodName(comparisonPeriod || insight.comparisonPeriod);
  const compSuffix = isPartial ? `${compName} (month-to-date)` : compName;
  const categoryLabel = categoryLabels[insight.category] || "General";

  switch (insight.type) {
    case "expense_change": {
      const val = Number(insight.value ?? 0);
      const prev = Number(insight.previousValue ?? 0);
      const chg = Number(insight.change ?? 0);
      const pct = Number(insight.changePercent ?? 0);

      if (prev === 0 && val > 0) {
        return {
          id: insight.id,
          type: insight.type,
          category: insight.category,
          categoryLabel,
          severity: insight.severity,
          score: insight.score,
          title: "New monthly spending recorded",
          description: `${
            formatCurrency(val)
          } non-tax expenses recorded this month`,
          icon: "fa-solid fa-receipt",
          tone: "info",
          badgeText: "New",
          heroMetric: formatCurrency(val),
          heroLabel: "non-tax expenses",
          actionText: "View Monthly Expenses",
          href: insight.href || "/expense/monthly",
        };
      }

      if (chg > 0) {
        const tone: InsightTone = pct >= 20 ? "warning" : "info";
        return {
          id: insight.id,
          type: insight.type,
          category: insight.category,
          categoryLabel,
          severity: insight.severity,
          score: insight.score,
          title: `Expenses increased ${formatPercentage(pct / 100, 0)}`,
          description: `${formatCurrency(val)} vs ${
            formatCurrency(prev)
          } in ${compSuffix}`,
          icon: "fa-solid fa-arrow-trend-up",
          tone,
          badgeText: `+${formatFloat(pct, 1)}%`,
          heroMetric: `+${formatFloat(pct, 1)}%`,
          heroLabel: `vs ${compName}`,
          actionText: "View Monthly Expenses",
          href: insight.href || "/expense/monthly",
        };
      }

      return {
        id: insight.id,
        type: insight.type,
        category: insight.category,
        categoryLabel,
        severity: insight.severity,
        score: insight.score,
        title: `Expenses decreased ${formatPercentage(Math.abs(pct) / 100, 0)}`,
        description: `${formatCurrency(val)} vs ${
          formatCurrency(prev)
        } in ${compSuffix}`,
        icon: "fa-solid fa-arrow-trend-down",
        tone: "positive",
        badgeText: `-${formatFloat(Math.abs(pct), 1)}%`,
        heroMetric: `-${formatFloat(Math.abs(pct), 1)}%`,
        heroLabel: `vs ${compName}`,
        actionText: "View Monthly Expenses",
        href: insight.href || "/expense/monthly",
      };
    }

    case "category_spike": {
      const val = Number(insight.value ?? 0);
      const prev = Number(insight.previousValue ?? 0);
      const pct = Number(insight.changePercent ?? 0);
      const name = restName(insight.account || "") || insight.account ||
        "Category";

      if (prev === 0) {
        return {
          id: insight.id,
          type: insight.type,
          category: insight.category,
          categoryLabel,
          severity: insight.severity,
          score: insight.score,
          title: `${name} spending started`,
          description: `${formatCurrency(val)} recorded this month`,
          icon: "fa-solid fa-arrow-trend-up",
          tone: "info",
          badgeText: "New",
          heroMetric: formatCurrency(val),
          heroLabel: "first month",
          actionText: "Analyze Category",
          href: insight.href || "/expense/monthly",
        };
      }

      const tone: InsightTone = pct >= 35 ? "warning" : "info";
      return {
        id: insight.id,
        type: insight.type,
        category: insight.category,
        categoryLabel,
        severity: insight.severity,
        score: insight.score,
        title: `${name} spending increased ${formatPercentage(pct / 100, 0)}`,
        description: `${formatCurrency(val)} vs ${
          formatCurrency(prev)
        } in ${compSuffix}`,
        icon: "fa-solid fa-arrow-trend-up",
        tone,
        badgeText: `+${formatFloat(pct, 1)}%`,
        heroMetric: `+${formatFloat(pct, 1)}%`,
        heroLabel: `${formatCurrency(val)} vs ${formatCurrency(prev)}`,
        actionText: "Analyze Spending",
        href: insight.href || "/expense/monthly",
      };
    }

    case "savings_rate_change": {
      const val = Number(insight.value ?? 0);
      const prev = Number(insight.previousValue ?? 0);
      const chg = Number(insight.change ?? 0);

      if (chg < 0) {
        const isLumpSumNormalization = prev > 100;
        const tone: InsightTone = isLumpSumNormalization
          ? "info"
          : (Math.abs(chg) >= 15 ? "warning" : "info");
        const description = isLumpSumNormalization
          ? `Normalized from ${
            formatFloat(prev, 0)
          }% in ${compSuffix} (lump-sum/bonus)`
          : `Down from ${formatFloat(prev, 0)}% in ${compSuffix}`;

        return {
          id: insight.id,
          type: insight.type,
          category: insight.category,
          categoryLabel,
          severity: insight.severity,
          score: insight.score,
          title: `Savings rate fell to ${formatFloat(val, 0)}%`,
          description,
          icon: "fa-solid fa-arrow-trend-down",
          tone,
          badgeText: `${formatFloat(chg, 1)} pp`,
          heroMetric: `${formatFloat(val, 0)}%`,
          heroLabel: `${formatFloat(chg, 1)} pp vs ${compName}`,
          actionText: "View Savings Rate",
          href: insight.href || "/assets/investment",
        };
      }

      return {
        id: insight.id,
        type: insight.type,
        category: insight.category,
        categoryLabel,
        severity: insight.severity,
        score: insight.score,
        title: `Savings rate rose to ${formatFloat(val, 0)}%`,
        description: `Up from ${formatFloat(prev, 0)}% in ${compSuffix}`,
        icon: "fa-solid fa-arrow-trend-up",
        tone: "positive",
        badgeText: `+${formatFloat(chg, 1)} pp`,
        heroMetric: `${formatFloat(val, 0)}%`,
        heroLabel: `+${formatFloat(chg, 1)} pp vs ${compName}`,
        actionText: "View Savings Rate",
        href: insight.href || "/assets/investment",
      };
    }

    case "networth_change": {
      const val = Number(insight.value ?? 0);
      const prev = Number(insight.previousValue ?? 0);
      const chg = Number(insight.change ?? 0);
      const pct = Number(insight.changePercent ?? 0);

      if (chg >= 0) {
        return {
          id: insight.id,
          type: insight.type,
          category: insight.category,
          categoryLabel,
          severity: insight.severity,
          score: insight.score,
          title: `Net worth increased ${formatCurrency(chg)}`,
          description: `Current balance: ${formatCurrency(val)} (up from ${
            formatCurrency(prev)
          })`,
          icon: "fa-solid fa-vault",
          tone: "positive",
          badgeText: `+${formatPercentage(pct / 100, 1)}`,
          heroMetric: `+${formatCurrency(chg)}`,
          heroLabel: `Total: ${formatCurrency(val)}`,
          actionText: "View Net Worth",
          href: insight.href || "/assets/networth",
        };
      }

      return {
        id: insight.id,
        type: insight.type,
        category: insight.category,
        categoryLabel,
        severity: insight.severity,
        score: insight.score,
        title: `Net worth decreased ${formatCurrency(Math.abs(chg))}`,
        description: `Current balance: ${formatCurrency(val)} (down from ${
          formatCurrency(prev)
        })`,
        icon: "fa-solid fa-vault",
        tone: "warning",
        badgeText: `-${formatPercentage(Math.abs(pct) / 100, 1)}`,
        heroMetric: `-${formatCurrency(Math.abs(chg))}`,
        heroLabel: `Total: ${formatCurrency(val)}`,
        actionText: "View Net Worth",
        href: insight.href || "/assets/networth",
      };
    }

    case "networth_contribution": {
      const inv = Number(insight.investmentContribution ?? 0);
      const gain = Number(insight.gainContribution ?? 0);
      const chg = Number(insight.change ?? 0);

      return {
        id: insight.id,
        type: insight.type,
        category: insight.category,
        categoryLabel,
        severity: insight.severity,
        score: insight.score,
        title: "Net worth growth composition",
        description: `${formatCurrency(inv)} from new investments, ${
          formatCurrency(gain)
        } from market valuation change`,
        icon: "fa-solid fa-coins",
        tone: chg >= 0 ? "positive" : "info",
        badgeText: "Decomposition",
        heroMetric: `${chg >= 0 ? "+" : ""}${formatCurrency(chg)}`,
        heroLabel: "net movement",
        tags: [
          {
            label: `${inv >= 0 ? "+" : ""}${formatCurrency(inv)} Capital`,
            tone: "info",
          },
          {
            label: `${gain >= 0 ? "+" : ""}${formatCurrency(gain)} Valuation`,
            tone: gain >= 0 ? "positive" : "warning",
          },
        ],
        actionText: "View Growth Details",
        href: insight.href || "/assets/networth",
      };
    }

    case "budget_overspent": {
      const val = Number(insight.value ?? 0);
      const prev = Number(insight.previousValue ?? 0);
      const chg = Number(insight.change ?? 0);
      const name = restName(insight.account || "") || insight.account ||
        "Budget";
      const pct = prev > 0 ? Math.round((val / prev) * 100) : 100;

      return {
        id: insight.id,
        type: insight.type,
        category: insight.category,
        categoryLabel,
        severity: insight.severity,
        score: insight.score,
        title: `${name} budget exceeded by ${formatCurrency(chg)}`,
        description: `Spent ${formatCurrency(val)} of ${
          formatCurrency(prev)
        } budgeted`,
        icon: "fa-solid fa-circle-exclamation",
        tone: "critical",
        badgeText: "Over budget",
        heroMetric: `${pct}%`,
        heroLabel: `spent (exceeded by ${formatCurrency(chg)})`,
        progressPercent: Math.min(100, pct),
        progressTone: "critical",
        actionText: "Review Budget",
        href: insight.href || "/expense/budget",
      };
    }

    case "budget_risk": {
      const prev = Number(insight.previousValue ?? 0);
      const chg = Number(insight.change ?? 0);
      const pct = Number(insight.changePercent ?? 0);
      const name = restName(insight.account || "") || insight.account ||
        "Budget";
      const tone: InsightTone = pct >= 95 ? "critical" : "warning";

      return {
        id: insight.id,
        type: insight.type,
        category: insight.category,
        categoryLabel,
        severity: insight.severity,
        score: insight.score,
        title: `${name} budget is ${formatFloat(pct, 0)}% used`,
        description: `${formatCurrency(chg)} remaining of ${
          formatCurrency(prev)
        } forecast`,
        icon: "fa-solid fa-triangle-exclamation",
        tone,
        badgeText: `${formatFloat(pct, 0)}% used`,
        heroMetric: `${formatFloat(pct, 0)}%`,
        heroLabel: `${formatCurrency(chg)} remaining of ${
          formatCurrency(prev)
        }`,
        progressPercent: Math.min(100, pct),
        progressTone: tone === "critical" ? "critical" : "warning",
        actionText: "Review Budget",
        href: insight.href || "/expense/budget",
      };
    }

    case "recurring_increase": {
      const val = Number(insight.value ?? 0);
      const prev = Number(insight.previousValue ?? 0);
      const chg = Number(insight.change ?? 0);
      const pct = Number(insight.changePercent ?? 0);
      const name = insight.account || "Recurring";

      return {
        id: insight.id,
        type: insight.type,
        category: insight.category,
        categoryLabel,
        severity: insight.severity,
        score: insight.score,
        title: `${name} recurring cost increased to ${formatCurrency(val)}`,
        description: `Up by ${formatCurrency(chg)} (+${
          formatFloat(pct, 1)
        }%) from ${formatCurrency(prev)}`,
        icon: "fa-solid fa-repeat",
        tone: "warning",
        badgeText: `+${formatFloat(pct, 1)}%`,
        heroMetric: `+${formatFloat(pct, 1)}%`,
        heroLabel: `+${formatCurrency(chg)} (now ${formatCurrency(val)})`,
        actionText: "View Recurring Schedule",
        href: insight.href || "/cash_flow/recurring",
      };
    }

    case "allocation_concentration": {
      const val = Number(insight.value ?? 0);
      const prev = Number(insight.previousValue ?? 0);
      const chg = Number(insight.change ?? 0);
      const pct = Number(insight.changePercent ?? 0);
      const name = restName(insight.account || "") || insight.account ||
        "Asset Class";

      if (insight.change != null) {
        return {
          id: insight.id,
          type: insight.type,
          category: insight.category,
          categoryLabel,
          severity: insight.severity,
          score: insight.score,
          title: `${name} is ${formatFloat(chg, 1)} pp above target`,
          description: `Current allocation: ${formatFloat(val, 1)}% (target: ${
            formatFloat(prev, 1)
          }%)`,
          icon: "fa-solid fa-chart-pie",
          tone: "warning",
          badgeText: `+${formatFloat(chg, 1)} pp`,
          heroMetric: `+${formatFloat(chg, 1)} pp`,
          heroLabel: `actual ${formatFloat(val, 1)}% vs ${
            formatFloat(prev, 1)
          }% target`,
          actionText: "View Target Allocation",
          href: insight.href || "/assets/allocation",
        };
      }

      return {
        id: insight.id,
        type: insight.type,
        category: insight.category,
        categoryLabel,
        severity: insight.severity,
        score: insight.score,
        title: `${name} represents ${formatFloat(pct, 1)}% of portfolio`,
        description: `Total market value: ${formatCurrency(val)}`,
        icon: "fa-solid fa-chart-pie",
        tone: "info",
        badgeText: `${formatFloat(pct, 1)}%`,
        heroMetric: `${formatFloat(pct, 1)}%`,
        heroLabel: `market value ${formatCurrency(val)}`,
        actionText: "View Portfolio Breakdown",
        href: insight.href || "/assets/allocation",
      };
    }

    case "cash_warning": {
      const val = Number(insight.value ?? 0);
      if (insight.id.includes("negative_checking")) {
        return {
          id: insight.id,
          type: insight.type,
          category: insight.category,
          categoryLabel,
          severity: insight.severity,
          score: insight.score,
          title: "Checking balance is negative",
          description: `Current balance: ${formatCurrency(val)}`,
          icon: "fa-solid fa-circle-exclamation",
          tone: "critical",
          badgeText: "Action required",
          heroMetric: formatCurrency(val),
          heroLabel: "current cash balance",
          actionText: "View Cash Accounts",
          href: insight.href || "/assets/balance",
        };
      }

      return {
        id: insight.id,
        type: insight.type,
        category: insight.category,
        categoryLabel,
        severity: insight.severity,
        score: insight.score,
        title: "Projected month-end cash deficit",
        description: `Budget projects an ending balance of ${
          formatCurrency(val)
        }`,
        icon: "fa-solid fa-triangle-exclamation",
        tone: "warning",
        badgeText: "Deficit",
        heroMetric: formatCurrency(val),
        heroLabel: "projected balance",
        actionText: "View Budget Projections",
        href: insight.href || "/expense/budget",
      };
    }

    default:
      return {
        id: insight.id,
        type: insight.type,
        category: insight.category,
        categoryLabel,
        severity: insight.severity,
        score: insight.score,
        title: insight.type.replace(/_/g, " "),
        description: "",
        icon: "fa-solid fa-circle-info",
        tone: "info",
        actionText: "View Details",
        href: insight.href || "/",
      };
  }
}
