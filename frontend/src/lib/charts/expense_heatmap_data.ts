import dayjs from "dayjs";
import type { Posting } from "$lib/core/utils";
import { expenseGroup } from "$lib/charts/expense";

export interface ExpenseHeatmapTooltipRow {
  label: string;
  detail?: string;
  value: number;
}

export interface ExpenseHeatmapDatum {
  key: string;
  label: string;
  value: number;
  tooltipRows: ExpenseHeatmapTooltipRow[];
  hasActivity: boolean;
}

export interface ExpenseHeatmapData {
  granularity: "day" | "month";
  period: string;
  points: ExpenseHeatmapDatum[];
  maxValue: number;
}

function selected(postings: Posting[], groups: string[]) {
  return groups.length === 0
    ? postings
    : postings.filter((posting) => groups.includes(expenseGroup(posting)));
}

function grouped(postings: Posting[], key: (posting: Posting) => string) {
  return postings.reduce<Record<string, Posting[]>>((result, posting) => {
    (result[key(posting)] ??= []).push(posting);
    return result;
  }, {});
}

function total(postings: Posting[]) {
  return postings.reduce((sum, posting) => sum + posting.amount, 0);
}

export function buildMonthlyExpenseHeatmapData(
  month: string,
  postings: Posting[] = [],
  groups: string[] = [],
): ExpenseHeatmapData {
  const filtered = selected(postings, groups);
  const byDay = grouped(
    filtered,
    (posting) => posting.date.format("YYYY-MM-DD"),
  );
  const start = dayjs(`${month}-01`);
  const points = Array.from({ length: start.daysInMonth() }, (_, index) => {
    const date = start.date(index + 1);
    const rows = byDay[date.format("YYYY-MM-DD")] ?? [];
    return {
      key: date.format("YYYY-MM-DD"),
      label: date.format("DD MMM YYYY"),
      value: total(rows),
      tooltipRows: rows.map((posting) => ({
        label: posting.payee || expenseGroup(posting),
        detail: posting.account,
        value: posting.amount,
      })),
      hasActivity: rows.length > 0,
    };
  });
  return {
    granularity: "day",
    period: month,
    points,
    maxValue: Math.max(0, ...points.map((point) => point.value)),
  };
}

export function buildYearlyExpenseHeatmapData(
  financialYearLabel: string,
  postings: Posting[] = [],
  groups: string[] = [],
  startingMonth = USER_CONFIG.financial_year_starting_month,
): ExpenseHeatmapData {
  const filtered = selected(postings, groups);
  const byMonth = grouped(
    filtered,
    (posting) => posting.date.format("YYYY-MM"),
  );
  const firstYear = Number(financialYearLabel.split("-")[0]);
  const start = dayjs(
    `${firstYear}-${String(startingMonth).padStart(2, "0")}-01`,
  );
  const points = Array.from({ length: 12 }, (_, index) => {
    const month = start.add(index, "month");
    const rows = byMonth[month.format("YYYY-MM")] ?? [];
    const byCategory = grouped(rows, expenseGroup);
    const byAccount = Object.entries(byCategory)
      .map(([category, categoryRows]) => ({
        label: category,
        value: total(categoryRows),
      }))
      .sort((a, b) => b.value - a.value);
    return {
      key: month.format("YYYY-MM"),
      label: month.format("MMM YYYY"),
      value: total(rows),
      tooltipRows: byAccount,
      hasActivity: rows.length > 0,
    };
  });
  return {
    granularity: "month",
    period: financialYearLabel,
    points,
    maxValue: Math.max(0, ...points.map((point) => point.value)),
  };
}
