import { financialYear } from "#lib/domain/time";
import type { Posting } from "#lib/domain/ledger";
import { groupBy, mapValues, sortBy, sumBy, uniq } from "es-toolkit";
import { generateColorScheme } from "#lib/shared/theme/colors";
import { iconify } from "#lib/shared/ui/icon";
import type { ComparisonBarChartData } from "#lib/shared/charts/echarts/bar_comparison";
import { byExpenseGroup, expenseGroup } from "#lib/features/expense/expense";

const TOOLTIP_DETAIL_LIMIT = 8;

export function buildExpenseBreakdownComparison(
  postings: Posting[],
): ComparisonBarChartData {
  const categories = byExpenseGroup(postings);
  const total = sumBy(Object.values(categories), (point) => point.total);
  return {
    valueFormat: "currency",
    valueLabel: "Expenses",
    sort: "ascending",
    points: Object.values(categories).map((point) => {
      const byMonth = mapValues(
        groupBy(point.postings, (posting) => posting.date.format("MMM")),
        (monthPostings) => sumBy(monthPostings, (posting) => posting.amount),
      );
      const details = sortBy(point.postings, [(posting) => -posting.amount]);
      return {
        key: point.category,
        categoryKey: point.category,
        label: point.category,
        value: point.total,
        secondaryValue: total > 0 ? (point.total / total) * 100 : 0,
        secondaryLabel: "Share %",
        tooltipDetails: details
          .slice(0, TOOLTIP_DETAIL_LIMIT)
          .map((posting) => ({
            date: posting.date.format("DD MMM YYYY"),
            label: posting.payee,
            value: posting.amount,
          })),
        tooltipDetailsOverflow: Math.max(
          0,
          details.length - TOOLTIP_DETAIL_LIMIT,
        ),
        tooltipRows: [
          {
            label: "Total",
            value: point.total,
            format: "currency",
          },
          {
            label: "Share",
            value: total > 0 ? point.total / total : 0,
            format: "percentage",
          },
          ...Object.entries(byMonth).map(([month, amount]) => ({
            label: month,
            value: amount,
            format: "currency" as const,
          })),
        ],
      };
    }),
  };
}

export function expenseComparisonLegends(postings: Posting[]) {
  const groups = uniq(postings.map(expenseGroup)).sort();
  const color = generateColorScheme(groups);
  return groups.map((group) => ({
    label: iconify(group, { group: "Expenses" }),
    color: color(group),
    shape: "square" as const,
  }));
}

export function buildYearlyExpenseTimelineComparisonInput(postings: Posting[]) {
  const byYear = groupBy(postings, (posting) => financialYear(posting.date));
  return mapValues(byYear, (yearPostings) =>
    mapValues(groupBy(yearPostings, expenseGroup), (groupPostings) =>
      sumBy(groupPostings, (posting) => posting.amount),
    ),
  );
}
