import { chartFormatters } from "$lib/charts/echarts/formatters";
import type { PaisaChartTheme } from "$lib/charts/echarts/theme";
import type { ExpenseHeatmapData } from "$lib/charts/expense_heatmap_data";
import chroma from "chroma-js";

interface Options {
  compact?: boolean;
  theme?: PaisaChartTheme;
}

function intensityColor(
  value: number,
  maxValue: number,
  theme?: PaisaChartTheme,
) {
  const ratio = maxValue > 0 ? Math.max(0, Math.min(1, value / maxValue)) : 0;
  return chroma.mix(
    theme?.surfaceColor ?? "#ffffff",
    theme?.negativeColor ?? "#dc2626",
    ratio,
    "lab",
  ).hex();
}

function tooltip(
  data: ExpenseHeatmapData,
  params: { dataIndex: number; value?: unknown[] },
) {
  const key = typeof params.value?.[0] === "string"
    ? params.value[0]
    : undefined;
  const point = key
    ? data.points.find((candidate) => candidate.key === key)
    : data.points[params.dataIndex];
  if (!point) return "";
  const rows = point.tooltipRows.length
    ? point.tooltipRows.map((row) =>
      `${row.label}${row.detail ? ` (${row.detail})` : ""}: <strong>${
        chartFormatters.currency(row.value)
      }</strong>`
    )
    : ["No expense activity"];
  return [
    `<strong>${point.label}</strong>`,
    ...rows,
    point.hasActivity
      ? `Total: <strong>${chartFormatters.currency(point.value)}</strong>`
      : "",
  ].filter(Boolean).join("<br/>");
}

export function buildYearlyExpenseHeatmapOption(
  data: ExpenseHeatmapData,
  options: Options = {},
) {
  const theme = options.theme;
  const mobile = options.compact ?? false;
  const common = {
    animation: false,
    backgroundColor: "transparent",
    textStyle: {
      color: theme?.mutedColor,
      fontFamily: theme?.fontFamily,
    },
    tooltip: {
      trigger: "item",
      confine: true,
      borderColor: theme?.borderColor,
      backgroundColor: theme?.tooltipSurfaceColor,
      textStyle: { color: theme?.tooltipTextColor ?? theme?.textColor },
      formatter: (params: { dataIndex: number; value?: unknown[] }) =>
        tooltip(data, params),
    },
  };

  return {
    ...common,
    grid: { top: 20, left: 12, right: 12, bottom: 34, containLabel: true },
    xAxis: {
      type: "category",
      data: data.points.map((point) => point.label.split(" ")[0]),
      axisLabel: {
        color: theme?.mutedColor,
        interval: 0,
        fontSize: mobile ? 10 : 12,
      },
      axisLine: { lineStyle: { color: theme?.borderColor } },
      axisTick: { show: false },
    },
    yAxis: { type: "category", data: ["Expenses"], show: false },
    series: [{
      type: "heatmap",
      data: data.points.map((point, index) => ({
        value: [index, 0, point.value],
        itemStyle: point.hasActivity && point.value === 0
          ? {
            color: theme?.surfaceColor,
            borderColor: theme?.primaryColor,
            borderWidth: 2,
          }
          : !point.hasActivity
          ? { color: theme?.surfaceColor }
          : { color: intensityColor(point.value, data.maxValue, theme) },
      })),
      label: {
        show: !mobile,
        color: theme?.textColor,
        formatter: (p: { value: [number, number, number] }) =>
          p.value[2] === 0 ? "" : chartFormatters.compactCurrency(p.value[2]),
      },
      itemStyle: { borderColor: theme?.surfaceColor, borderWidth: 3 },
    }],
  };
}
