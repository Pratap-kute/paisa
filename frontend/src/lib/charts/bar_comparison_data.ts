import _ from "lodash";
import COLORS, { generateColorScheme } from "$lib/core/colors";
import { iconify } from "$lib/core/icon";
import {
  type AllocationTarget,
  financialYear,
  type Gain,
  type Posting,
  restName,
} from "$lib/core/utils";
import type { ComparisonBarChartData } from "$lib/charts/echarts/bar_comparison";
import { byExpenseGroup, expenseGroup } from "$lib/charts/expense";

export function buildExpenseBreakdownComparison(
  postings: Posting[],
  options: {
    color?: (category: string) => string;
    headerPrefix?: string;
  } = {},
): ComparisonBarChartData {
  const categories = byExpenseGroup(postings);
  const total = _.sumBy(_.values(categories), (point) => point.total);
  return {
    valueFormat: "currency",
    valueLabel: "Expenses",
    sort: "ascending",
    points: _.map(categories, (point) => {
      const byMonth = _.chain(point.postings)
        .groupBy((posting) => posting.date.format("MMM"))
        .map((monthPostings, month) => [
          month,
          _.sumBy(monthPostings, (posting) => posting.amount),
        ])
        .fromPairs()
        .value();
      return {
        key: point.category,
        categoryKey: point.category,
        label: iconify(point.category, { group: "Expenses", suffix: true }),
        value: point.total,
        secondaryValue: total > 0 ? (point.total / total) * 100 : 0,
        secondaryLabel: "Share %",
        color: options.color?.(point.category),
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
          ..._.map(byMonth, (amount, month) => ({
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
  const groups = _.chain(postings).map(expenseGroup).uniq().sort().value();
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
    points: _.chain(yearlySpends)
      .map((breakdown, year) => {
        const value = _.sum(_.values(breakdown));
        return {
          key: year,
          label: year,
          value,
          color: COLORS.expenses,
          tooltipRows: [
            { label: "Total", value, format: "currency" as const },
            ..._.map(breakdown, (amount, month) => ({
              label: month,
              value: amount,
              format: "currency" as const,
            })),
          ],
        };
      })
      .sortBy((point) => point.key)
      .value(),
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
    points: _.sortBy(allocationTargets, (target) => target.name).map((
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
    points: _.sortBy(gains, (gain) => gain.account).map((gain) => {
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
  return _.chain(postings)
    .groupBy((posting) => financialYear(posting.date))
    .mapValues((yearPostings) =>
      _.chain(yearPostings)
        .groupBy(expenseGroup)
        .mapValues((groupPostings) =>
          _.sumBy(groupPostings, (posting) => posting.amount)
        )
        .value()
    )
    .value();
}
