import { chartFormatters } from "$lib/charts/echarts/formatters";
import type { PaisaChartTheme } from "$lib/charts/echarts/theme";
import type { ExpenseHeatmapData } from "$lib/charts/expense_heatmap_data";

interface Options {
  width?: number;
  theme?: PaisaChartTheme;
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

export function buildExpenseHeatmapOption(
  data: ExpenseHeatmapData,
  options: Options = {},
) {
  const theme = options.theme;
  const mobile = (options.width ?? 0) > 0 && (options.width ?? 0) < 640;
  const colors = [
    theme?.surfaceColor ?? "transparent",
    theme?.negativeColor ?? "#dc2626",
  ];
  const common = {
    animationDuration: 250,
    backgroundColor: "transparent",
    textStyle: {
      color: theme?.mutedColor,
      fontFamily: "var(--paisa-font-sans)",
    },
    tooltip: {
      trigger: "item",
      confine: true,
      borderColor: theme?.borderColor,
      backgroundColor: theme?.tooltipSurfaceColor,
      textStyle: { color: theme?.textColor },
      formatter: (params: { dataIndex: number; value?: unknown[] }) =>
        tooltip(data, params),
    },
    visualMap: {
      min: 0,
      max: Math.max(data.maxValue, 1),
      show: false,
      inRange: { color: colors },
    },
  };

  if (data.granularity === "day") {
    return {
      ...common,
      calendar: {
        top: mobile ? 36 : 42,
        left: mobile ? 8 : 28,
        right: mobile ? 8 : 28,
        bottom: 20,
        range: data.period,
        cellSize: ["auto", mobile ? 38 : 52],
        splitLine: { lineStyle: { color: theme?.borderColor, width: 1 } },
        itemStyle: {
          color: theme?.surfaceColor,
          borderColor: theme?.borderColor,
        },
        dayLabel: { color: theme?.mutedColor, firstDay: 1, nameMap: "en" },
        monthLabel: { show: false },
        yearLabel: { show: false },
      },
      series: [{
        type: "heatmap",
        coordinateSystem: "calendar",
        data: data.points.filter((point) => point.hasActivity).map((
          point,
        ) => [point.key, point.value]),
        label: {
          show: !mobile,
          color: theme?.textColor,
          formatter: (p: { value: [string, number] }) =>
            String(Number(p.value[0].slice(-2))),
        },
      }],
    };
  }

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
      data: data.points.map((point, index) => [index, 0, point.value]),
      label: {
        show: !mobile,
        color: theme?.textColor,
        formatter: (p: { value: [number, number, number] }) =>
          chartFormatters.compactCurrency(p.value[2]),
      },
      itemStyle: { borderColor: theme?.surfaceColor, borderWidth: 3 },
    }],
  };
}
