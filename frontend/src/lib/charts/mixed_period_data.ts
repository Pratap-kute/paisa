import dayjs from "dayjs";
import _ from "lodash";
import { categorySeriesIndex } from "$lib/charts/echarts/theme";
import type { PeriodSeriesChartData } from "$lib/charts/echarts/period_series";
import { expenseGroup } from "$lib/charts/expense";
import {
  type Aggregate,
  type CashFlow,
  financialYear,
  forEachFinancialYear,
  forEachMonth,
  type Legend,
  now,
  type Posting,
  secondName,
} from "$lib/core/utils";

export const categoryColor = (key: string) =>
  `var(--paisa-chart-series-${categorySeriesIndex(key, 6) + 1})`;

export function categoryLegends(
  keys: string[],
  onSelect?: (key: string) => void,
): Legend[] {
  return keys.map((key) => ({
    label: key,
    color: categoryColor(key),
    shape: "square",
    onClick: onSelect ? () => onSelect(key) : undefined,
  }));
}

export function buildCashFlowSeries(
  cashFlows: CashFlow[],
): PeriodSeriesChartData {
  const definitions = [
    ["income", "Income", "source"],
    ["liability-source", "Liabilities received", "source"],
    ["investment-source", "Investment withdrawal", "source"],
    ["expenses", "Expenses", "use"],
    ["tax", "Tax", "use"],
    ["investment-use", "Investment", "use"],
    ["liability-use", "Liabilities repaid", "use"],
  ] as const;
  return {
    axis: "category",
    granularity: "month",
    valueFormat: "currency",
    legends: [
      ...definitions.map(([key, label]) => ({
        label,
        color: categoryColor(key),
        shape: "square" as const,
        symbol: key === "tax" ? "diagonal-stripe" as const : undefined,
      })),
      {
        label: "Checking Balance",
        color: "var(--paisa-primary)",
        shape: "line",
      },
    ],
    series: [
      ...definitions.map(([key, label, stack]) => ({
        key,
        label,
        intent: "stacked-bar" as const,
        stack,
        categoryKey: key,
        decal: key === "tax",
      })),
      {
        key: "balance",
        label: "Checking Balance",
        intent: "line" as const,
        color: "var(--paisa-primary)",
        showSymbol: false,
      },
    ],
    points: cashFlows.map((flow) => ({
      period: flow.date.format("MMM YYYY"),
      timestamp: flow.date.valueOf(),
      values: {
        income: flow.income,
        "liability-source": Math.max(flow.liabilities, 0),
        "investment-source": Math.max(-flow.investment, 0),
        expenses: flow.expenses,
        tax: flow.tax,
        "investment-use": Math.max(flow.investment, 0),
        "liability-use": Math.max(-flow.liabilities, 0),
        balance: flow.balance,
      },
      tooltipRows: [
        ["Income", flow.income],
        ["Liabilities", flow.liabilities],
        ["Expenses", flow.expenses],
        ["Tax", flow.tax],
        ["Investment", flow.investment],
        ["Checking", flow.checking],
        ["Checking Balance", flow.balance],
      ],
    })),
  };
}

function expenseGroups(postings: Posting[]) {
  return _.chain(postings).map(expenseGroup).uniq().sort().value();
}

export function buildMonthlyExpenseTimelineSeries(
  postings: Posting[],
  allowedGroups: string[],
  range: { from: dayjs.Dayjs; to: dayjs.Dayjs },
): PeriodSeriesChartData {
  const groups = expenseGroups(postings);
  const selected = allowedGroups.length ? allowedGroups : groups;
  const start = _.minBy(postings, (posting) => posting.date.valueOf())?.date;
  const end = _.maxBy(postings, (posting) => posting.date.valueOf())?.date;
  const points: PeriodSeriesChartData["points"] = [];
  let cumulative = 0;
  if (start && end) {
    forEachMonth(start, end, (month) => {
      if (
        month.isBefore(range.from, "month") || month.isAfter(range.to, "month")
      ) return;
      const bucket = postings.filter((posting) =>
        posting.date.isSame(month, "month")
      );
      const values = _.chain(bucket).groupBy(expenseGroup).mapValues((items) =>
        _.sumBy(items, (item) => item.amount)
      ).value();
      cumulative += _.sum(selected.map((group) => values[group] ?? 0));
      points.push({
        period: month.format("MMM-YYYY"),
        timestamp: month.valueOf(),
        values: { ...values, cumulative },
        tooltipRows: [
          ...selected.filter((group) => (values[group] ?? 0) !== 0).map((
            group,
          ) => [group, values[group] ?? 0] as [string, number]),
          ["Cumulative total", cumulative],
        ],
      });
    });
  }
  return {
    axis: "category",
    granularity: "month",
    valueFormat: "currency",
    series: [
      ...selected.map((group) => ({
        key: group,
        label: group,
        intent: "stacked-bar" as const,
        stack: "expenses",
        categoryKey: group,
      })),
      {
        key: "cumulative",
        label: "Cumulative total",
        intent: "line",
        dashed: true,
        color: "var(--paisa-negative)",
      },
    ],
    points,
  };
}

export function buildYearlyExpenseTimelineSeries(
  postings: Posting[],
  allowedGroups: string[],
): PeriodSeriesChartData {
  const groups = expenseGroups(postings);
  const selected = allowedGroups.length ? allowedGroups : groups;
  const start = _.minBy(postings, (posting) => posting.date.valueOf())?.date;
  const end = now().startOf("month");
  const points: PeriodSeriesChartData["points"] = [];
  if (start) {
    forEachFinancialYear(start, end, (year) => {
      const key = financialYear(year);
      const bucket = postings.filter((posting) =>
        financialYear(posting.date) === key
      );
      const values = _.chain(bucket).groupBy(expenseGroup).mapValues((items) =>
        _.sumBy(items, (item) => item.amount)
      ).value();
      points.push({
        period: key,
        timestamp: year.valueOf(),
        values,
        tooltipRows: selected.filter((group) => (values[group] ?? 0) !== 0).map(
          (group) => [group, values[group] ?? 0] as [string, number],
        ),
      });
    });
  }
  return {
    axis: "category",
    granularity: "financial-year",
    valueFormat: "currency",
    series: selected.map((group) => ({
      key: group,
      label: group,
      intent: "stacked-bar",
      stack: "expenses",
      categoryKey: group,
    })),
    points,
  };
}

export function buildAllocationTimelineSeries(
  timeline: Record<string, Aggregate>[],
): PeriodSeriesChartData {
  const rows = timeline.map((aggregates) => {
    const grouped = _.chain(aggregates).values().filter((item) =>
      item.market_amount !== 0
    )
      .groupBy((item) => secondName(item.account)).mapValues((items) =>
        _.sumBy(items, (item) => item.market_amount)
      ).value();
    const total = _.sum(Object.values(grouped));
    const first = _.find(_.values(aggregates));
    return {
      date: first?.date,
      values: _.mapValues(
        grouped,
        (value) => total ? (value / total) * 100 : 0,
      ),
    };
  }).filter((row) => row.date);
  const groups = _.chain(rows).flatMap((row) => Object.keys(row.values)).uniq()
    .sort().value();
  return {
    axis: "time",
    granularity: "day",
    valueFormat: "percentage",
    legends: categoryLegends(groups),
    series: groups.map((group) => ({
      key: group,
      label: group,
      intent: "line",
      categoryKey: group,
      showSymbol: false,
    })),
    points: rows.map((row) => ({
      period: row.date!.format("DD MMM YYYY"),
      timestamp: row.date!.valueOf(),
      values: row.values,
      tooltipRows: groups.map((
        group,
      ) => [group, (row.values[group] ?? 0) / 100, "percentage"]),
    })),
  };
}
