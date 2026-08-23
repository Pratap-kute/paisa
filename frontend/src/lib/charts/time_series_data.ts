import _ from "lodash";
import type dayjs from "dayjs";
import { generateColorScheme } from "$lib/core/colors";
import COLORS from "$lib/core/colors";
import { financialColors } from "$lib/theme/chartPalette";
import {
  forEachMonth,
  type Forecast,
  formatCurrency,
  groupSumBy,
  type Income,
  type IncomeYearlyCard,
  type InvestmentYearlyCard,
  type Legend,
  type Networth,
  now,
  type Point,
  type Posting,
  restName,
  secondName,
  sumPostings,
} from "$lib/core/utils";
import { iconify } from "$lib/core/icon";
import type {
  PeriodSeriesChartData,
  PeriodSeriesDefinition,
  PeriodSeriesPoint,
} from "$lib/charts/echarts/period_series";

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

function emptyValues(keys: string[]) {
  return _.zipObject(keys, keys.map(() => 0)) as Record<string, number>;
}

function postingRows(postings: Posting[], sign = 1): Array<[string, number]> {
  return _.sortBy(
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
  const groups = _.chain(postings).map((p) => secondName(p.account)).uniq()
    .sort().value();
  const groupKeys = _.flatMap(
    groups,
    (group) => [`${group}-credit`, `${group}-debit`],
  );
  const color = generateColorScheme(groups);
  const groupedPostings = _.groupBy(postings, (p) => p.date.format(timeFormat));
  const start = _.min(postings.map((p) => p.date));
  const end = now().startOf("month");
  const points: PeriodSeriesPoint[] = [];

  if (start) {
    forEachMonth(start, end, (month) => {
      const bucket = groupedPostings[month.format(timeFormat)] ?? [];
      const values = _.chain(bucket)
        .groupBy((posting) => secondName(posting.account))
        .flatMap((postings, key) => [
          [
            `${key}-credit`,
            _.sum(
              postings.map((p) => p.amount).filter((amount) => amount >= 0),
            ),
          ],
          [
            `${key}-debit`,
            _.sum(postings.map((p) => p.amount).filter((amount) => amount < 0)),
          ],
        ])
        .fromPairs()
        .value();
      points.push({
        period: month.format(timeFormat),
        values: { ...emptyValues(groupKeys), ...values },
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
  const groups = _.chain(yearlyCards).flatMap((card) => card.postings).map((
    p,
  ) => secondName(p.account)).uniq().sort().value();
  const groupKeys = _.flatMap(
    groups,
    (group) => [`${group}-credit`, `${group}-debit`],
  );
  const color = generateColorScheme(groups);
  const points = yearlyCards.map((card) => {
    const values = _.chain(card.postings)
      .groupBy((posting) => secondName(posting.account))
      .flatMap((postings, key) => [
        [
          `${key}-credit`,
          _.sum(postings.map((p) => p.amount).filter((amount) => amount >= 0)),
        ],
        [
          `${key}-debit`,
          _.sum(postings.map((p) => p.amount).filter((amount) => amount < 0)),
        ],
      ])
      .fromPairs()
      .value();
    return {
      period: financialYear(card),
      values: { ...emptyValues(groupKeys), ...values },
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

export function incomeGroup(posting: Posting) {
  return secondName(posting.account);
}

export function buildMonthlyIncomeSeries(
  incomes: Income[],
): PeriodSeriesChartData {
  const postings = _.flatMap(incomes, (income) => income.postings);
  const groupKeys = _.chain(postings).map((p) => incomeGroup(p)).uniq().sort()
    .value();
  const color = generateColorScheme(groupKeys);
  const groupTotal = _.chain(postings)
    .groupBy((posting) => incomeGroup(posting))
    .map((
      postings,
      key,
    ) => [
      key,
      `${key}\n${formatCurrency(_.sumBy(postings, (p) => -p.amount))}`,
    ])
    .fromPairs()
    .value();
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
      const values = _.chain(income.postings)
        .groupBy((posting) => incomeGroup(posting))
        .map((postings, key) => [key, _.sumBy(postings, (p) => -p.amount)])
        .fromPairs()
        .value();
      return {
        period: income.date.format("MMM-YYYY"),
        values: { ...emptyValues(groupKeys), ...values },
        tooltipRows: postingRows(income.postings, -1),
      };
    }),
  };
}

export function buildYearlyIncomeSeries(
  yearlyCards: IncomeYearlyCard[],
): PeriodSeriesChartData {
  const groups = _.chain(yearlyCards).flatMap((card) => card.postings).map((
    p,
  ) => secondName(p.account)).uniq().sort().value();
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
      const values = _.chain(card.postings)
        .groupBy((posting) => secondName(posting.account))
        .map((postings, key) => [key, _.sum(postings.map((p) => -p.amount))])
        .fromPairs()
        .value();
      return {
        period: financialYear(card),
        values: { ...emptyValues(groups), ...values },
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

export function buildRepaymentSeries(
  postings: Posting[],
): PeriodSeriesChartData {
  const timeFormat = "MMM-YYYY";
  const groups = _.chain(postings).map((p) => restName(p.account)).uniq().sort()
    .value();
  const color = generateColorScheme(groups);
  const groupedPostings = _.groupBy(postings, (p) => p.date.format(timeFormat));
  const start = _.min(postings.map((p) => p.date));
  const end = now().startOf("month");
  const points: PeriodSeriesPoint[] = [];

  if (start) {
    forEachMonth(start, end, (month) => {
      const bucket = groupedPostings[month.format(timeFormat)] ?? [];
      const values = _.chain(bucket)
        .groupBy((posting) => restName(posting.account))
        .map((postings, key) => [key, _.sum(postings.map((p) => p.amount))])
        .fromPairs()
        .value();
      points.push({
        period: month.format(timeFormat),
        values: { ...emptyValues(groups), ...values },
        tooltipRows: postingRows(bucket),
      });
    });
  }

  return {
    axis: "category",
    granularity: "month",
    valueFormat: "currency",
    legends: groups.map((group) => ({
      label: iconify(group, { group: "Liabilities" }),
      color: color(group),
      shape: "square",
    })),
    series: groups.map((group) => ({
      key: group,
      label: group,
      intent: "stacked-bar",
      stack: "repayment",
      color: color(group),
    })),
    points,
  };
}

export function buildGoalProgressSeries(
  points: Point[],
  predictions: Forecast[],
  breakPoints: Point[],
  targetSavings: number,
): PeriodSeriesChartData {
  const forecastPoints = _.takeRight(points, 1).concat(predictions);
  const progressRow = (value: number): [string, number, "percentage"] => [
    "Progress",
    targetSavings ? value / targetSavings : 0,
    "percentage",
  ];
  return {
    axis: "time",
    granularity: "day",
    valueFormat: "currency",
    legends: [
      { label: "Actual", color: COLORS.secondary, shape: "square" },
      { label: "Forecast", color: COLORS.primary, shape: "square" },
      { label: "Milestone", color: COLORS.tertiary, shape: "square" },
    ],
    series: [
      {
        key: "actual",
        label: "Actual",
        intent: "line",
        color: COLORS.secondary,
      },
      {
        key: "forecast",
        label: "Forecast",
        intent: "line",
        dashed: true,
        color: COLORS.primary,
      },
      {
        key: "forecastBandHigh",
        label: "Forecast Range",
        intent: "area",
        color: COLORS.primary,
        areaOpacity: 0.12,
      },
      {
        key: "milestone",
        label: "Milestone",
        intent: "bar",
        color: COLORS.tertiary,
      },
    ],
    points: _.sortBy(
      [
        ...points.map((point) => ({
          period: point.date.format("DD MMM YYYY"),
          timestamp: point.date.valueOf(),
          values: { actual: point.value },
          tooltipRows: [
            ["Savings", point.value] as [string, number],
            progressRow(point.value),
          ],
        })),
        ...forecastPoints.map((point) => ({
          period: point.date.format("DD MMM YYYY"),
          timestamp: point.date.valueOf(),
          values: {
            forecast: point.value,
            forecastBandHigh: point.value +
              (typeof (point as Forecast).error === "number"
                ? (point as Forecast).error / 2
                : 0),
          },
          tooltipRows: [
            ["Forecast", point.value] as [string, number],
            progressRow(point.value),
          ],
        })),
        ...breakPoints.map((point) => ({
          period: point.date.format("DD MMM YYYY"),
          timestamp: point.date.valueOf(),
          values: { milestone: point.value },
          tooltipRows: [
            ["Milestone", point.value] as [string, number],
            progressRow(point.value),
          ],
        })),
      ] satisfies PeriodSeriesPoint[],
      (point) => point.timestamp ?? 0,
    ),
  };
}

export function buildGoalInvestmentSeries(
  postings: Posting[],
  pmt: number,
): PeriodSeriesChartData {
  const timeFormat = "MMM YYYY";
  const groupedPostings = _.groupBy(postings, (p) => p.date.format(timeFormat));
  const months = 24;
  let start = now().startOf("month").subtract(months, "months");
  const points: PeriodSeriesPoint[] = [];
  while (start.isBefore(now())) {
    const month = start.format(timeFormat);
    const bucket = groupedPostings[month] ?? [];
    const total = sumPostings(bucket);
    points.push({
      period: month,
      values: { total },
      tooltipRows: _.sortBy(
        _.map(groupSumBy(bucket, (p) => p.account), (amount, account) =>
          [
            iconify(account),
            amount,
          ] as [string, number]),
        (row) => row[0],
      ),
    });
    start = start.add(1, "month");
  }
  return {
    axis: "category",
    granularity: "month",
    valueFormat: "currency",
    legends: [{
      label: "Investment",
      color: COLORS.secondary,
      shape: "square",
    }],
    series: [{
      key: "total",
      label: "Investment",
      intent: "bar",
      positiveColor: COLORS.secondary,
      negativeColor: COLORS.tertiary,
      markLine: pmt > 0
        ? { value: pmt, label: formatCurrency(pmt) }
        : undefined,
    }],
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
