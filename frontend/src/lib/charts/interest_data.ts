import dayjs from "dayjs";
import _ from "lodash";
import COLORS from "$lib/core/colors";
import {
  type Interest,
  type InterestOverview,
  restName,
} from "$lib/core/utils";
import type { ComparisonBarChartData } from "$lib/charts/echarts/bar_comparison";
import type { PeriodSeriesChartData } from "$lib/charts/echarts/period_series";

export interface InterestSummary {
  account: string;
  label: string;
  drawn: number;
  repaid: number;
  interest: number;
  balance: number;
  apr: number;
}

export function padTimeDomain(
  start: dayjs.Dayjs,
  end: dayjs.Dayjs,
): [dayjs.Dayjs, dayjs.Dayjs] {
  return start.isSame(end)
    ? [start.subtract(1, "day"), end.add(1, "day")]
    : [start, end];
}

export function timelineDomain(
  points: InterestOverview[],
): [dayjs.Dayjs, dayjs.Dayjs] | null {
  const dates = points.map((point) => point.date).filter(Boolean);
  const start = _.minBy(dates, (date) => date.valueOf());
  const end = _.maxBy(dates, (date) => date.valueOf());
  return start && end ? padTimeDomain(start, end) : null;
}

export function interestSummary(interest: Interest): InterestSummary {
  const current = _.last(interest.overview_timeline);
  const drawn = current?.drawn_amount ?? 0;
  const repaid = current?.repaid_amount ?? 0;
  const interestAmount = current?.interest_amount ?? 0;
  return {
    account: interest.account,
    label: restName(interest.account),
    drawn,
    repaid,
    interest: interestAmount,
    balance: drawn + interestAmount - repaid,
    apr: interest.apr,
  };
}

export function buildInterestOverviewComparison(
  interests: Interest[],
): ComparisonBarChartData {
  return {
    valueFormat: "currency",
    valueLabel: "Balance",
    sort: "input",
    points: _.sortBy(
      interests.map(interestSummary),
      (summary) => summary.account,
    ).map((summary) => ({
      key: summary.account,
      label: summary.label,
      value: summary.balance,
      target: summary.drawn,
      secondaryValue: summary.apr,
      secondaryLabel: "APR",
      color: summary.interest >= 0 ? COLORS.loss : COLORS.gain,
      tooltipRows: [
        { label: "Loan drawn", value: summary.drawn, format: "currency" },
        { label: "Loan repaid", value: summary.repaid, format: "currency" },
        { label: "Interest", value: summary.interest, format: "currency" },
        { label: "Balance", value: summary.balance, format: "currency" },
        { label: "APR", value: summary.apr / 100, format: "percentage" },
      ],
    })),
  };
}

export function buildInterestTimelineSeries(
  interest: Interest,
): PeriodSeriesChartData {
  return {
    axis: "time",
    granularity: "month",
    valueFormat: "currency",
    series: [
      {
        key: "drawn",
        label: "Drawn",
        intent: "line",
        color: COLORS.secondary,
        showSymbol: false,
      },
      {
        key: "repaid",
        label: "Repaid",
        intent: "line",
        color: COLORS.tertiary,
        showSymbol: false,
      },
      {
        key: "balance",
        label: "Balance",
        intent: "line",
        color: COLORS.primary,
        showSymbol: false,
      },
      {
        key: "interestGain",
        label: "Interest gain",
        intent: "area",
        color: COLORS.gain,
        areaOpacity: 0.18,
      },
      {
        key: "interestLoss",
        label: "Interest cost",
        intent: "area",
        color: COLORS.loss,
        areaOpacity: 0.18,
      },
    ],
    points: interest.overview_timeline.map((point) => {
      const balance = point.drawn_amount + point.interest_amount -
        point.repaid_amount;
      return {
        period: point.date.format("DD MMM YYYY"),
        timestamp: point.date.valueOf(),
        values: {
          drawn: point.drawn_amount,
          repaid: point.repaid_amount,
          balance,
          interestGain: point.interest_amount < 0
            ? Math.abs(point.interest_amount)
            : null,
          interestLoss: point.interest_amount > 0
            ? point.interest_amount
            : null,
        },
        tooltipRows: [
          ["Drawn", point.drawn_amount],
          ["Repaid", point.repaid_amount],
          ["Interest", point.interest_amount],
          ["Balance", balance],
        ],
      };
    }),
  };
}
