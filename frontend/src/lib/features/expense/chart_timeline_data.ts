import dayjs from "dayjs";
import { financialYear } from "$lib/domain/time";
import { forEachMonth } from "$lib/shared/formatters/date";
import { now } from "$lib/domain/time";
import { forEachFinancialYear } from "$lib/shared/formatters/date";
import type { Posting } from "$lib/domain/ledger";
import { groupBy, mapValues, sumBy, uniq } from "es-toolkit";
import type { PeriodSeriesChartData } from "$lib/shared/charts/echarts/period_series";
import { expenseGroup } from "$lib/features/expense/expense";
import { maxBy, minBy } from "$lib/shared/utils/collection";

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
