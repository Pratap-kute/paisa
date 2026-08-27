import { formatCurrency } from "$lib/shared/formatters/currency";
import { groupSumBy, sumPostings } from "$lib/domain/transactions";
import { now } from "$lib/domain/time";
import type { Forecast } from "$lib/domain/goals_models";
import type { Point } from "$lib/domain/goals_models";
import type { Posting } from "$lib/domain/ledger";
import { groupBy } from "es-toolkit";
import COLORS from "$lib/shared/theme/colors";
import { iconify } from "$lib/shared/ui/icon";
import type {
  PeriodSeriesChartData,
  PeriodSeriesPoint,
} from "$lib/shared/charts/echarts/period_series";
import { sortBy } from "$lib/shared/utils/collection";

export function buildGoalProgressSeries(
  points: Point[],
  predictions: Forecast[],
  breakPoints: Point[],
  targetSavings: number,
): PeriodSeriesChartData {
  const forecastPoints = points.slice(-1).concat(predictions);
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
    points: sortBy(
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
  const groupedPostings = groupBy(postings, (p) => p.date.format(timeFormat));
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
      tooltipRows: sortBy(
        Object.entries(groupSumBy(bucket, (p) => p.account)).map((
          [account, amount],
        ) => [iconify(account), amount] as [string, number]),
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
