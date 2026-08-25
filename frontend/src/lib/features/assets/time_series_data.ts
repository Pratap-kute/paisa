import { now } from "$lib/domain/time";
import { restName, secondName } from "$lib/domain/account";
import type { InvestmentYearlyCard, Networth } from "$lib/domain/assets";
import type { Legend } from "$lib/shared/charts/types";
import type { Posting } from "$lib/domain/ledger";
import { groupBy, sum, uniq } from "es-toolkit";
import type dayjs from "dayjs";
import { generateColorScheme } from "$lib/shared/theme/colors";
import COLORS from "$lib/shared/theme/colors";
import { forEachMonth } from "$lib/shared/formatters/date";
import type {
  PeriodSeriesChartData,
  PeriodSeriesDefinition,
  PeriodSeriesPoint,
} from "$lib/shared/charts/echarts/period_series";
import { minBy, sortBy } from "$lib/shared/utils/collection";

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

export function buildNetworthSeries(points: Networth[]): PeriodSeriesChartData {
  const series: PeriodSeriesDefinition[] = [
    {
      key: "networth",
      label: "Net Worth",
      intent: "line",
      color: COLORS.primary,
    },
    {
      key: "investment",
      label: "Net Investment",
      intent: "line",
      color: COLORS.secondary,
    },
    {
      key: "gain",
      label: "Gain",
      intent: "area",
      color: COLORS.gain,
      areaOpacity: 0.16,
    },
    {
      key: "loss",
      label: "Loss",
      intent: "area",
      color: COLORS.loss,
      areaOpacity: 0.16,
    },
  ];
  return {
    axis: "time",
    granularity: "day",
    valueFormat: "currency",
    legends: series.map((s) => ({
      label: s.label,
      color: s.color ?? "",
      shape: "square",
    })),
    series,
    points: points.map((point) => {
      const investment = point.investmentAmount - point.withdrawalAmount;
      const networth = investment + point.gainAmount;
      return {
        period: point.date.format("DD MMM YYYY"),
        timestamp: point.date.valueOf(),
        values: {
          networth,
          investment,
          gain: point.gainAmount > 0 ? networth : investment,
          loss: point.gainAmount < 0 ? networth : investment,
        },
        tooltipRows: [
          ["Net Worth", networth],
          ["Net Investment", investment],
          ["Gain / Loss", point.gainAmount],
        ],
      };
    }),
  };
}

export function buildMonthlyInvestmentSeries(
  postings: Posting[],
): PeriodSeriesChartData {
  const timeFormat = "MMM-YYYY";
  const groups = uniq(postings.map((p) => secondName(p.account))).sort();
  const groupKeys = groups.flatMap((group) => [
    `${group}-credit`,
    `${group}-debit`,
  ]);
  const color = generateColorScheme(groups);
  const groupedPostings = groupBy(postings, (p) => p.date.format(timeFormat));
  const start = minBy(postings.map((p) => p.date), (d) => d.valueOf());
  const end = now().startOf("month");
  const points: PeriodSeriesPoint[] = [];

  if (start) {
    forEachMonth(start, end, (month) => {
      const bucket = groupedPostings[month.format(timeFormat)] ?? [];
      const bySecondName = groupBy(
        bucket,
        (posting) => secondName(posting.account),
      );
      const values = initialValues(groupKeys);
      for (const [key, pList] of Object.entries(bySecondName)) {
        values[`${key}-credit`] = sum(
          pList.map((p) => p.amount).filter((amount) => amount >= 0),
        );
        values[`${key}-debit`] = sum(
          pList.map((p) => p.amount).filter((amount) => amount < 0),
        );
      }
      points.push({
        period: month.format(timeFormat),
        values: { ...values },
        tooltipRows: postingRows(bucket),
      });
    });
  }

  return {
    axis: "category",
    granularity: "month",
    valueFormat: "currency",
    orientation: "vertical",
    legends: legends(groups, color),
    series: groupKeys.map((key) => {
      const group = key.replace("-credit", "").replace("-debit", "");
      return {
        key,
        label: group,
        intent: "stacked-bar",
        stack: key.endsWith("-credit") ? "credit" : "debit",
        color: color(group),
      };
    }),
    points,
  };
}

export function buildYearlyInvestmentSeries(
  yearlyCards: InvestmentYearlyCard[],
): PeriodSeriesChartData {
  const groups = uniq(
    yearlyCards.flatMap((card) => card.postings).map((p) =>
      secondName(p.account)
    ),
  ).sort();
  const groupKeys = groups.flatMap((group) => [
    `${group}-credit`,
    `${group}-debit`,
  ]);
  const color = generateColorScheme(groups);
  const points = yearlyCards.map((card) => {
    const bySecondName = groupBy(
      card.postings,
      (posting) => secondName(posting.account),
    );
    const values = initialValues(groupKeys);
    for (const [key, pList] of Object.entries(bySecondName)) {
      values[`${key}-credit`] = sum(
        pList.map((p) => p.amount).filter((amount) => amount >= 0),
      );
      values[`${key}-debit`] = sum(
        pList.map((p) => p.amount).filter((amount) => amount < 0),
      );
    }
    return {
      period: financialYear(card),
      values: { ...values },
      tooltipRows: groupKeys.flatMap((key) =>
        values[key]
          ? [
            [key.replace("-credit", "").replace("-debit", ""), values[key]] as [
              string,
              number,
            ],
          ]
          : []
      ),
    };
  });

  return {
    axis: "category",
    granularity: "financial-year",
    valueFormat: "currency",
    orientation: "horizontal",
    legends: legends(groups, color),
    series: groupKeys.map((key) => {
      const group = key.replace("-credit", "").replace("-debit", "");
      return {
        key,
        label: group,
        intent: "stacked-bar",
        stack: key.endsWith("-credit") ? "credit" : "debit",
        color: color(group),
      };
    }),
    points,
  };
}

export function buildGainAccountSeries(
  points: Networth[],
): PeriodSeriesChartData {
  return {
    axis: "time",
    granularity: "day",
    valueFormat: "currency",
    legends: [
      { label: "balance", color: COLORS.primary, shape: "square" },
      { label: "investment", color: COLORS.secondary, shape: "square" },
      { label: "gain", color: COLORS.gain, shape: "square" },
      { label: "loss", color: COLORS.loss, shape: "square" },
    ],
    series: [
      {
        key: "balance",
        label: "Balance",
        intent: "line",
        color: COLORS.primary,
      },
      {
        key: "investment",
        label: "Net Investment",
        intent: "line",
        color: COLORS.secondary,
      },
      {
        key: "gain",
        label: "Gain",
        intent: "area",
        color: COLORS.gain,
        areaOpacity: 0.16,
      },
      {
        key: "loss",
        label: "Loss",
        intent: "area",
        color: COLORS.loss,
        areaOpacity: 0.16,
      },
    ],
    points: points.map((point) => ({
      period: point.date.format("DD MMM YYYY"),
      timestamp: point.date.valueOf(),
      values: {
        balance: point.balanceAmount,
        investment: point.netInvestmentAmount,
        gain: point.gainAmount > 0
          ? point.balanceAmount
          : point.netInvestmentAmount,
        loss: point.gainAmount < 0
          ? point.balanceAmount
          : point.netInvestmentAmount,
      },
      tooltipRows: [
        ["Balance", point.balanceAmount],
        ["Net Investment", point.netInvestmentAmount],
        ["Gain / Loss", point.gainAmount],
      ],
    })),
  };
}
