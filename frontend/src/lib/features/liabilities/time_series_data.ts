import { now } from "$lib/domain/time";
import { restName } from "$lib/domain/account";
import type { Posting } from "$lib/domain/ledger";
import { groupBy, mapValues, sum, uniq } from "es-toolkit";
import { generateColorScheme } from "$lib/shared/theme/colors";
import { forEachMonth } from "$lib/shared/formatters/date";
import { iconify } from "$lib/shared/ui/icon";
import type {
  PeriodSeriesChartData,
  PeriodSeriesPoint,
} from "$lib/shared/charts/echarts/period_series";
import { minBy, sortBy } from "$lib/shared/utils/collection";

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

export function buildRepaymentSeries(
  postings: Posting[],
): PeriodSeriesChartData {
  const timeFormat = "MMM-YYYY";
  const groups = uniq(postings.map((p) => restName(p.account))).sort();
  const color = generateColorScheme(groups);
  const groupedPostings = groupBy(postings, (p) => p.date.format(timeFormat));
  const start = minBy(postings.map((p) => p.date), (d) => d.valueOf());
  const end = now().startOf("month");
  const points: PeriodSeriesPoint[] = [];

  if (start) {
    forEachMonth(start, end, (month) => {
      const bucket = groupedPostings[month.format(timeFormat)] ?? [];
      const values = mapValues(
        groupBy(bucket, (posting) => restName(posting.account)),
        (pList) => sum(pList.map((p) => p.amount)),
      );
      points.push({
        period: month.format(timeFormat),
        values: { ...initialValues(groups), ...values },
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
