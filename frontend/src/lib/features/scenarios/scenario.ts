import type { DtoScenarioResult } from "$lib/api";
import type { PeriodSeriesChartData } from "$lib/shared/charts/echarts/period_series";
import COLORS from "$lib/shared/theme/colors";

export type ScenarioMetric = "netWorth" | "investment" | "cash";
export function scenarioSeries(
  result: DtoScenarioResult,
  metric: ScenarioMetric,
  hidden = false,
): PeriodSeriesChartData {
  return {
    axis: "category",
    granularity: "month",
    scale: true,
    valueFormat: "currency",
    series: [
      {
        key: "baseline",
        label: "Baseline",
        intent: "line",
        dashed: true,
        color: COLORS.neutral,
      },
      {
        key: "scenario",
        label: "Scenario",
        intent: "line",
        color: COLORS.primary,
      },
    ],
    points: (result.baseline?.points ?? []).map((point, i) => {
      const baseline = hidden ? 0 : point[metric] ?? 0;
      const scenario = hidden ? 0 : result.scenario?.points?.[i]?.[metric] ?? 0;
      return {
        period: point.month ?? "",
        values: { baseline, scenario },
        tooltipRows: [["Baseline", baseline], ["Scenario", scenario], [
          "Difference",
          scenario - baseline,
        ]],
      };
    }),
  };
}
export function scenarioMessage(code?: string): string {
  switch (code) {
    case "invalid_scenario_horizon":
      return "Choose a horizon between 1 and 120 months.";
    case "invalid_scenario_event":
      return "Each event needs a month within the projection horizon, a supported type, and a positive amount.";
    case "invalid_scenario_return":
      return "Expected annual return must be greater than −100%.";
    case "scenario_insufficient_investment_balance":
      return "An investment withdrawal exceeds the available balance in its month. Reduce the withdrawal or adjust its timing.";
    case "invalid_scenario":
      return "Check your assumptions. Income and expenses must be nonnegative numbers.";
    default:
      return "Unable to calculate the comparison. Please retry.";
  }
}
export function qualityMessage(code?: string): string {
  switch (code) {
    case "no_checking_account":
      return "Starting cash is unavailable because no checking account was found.";
    case "no_investment_activity":
      return "No investment activity was found. Opening investment value is zero.";
    case "estimated_investment_value":
      return "Investment value uses an estimated price or cost fallback.";
    case "insufficient_income_history":
      return "Income history has fewer than six completed months.";
    case "insufficient_expense_history":
      return "Expense history has fewer than six completed months.";
    case "insufficient_contribution_history":
      return "Investment transfer history has fewer than six completed months.";
    case "invalid_historical_magnitude":
      return "Historical refunds or reversals prevent a nonnegative recurring assumption.";
    default:
      return "Some baseline information is incomplete.";
  }
}
