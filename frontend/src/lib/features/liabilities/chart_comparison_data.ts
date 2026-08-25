import { sum } from "es-toolkit";
import COLORS from "$lib/shared/theme/colors";
import type { ComparisonBarChartData } from "$lib/shared/charts/echarts/bar_comparison";
import { sortBy } from "$lib/shared/utils/collection";

export function buildCreditCardYearlySpendsComparison(
  yearlySpends: Record<string, Record<string, number>>,
): ComparisonBarChartData {
  return {
    valueFormat: "currency",
    valueLabel: "Spending",
    sort: "input",
    points: sortBy(
      Object.entries(yearlySpends).map(([year, breakdown]) => {
        const value = sum(Object.values(breakdown));
        return {
          key: year,
          label: year,
          value,
          color: COLORS.expenses,
          tooltipRows: [
            { label: "Total", value, format: "currency" as const },
            ...Object.entries(breakdown).map(([month, amount]) => ({
              label: month,
              value: amount,
              format: "currency" as const,
            })),
          ],
        };
      }),
      (point) => point.key,
    ),
  };
}
