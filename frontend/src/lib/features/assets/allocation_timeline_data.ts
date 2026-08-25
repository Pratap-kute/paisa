import { secondName } from "$lib/domain/account";
import { groupBy, mapValues, sum, sumBy, uniq } from "es-toolkit";
import type { PeriodSeriesChartData } from "$lib/shared/charts/echarts/period_series";
import type { Aggregate } from "$lib/domain/assets";
import { categoryLegends } from "$lib/shared/charts/category";

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
