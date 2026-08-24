import type {
  DtoAssetsBalanceResponse,
  DtoBudgetsSummaryResponse,
  DtoExpenseResponse,
  DtoIncomeResponse,
  DtoNetworthTimelineItemResponse,
} from "$lib/api";

export interface ChartTimeSeriesPoint {
  date: string;
  value: number;
}

export interface NetworthChartSeries {
  total: ChartTimeSeriesPoint[];
  investment: ChartTimeSeriesPoint[];
  gain: ChartTimeSeriesPoint[];
}

/**
 * Pure transformation from Networth timeline response to chart time-series data.
 */
export function toNetworthSeries(
  timeline: DtoNetworthTimelineItemResponse[] = [],
): NetworthChartSeries {
  const total: ChartTimeSeriesPoint[] = [];
  const investment: ChartTimeSeriesPoint[] = [];
  const gain: ChartTimeSeriesPoint[] = [];

  for (const item of timeline) {
    const date = item.date || "";
    total.push({ date, value: item.balanceAmount || 0 });
    investment.push({ date, value: item.investmentAmount || 0 });
    gain.push({ date, value: item.gainAmount || 0 });
  }

  return { total, investment, gain };
}

/**
 * Pure transformation from Expense response to category breakdown.
 */
export function toExpenseCategories(
  expense: DtoExpenseResponse | null,
): { name: string; amount: number }[] {
  if (!expense || !expense.expenses) {
    return [];
  }

  const categoryMap: Record<string, number> = {};
  for (const p of expense.expenses) {
    const name = p.account || "";
    if (name.startsWith("Expenses:")) {
      categoryMap[name] = (categoryMap[name] || 0) + (p.amount || 0);
    }
  }

  return Object.entries(categoryMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Pure transformation from Assets balance response to asset class allocation points.
 */
export function toAssetBreakdownPoints(
  balanceResponse: DtoAssetsBalanceResponse | null,
): { group: string; marketAmount: number; percentage: number }[] {
  if (!balanceResponse || !balanceResponse.asset_breakdowns) {
    return [];
  }

  const entries = Object.entries(balanceResponse.asset_breakdowns);
  const total = entries.reduce(
    (sum, [_, item]) => sum + (item.marketAmount || 0),
    0,
  );

  return entries.map(([group, item]) => {
    const marketAmount = item.marketAmount || 0;
    const percentage = total > 0 ? (marketAmount / total) * 100 : 0;
    return { group, marketAmount, percentage };
  }).sort((a, b) => b.marketAmount - a.marketAmount);
}
