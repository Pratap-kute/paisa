import { groupBy, mapValues, sum, sumBy, uniq } from "es-toolkit";
import COLORS, { generateColorScheme } from "$lib/shared/theme/colors";
import { iconify } from "$lib/shared/ui/icon";
import {
  type AllocationTarget,
  financialYear,
  type Gain,
  type Posting,
  restName,
} from "$lib/core/utils";
import type { ComparisonBarChartData } from "$lib/shared/charts/echarts/bar_comparison";
import { byExpenseGroup, expenseGroup } from "$lib/charts/expense";
import { sortBy } from "$lib/shared/utils/collection";

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
      return {
        key: point.category,
        categoryKey: point.category,
        label: point.category,
        value: point.total,
        secondaryValue: total > 0 ? (point.total / total) * 100 : 0,
        secondaryLabel: "Share %",
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

export function buildAllocationTargetComparison(
  allocationTargets: AllocationTarget[],
): ComparisonBarChartData {
  return {
    valueFormat: "number",
    valueLabel: "Current",
    targetLabel: "Target",
    sort: "input",
    points: sortBy(allocationTargets, (target) => target.name).map((
      target,
    ) => ({
      key: target.name,
      label: target.name,
      value: target.current,
      target: target.target,
      secondaryValue: target.current - target.target,
      secondaryLabel: "Diff",
      color: COLORS.secondary,
      tooltipRows: [
        { label: "Target", value: target.target, format: "number" },
        { label: "Current", value: target.current, format: "number" },
        {
          label: "Diff",
          value: target.current - target.target,
          format: "number",
        },
      ],
    })),
  };
}

export function buildGainOverviewComparison(
  gains: Gain[],
): ComparisonBarChartData {
  return {
    valueFormat: "currency",
    valueLabel: "Balance",
    sort: "input",
    points: sortBy(gains, (gain) => gain.account).map((gain) => {
      const current = gain.networth;
      return {
        key: gain.account,
        label: restName(gain.account),
        value: current.balanceAmount,
        secondaryValue: gain.xirr,
        secondaryLabel: "XIRR",
        color: current.gainAmount >= 0 ? COLORS.gain : COLORS.loss,
        tooltipRows: [
          {
            label: "Investment",
            value: current.investmentAmount,
            format: "currency",
          },
          {
            label: "Withdrawal",
            value: current.withdrawalAmount,
            format: "currency",
          },
          { label: "Gain", value: current.gainAmount, format: "currency" },
          {
            label: "Balance",
            value: current.balanceAmount,
            format: "currency",
          },
          { label: "XIRR", value: gain.xirr, format: "number" },
        ],
      };
    }),
  };
}

export function buildYearlyExpenseTimelineComparisonInput(postings: Posting[]) {
  const byYear = groupBy(postings, (posting) => financialYear(posting.date));
  return mapValues(byYear, (yearPostings) =>
    mapValues(
      groupBy(yearPostings, expenseGroup),
      (groupPostings) => sumBy(groupPostings, (posting) => posting.amount),
    ));
}
