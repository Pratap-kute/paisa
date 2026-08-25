import { formatCurrency } from "$lib/shared/formatters/currency";
import { restName, secondName } from "$lib/domain/account";
import type { Income, IncomeYearlyCard } from "$lib/domain/cash_flow";
import type { Legend } from "$lib/shared/charts/types";
import type { Posting } from "$lib/domain/ledger";
import { groupBy, mapValues, sum, sumBy, uniq } from "es-toolkit";
import type dayjs from "dayjs";
import { generateColorScheme } from "$lib/shared/theme/colors";
import { financialColors } from "$lib/shared/theme/chartPalette";
import type {
  PeriodSeriesChartData,
} from "$lib/shared/charts/echarts/period_series";
import { sortBy } from "$lib/shared/utils/collection";

function financialYear(
  card: { start_date: dayjs.Dayjs; end_date: dayjs.Dayjs },
) {
  return `${card.start_date.format("YYYY")} - ${card.end_date.format("YY")}`;
}

function legends(keys: string[], color: (key: string) => string): Legend[] {
  return keys.map((key) => ({
    label: key,
    color: color(key),
    shape: "square",
  }));
}

function initialValues(keys: string[]) {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<string, number>;
}

function postingRows(postings: Posting[], sign = 1): Array<[string, number]> {
  return sortBy(
    postings.map((posting) =>
      [
        restName(posting.account),
        posting.amount * sign,
      ] as [string, number]
    ),
    (row) => row[0],
  );
}

export function incomeGroup(posting: Posting) {
  return secondName(posting.account);
}

export function buildMonthlyIncomeSeries(
  incomes: Income[],
): PeriodSeriesChartData {
  const postings = incomes.flatMap((income) => income.postings);
  const groupKeys = uniq(postings.map((p) => incomeGroup(p))).sort();
  const color = generateColorScheme(groupKeys);
  const groupTotal = mapValues(
    groupBy(postings, (posting) => incomeGroup(posting)),
    (pList, key) => `${key}\n${formatCurrency(sumBy(pList, (p) => -p.amount))}`,
  );
  return {
    axis: "category",
    granularity: "month",
    valueFormat: "currency",
    orientation: "vertical",
    legends: groupKeys.map((key) => ({
      label: groupTotal[key],
      color: color(key),
      shape: "square",
    })),
    series: groupKeys.map((key) => ({
      key,
      label: key,
      intent: "stacked-bar",
      stack: "income",
      color: color(key),
    })),
    points: incomes.map((income) => {
      const values = mapValues(
        groupBy(income.postings, (posting) => incomeGroup(posting)),
        (pList) => sumBy(pList, (p) => -p.amount),
      );
      return {
        period: income.date.format("MMM-YYYY"),
        values: { ...initialValues(groupKeys), ...values },
        tooltipRows: postingRows(income.postings, -1),
      };
    }),
  };
}

export function buildYearlyIncomeSeries(
  yearlyCards: IncomeYearlyCard[],
): PeriodSeriesChartData {
  const groups = uniq(
    yearlyCards.flatMap((card) => card.postings).map((p) =>
      secondName(p.account)
    ),
  ).sort();
  const color = generateColorScheme(groups);
  return {
    axis: "category",
    granularity: "financial-year",
    valueFormat: "currency",
    orientation: "horizontal",
    legends: legends(groups, color),
    series: groups.map((group) => ({
      key: group,
      label: group,
      intent: "stacked-bar",
      stack: "income",
      color: color(group),
    })),
    points: yearlyCards.map((card) => {
      const values = mapValues(
        groupBy(card.postings, (posting) => secondName(posting.account)),
        (pList) => sum(pList.map((p) => -p.amount)),
      );
      return {
        period: financialYear(card),
        values: { ...initialValues(groups), ...values },
        tooltipRows: groups.flatMap((key) =>
          values[key] ? [[key, values[key]] as [string, number]] : []
        ),
      };
    }),
  };
}

export function buildYearlyIncomeValueSeries(
  label: string,
  key: "net_tax" | "net_income",
  color: string,
  yearlyCards: IncomeYearlyCard[],
): PeriodSeriesChartData {
  return {
    axis: "category",
    granularity: "financial-year",
    valueFormat: "currency",
    orientation: "horizontal",
    legends: [{ label, color, shape: "square" }],
    series: [{ key, label, intent: "bar", color }],
    points: yearlyCards.map((card) => ({
      period: financialYear(card),
      values: { [key]: card[key] },
      tooltipRows: [[label, card[key]]],
    })),
  };
}

export function buildYearlyIncomeComparisonSeries(
  yearlyCards: IncomeYearlyCard[],
): PeriodSeriesChartData {
  const income = buildYearlyIncomeSeries(yearlyCards);
  const netIncome = buildYearlyIncomeValueSeries(
    "Net Income",
    "net_income",
    financialColors.gainText,
    yearlyCards,
  );
  const netTax = buildYearlyIncomeValueSeries(
    "Net Tax",
    "net_tax",
    financialColors.lossText,
    yearlyCards,
  );

  return {
    ...income,
    legends: [
      ...(income.legends ?? []),
      ...(netIncome.legends ?? []),
      ...(netTax.legends ?? []),
    ],
    series: [...income.series, ...netIncome.series, ...netTax.series],
    points: income.points.map((point, index) => ({
      ...point,
      values: {
        ...point.values,
        net_income: yearlyCards[index]?.net_income ?? 0,
        net_tax: yearlyCards[index]?.net_tax ?? 0,
      },
      tooltipRows: [
        ...(point.tooltipRows ?? []),
        ["Net Income", yearlyCards[index]?.net_income ?? 0],
        ["Net Tax", yearlyCards[index]?.net_tax ?? 0],
      ],
    })),
  };
}
