import dayjs from "dayjs";
import { groupBy, mapValues, sum, sumBy, uniq } from "es-toolkit";
import { categorySeriesIndex } from "$lib/shared/charts/echarts/theme";
import type { PeriodSeriesChartData } from "$lib/shared/charts/echarts/period_series";
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
import { maxBy, minBy } from "$lib/shared/utils/collection";

export const categoryColor = (key: string) =>
  `var(--paisa-chart-series-${categorySeriesIndex(key, 12) + 1})`;

export function categoryColorResolver(keys: string[]) {
  const colors = new Map(
    [...new Set(keys)].sort().map((key, index) => [
      key,
      `var(--paisa-chart-series-${index % 12 + 1})`,
    ]),
  );
  return (key: string) => colors.get(key) ?? categoryColor(key);
}

export function categoryLegends(
  keys: string[],
  onSelect?: (key: string) => void,
): Legend[] {
  const color = categoryColorResolver(keys);
  return keys.map((key) => ({
    label: key,
    color: color(key),
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
  const legendColor = categoryColorResolver(
    definitions.map(([key]) => key),
  );
  return {
    axis: "category",
    granularity: "month",
    valueFormat: "currency",
    legends: [
      ...definitions.map(([key, label]) => ({
        label,
        color: legendColor(key),
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
  return uniq(postings.map(expenseGroup)).sort();
}

export function buildMonthlyExpenseTimelineSeries(
  postings: Posting[],
  allowedGroups: string[],
  range: { from: dayjs.Dayjs; to: dayjs.Dayjs },
): PeriodSeriesChartData {
  const groups = expenseGroups(postings);
  const selected = allowedGroups.length ? allowedGroups : groups;
  const start = minBy(postings, (posting) => posting.date.valueOf())?.date;
  const end = maxBy(postings, (posting) => posting.date.valueOf())?.date;
  const points: PeriodSeriesChartData["points"] = [];
  const groupedByYear = groupBy(
    postings,
    (posting) => posting.date.format("YYYY"),
  );
  const yearlyAverage = mapValues(groupedByYear, (yearPostings, year) => {
    const activeStart = start?.format("YYYY") === year ? start.month() : 0;
    const activeEnd = end?.format("YYYY") === year ? end.month() : 11;
    const months = Math.max(1, activeEnd - activeStart + 1);
    return sumBy(
      yearPostings.filter((posting) =>
        selected.includes(expenseGroup(posting))
      ),
      (posting) => posting.amount,
    ) / months;
  });
  if (start && end) {
    forEachMonth(start, end, (month) => {
      if (
        month.isBefore(range.from, "month") || month.isAfter(range.to, "month")
      ) return;
      const bucket = postings.filter((posting) =>
        posting.date.isSame(month, "month")
      );
      const values = mapValues(
        groupBy(bucket, expenseGroup),
        (items) => sumBy(items, (item) => item.amount),
      );
      const average = yearlyAverage[month.format("YYYY")] ?? 0;
      points.push({
        period: month.format("MMM-YYYY"),
        timestamp: month.valueOf(),
        values: { ...values, yearlyAverage: average },
        tooltipRows: [
          ...selected.filter((group) => (values[group] ?? 0) !== 0).map((
            group,
          ) => [group, values[group] ?? 0] as [string, number]),
          ["Yearly monthly average", average],
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
        key: "yearlyAverage",
        label: "Yearly Average",
        intent: "line" as const,
        categoryKey: "Average",
        color: "rgb(234, 88, 12)",
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
  const start = minBy(postings, (posting) => posting.date.valueOf())?.date;
  const end = now().startOf("month");
  const points: PeriodSeriesChartData["points"] = [];
  if (start) {
    forEachFinancialYear(start, end, (year) => {
      const key = financialYear(year);
      const bucket = postings.filter((posting) =>
        financialYear(posting.date) === key
      );
      const values = mapValues(
        groupBy(bucket, expenseGroup),
        (items) => sumBy(items, (item) => item.amount),
      );
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
    const nonZero = Object.values(aggregates).filter((item) =>
      item.market_amount !== 0
    );
    const grouped = mapValues(
      groupBy(nonZero, (item) => secondName(item.account)),
      (items) => sumBy(items, (item) => item.market_amount),
    );
    const total = sum(Object.values(grouped));
    const first = Object.values(aggregates)[0];
    return {
      date: first?.date,
      values: mapValues(
        grouped,
        (value) => total ? value / total : 0,
      ),
    };
  }).filter((row) => row.date);
  const groups = uniq(rows.flatMap((row) => Object.keys(row.values))).sort();
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
      ) => [group, row.values[group] ?? 0, "percentage"]),
    })),
  };
}
