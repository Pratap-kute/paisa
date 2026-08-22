import { chartFormatters } from "$lib/charts/echarts/formatters";
import type { PaisaChartTheme } from "$lib/charts/echarts/theme";
import type { IncomeStatementWaterfallData } from "$lib/charts/income_statement_data";

export function buildIncomeStatementWaterfallOption(
  data: IncomeStatementWaterfallData,
  options: { width?: number; theme?: PaisaChartTheme; darkMode?: boolean } = {},
) {
  const theme = options.theme;
  const mobile = (options.width ?? 0) > 0 && (options.width ?? 0) < 640;
  const colorFor = (delta: number) =>
    delta >= 0
      ? theme?.positiveColor ?? "#16a34a"
      : theme?.negativeColor ?? "#dc2626";
  return {
    animationDuration: 250,
    grid: {
      top: 24,
      right: 18,
      bottom: mobile ? 84 : 58,
      left: mobile ? 50 : 74,
      containLabel: true,
    },
    tooltip: {
      trigger: "item",
      confine: true,
      backgroundColor: theme?.tooltipSurfaceColor,
      borderColor: theme?.borderColor,
      textStyle: { color: theme?.textColor },
      formatter: (params: { seriesName?: string; dataIndex?: number }) => {
        if (params.seriesName === "Base") return "";
        const step = data.steps[params.dataIndex ?? 0];
        if (!step) return "";
        return [
          `<strong>${step.label}</strong>`,
          `Start: <strong>${chartFormatters.currency(step.start)}</strong>`,
          `Change: <strong>${chartFormatters.currency(step.delta)}</strong>`,
          `End: <strong>${chartFormatters.currency(step.end)}</strong>`,
          ...step.breakdown.map((row) =>
            `${row.account}: <strong>${
              chartFormatters.currency(row.value)
            }</strong>`
          ),
        ].join("<br/>");
      },
    },
    xAxis: {
      type: "category",
      data: data.steps.map((step) => step.label),
      axisLabel: {
        color: theme?.mutedColor,
        rotate: mobile ? 42 : 18,
        interval: 0,
        overflow: "truncate",
        width: mobile ? 62 : 100,
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: theme?.mutedColor,
        formatter: chartFormatters.compactCurrency,
      },
      splitLine: {
        lineStyle: {
          color: theme?.gridColor,
          opacity: options.darkMode ? 0.28 : 0.45,
        },
      },
    },
    series: [
      {
        name: "Base",
        type: "bar",
        stack: "waterfall",
        silent: true,
        itemStyle: { color: "transparent" },
        emphasis: { disabled: true },
        data: data.steps.map((step) =>
          step.id === "start" || step.id === "end"
            ? 0
            : Math.min(step.start, step.end)
        ),
      },
      {
        name: "Change",
        type: "bar",
        stack: "waterfall",
        barMaxWidth: mobile ? 28 : 52,
        data: data.steps.map((step) => ({
          value: step.id === "start" || step.id === "end"
            ? step.end
            : Math.abs(step.delta),
          itemStyle: { color: colorFor(step.delta), opacity: 0.82 },
        })),
        label: {
          show: !mobile,
          position: "top",
          color: theme?.textColor,
          formatter: (params: { dataIndex: number }) =>
            chartFormatters.compactCurrency(
              data.steps[params.dataIndex]?.delta ?? 0,
            ),
        },
      },
    ],
  };
}
