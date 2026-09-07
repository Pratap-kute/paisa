import type { DtoInvestmentPerformance } from "$lib/api";
import type { PeriodSeriesChartData } from "$lib/shared/charts/echarts/period_series";
import COLORS from "$lib/shared/theme/colors";
import {
  formatCurrency,
  formatPercentage,
} from "$lib/shared/formatters/currency";

export const performancePresets = [
  { value: "current_fy", label: "Current FY" },
  { value: "previous_fy", label: "Previous FY" },
  { value: "one_year", label: "1 Year" },
  { value: "since_inception", label: "Since Inception" },
];

export function performanceQuery(params: URLSearchParams) {
  if (params.has("from") || params.has("to")) {
    return {
      from: params.get("from") ?? "",
      to: params.get("to") ?? "",
      ...(params.has("preset") ? { preset: params.get("preset") ?? "" } : {}),
    };
  }
  return { preset: params.get("preset") ?? "current_fy" };
}

export function performanceLink(
  account: string,
  params: URLSearchParams,
): string {
  const query = new URLSearchParams();
  for (const key of ["preset", "from", "to"]) {
    const value = params.get(key);
    if (value !== null) query.set(key, value);
  }
  return `/assets/gain/${encodeURIComponent(account)}${
    query.size ? `?${query}` : ""
  }`;
}

export function performancePercent(value: number | null | undefined): string {
  return value == null ? "—" : formatPercentage(value, 2);
}

export function performanceReason(code: string | null | undefined): string {
  switch (code) {
    case "insufficient_weighted_capital":
      return "The cash-flow-adjusted capital base is too small or non-positive to calculate a reliable percentage.";
    case "unattributed_investment_income":
      return "Investment income was paid directly to checking without identifying an investment account. These amounts may omit investment income.";
    case "no_investment_activity":
      return "No investment activity is available for this period.";
    default:
      return "A market price is missing at the opening or closing boundary. Amounts are estimates; period return is unavailable.";
  }
}

export function performanceSeries(
  result: DtoInvestmentPerformance,
  hidden = false,
): PeriodSeriesChartData {
  return {
    axis: "time",
    granularity: "day",
    valueFormat: "currency",
    series: [
      {
        key: "value",
        label: "Market Value",
        intent: "line",
        color: COLORS.primary,
      },
      {
        key: "baseline",
        label: "Opening Value + Cumulative Net Contribution",
        intent: "line",
        color: COLORS.secondary,
        dashed: true,
      },
    ],
    points: (result.timeline ?? []).map((point) => {
      const value = hidden ? 0 : point.value ?? 0;
      const baseline = hidden ? 0 : point.contributionBaseline ?? 0;
      return {
        period: `${point.date}${
          point.quality?.status === "partial" ? " (estimated)" : ""
        }`,
        timestamp: new Date(`${point.date}T00:00:00`).valueOf(),
        values: { value, baseline },
        tooltipRows: [["Market Value", value], [
          "Opening Value + Cumulative Net Contribution",
          baseline,
        ]],
      };
    }),
  };
}

export function performanceDecomposition(result: DtoInvestmentPerformance) {
  return [
    { label: "Opening Value", value: result.openingValue },
    { label: "+ Contributions", value: result.contributions },
    { label: "− Withdrawals", value: result.withdrawals },
    { label: "+ Investment Return", value: result.investmentReturn },
    { label: "= Ending Value", value: result.closingValue },
  ].map((row) => ({ ...row, formatted: formatCurrency(row.value ?? 0) }));
}
