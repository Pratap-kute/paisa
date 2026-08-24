import { chartFormatters } from "$lib/charts/echarts/formatters";
import type { PaisaChartTheme } from "$lib/charts/echarts/theme";
import type { IncomeStatementWaterfallData } from "$lib/charts/income_statement_data";
import { responsiveChartOption } from "$lib/charts/echarts/responsive";

export function incomeStatementAxisRange(data: IncomeStatementWaterfallData) {
  const values = data.steps.flatMap((step) =>
    step.id === "start" || step.id === "end"
      ? [step.end]
      : [step.start, step.end]
  );
  if (values.length === 0) return { min: 0, max: 1 };
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const span = maximum - minimum;
  const padding = Math.max(span * 0.08, Math.abs(maximum) * 0.01, 1);

  return {
    min: Math.floor((minimum - padding) / padding) * padding,
    max: Math.ceil((maximum + padding) / padding) * padding,
  };
}

function buildIncomeStatementWaterfallLayout(
  data: IncomeStatementWaterfallData,
  options: { theme?: PaisaChartTheme; darkMode?: boolean } = {},
  mobile = false,
) {
  const theme = options.theme;
  const axisRange = incomeStatementAxisRange(data);
  const colorFor = (delta: number) =>
    delta >= 0
      ? theme?.positiveColor ?? "#16a34a"
      : theme?.negativeColor ?? "#dc2626";
  const baseOption = {
    animation: false,
    textStyle: { fontFamily: theme?.fontFamily, color: theme?.mutedColor },
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
      extraCssText:
        "max-width: 340px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4); border-radius: 8px;",
      textStyle: {
        color: theme?.tooltipTextColor ?? theme?.textColor,
        fontSize: 12,
      },
      formatter: (params: { seriesName?: string; dataIndex?: number }) => {
        if (params.seriesName === "Base") return "";
        const step = data.steps[params.dataIndex ?? 0];
        if (!step) return "";
        const lines = [
          `<strong>${step.label}</strong>`,
          `Start: <strong>${chartFormatters.currency(step.start)}</strong>`,
          `Change: <strong>${chartFormatters.currency(step.delta)}</strong>`,
          `End: <strong>${chartFormatters.currency(step.end)}</strong>`,
        ];

        if (step.breakdown && step.breakdown.length > 0) {
          lines.push(
            "<hr style='border: 0; border-top: 1px solid rgba(148, 163, 184, 0.2); margin: 6px 0;'/>",
          );
          const sorted = [...step.breakdown].sort((a, b) =>
            Math.abs(b.value) - Math.abs(a.value)
          );
          const maxVisible = 6;
          const visible = sorted.slice(0, maxVisible);
          const remaining = sorted.slice(maxVisible);

          for (const row of visible) {
            lines.push(
              `${row.account}: <strong>${
                chartFormatters.currency(row.value)
              }</strong>`,
            );
          }

          if (remaining.length > 0) {
            const remainingSum = remaining.reduce((s, r) => s + r.value, 0);
            lines.push(
              `<span style="opacity: 0.75; font-size: 0.9em;">+ ${remaining.length} more accounts: <strong>${
                chartFormatters.currency(remainingSum)
              }</strong></span>`,
            );
          }
        }

        return lines.join("<br/>");
      },
    },
    xAxis: {
      type: "category",
      data: data.steps.map((step) => step.label),
      axisLabel: {
        color: theme?.mutedColor,
        rotate: mobile ? 45 : 18,
        interval: 0,
        hideOverlap: true,
        overflow: "truncate",
        width: mobile ? 42 : 100,
        formatter: (label: string) =>
          ({
            "Starting balance": "Start",
            "Gain / Loss": "P/L",
            "Liabilities": "Liab.",
            "Expenses": "Expense",
            "Ending balance": "End",
          })[label] ?? label,
      },
    },
    yAxis: {
      type: "value",
      min: axisRange.min,
      max: axisRange.max,
      scale: true,
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
          label: {
            show: !mobile &&
              (step.id === "start" || step.id === "end" || step.delta !== 0),
            position: step.delta < 0 ? "bottom" : "top",
            color: theme?.textColor,
            formatter: step.id === "start" || step.id === "end"
              ? chartFormatters.compactCurrency(step.end)
              : `${step.delta > 0 ? "+" : ""}${
                chartFormatters.compactCurrency(step.delta)
              }`,
          },
        })),
        label: {
          show: false,
        },
        labelLayout: { hideOverlap: true },
      },
    ],
  };

  return baseOption;
}

export function buildIncomeStatementWaterfallOption(
  data: IncomeStatementWaterfallData,
  options: { theme?: PaisaChartTheme; darkMode?: boolean } = {},
) {
  return responsiveChartOption(
    buildIncomeStatementWaterfallLayout(data, options),
    buildIncomeStatementWaterfallLayout(data, options, true),
  );
}
