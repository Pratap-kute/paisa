import { chartFormatters } from "$lib/charts/echarts/formatters";
import {
  categorySeriesColor,
  type PaisaChartTheme,
} from "$lib/charts/echarts/theme";

export type ComparisonValueFormat =
  | "currency"
  | "compactCurrency"
  | "number"
  | "percentage";

export interface ComparisonTooltipRow {
  label: string;
  value: number;
  format?: ComparisonValueFormat;
}

export interface ComparisonDatum {
  key: string;
  label: string;
  value: number;
  color?: string;
  categoryKey?: string;
  target?: number;
  secondaryValue?: number;
  secondaryLabel?: string;
  tooltipRows?: ComparisonTooltipRow[];
}

export interface ComparisonBarChartData {
  points: ComparisonDatum[];
  valueFormat?: ComparisonValueFormat;
  targetLabel?: string;
  valueLabel?: string;
  sort?: "input" | "ascending" | "descending";
}

export interface ComparisonBarOptions {
  width?: number;
  theme?: PaisaChartTheme;
  darkMode?: boolean;
}

function formatValue(
  value: number,
  format: ComparisonValueFormat = "currency",
) {
  return chartFormatters[format](value);
}

function orderedPoints(data: ComparisonBarChartData): ComparisonDatum[] {
  if (data.sort === "ascending") {
    return [...data.points].sort((a, b) => a.value - b.value);
  }
  if (data.sort === "descending") {
    return [...data.points].sort((a, b) => b.value - a.value);
  }
  return data.points;
}

function tooltipFormatter(data: ComparisonBarChartData, params: unknown) {
  const item = Array.isArray(params) ? params[0] : params;
  const dataIndex = (item as { dataIndex?: number })?.dataIndex ?? 0;
  const point = orderedPoints(data)[dataIndex];
  if (!point) return "";

  const rows = point.tooltipRows?.length ? point.tooltipRows : [
    {
      label: data.valueLabel ?? "Value",
      value: point.value,
      format: data.valueFormat,
    },
    ...(typeof point.target === "number"
      ? [{
        label: data.targetLabel ?? "Target",
        value: point.target,
        format: data.valueFormat,
      }]
      : []),
    ...(typeof point.secondaryValue === "number"
      ? [{
        label: point.secondaryLabel ?? "Difference",
        value: point.secondaryValue,
        format: data.valueFormat,
      }]
      : []),
  ];

  return [
    `<strong>${point.label}</strong>`,
    ...rows.map((row) =>
      `${row.label}: <strong>${
        formatValue(row.value, row.format ?? data.valueFormat)
      }</strong>`
    ),
  ].join("<br/>");
}

export function buildComparisonBarOption(
  data: ComparisonBarChartData,
  options: ComparisonBarOptions = {},
) {
  const points = orderedPoints(data);
  const mobile = (options.width ?? 0) > 0 && (options.width ?? 0) < 640;
  const theme = options.theme;
  const textColor = theme?.textColor ?? "currentColor";
  const mutedColor = theme?.mutedColor ?? textColor;
  const borderColor = theme?.borderColor ?? textColor;
  const defaultColor = theme?.primaryColor ?? "currentColor";
  const maxLabelLength = mobile ? 16 : 28;

  return {
    animationDuration: 250,
    backgroundColor: "transparent",
    grid: {
      top: 12,
      right: mobile ? 16 : 28,
      bottom: 28,
      left: mobile ? 86 : 132,
      containLabel: true,
    },
    tooltip: {
      trigger: "item",
      confine: true,
      borderColor,
      backgroundColor: theme?.tooltipSurfaceColor,
      textStyle: { color: textColor },
      formatter: (params: unknown) => tooltipFormatter(data, params),
    },
    xAxis: {
      type: "value",
      axisLabel: {
        color: mutedColor,
        formatter: (value: number) =>
          formatValue(value, data.valueFormat ?? "compactCurrency"),
      },
      splitLine: {
        lineStyle: {
          color: borderColor,
          opacity: options.darkMode ? 0.28 : 0.45,
        },
      },
    },
    yAxis: {
      type: "category",
      data: points.map((point) => point.label),
      axisLabel: {
        color: mutedColor,
        overflow: "truncate",
        width: mobile ? 72 : 118,
        formatter: (label: string) =>
          label.length > maxLabelLength
            ? `${label.slice(0, maxLabelLength - 1)}...`
            : label,
      },
      axisTick: { alignWithLabel: true },
    },
    textStyle: {
      color: mutedColor,
      fontFamily: "var(--paisa-font-sans)",
    },
    series: [
      {
        name: data.valueLabel ?? "Value",
        type: "bar",
        barMaxWidth: mobile ? 22 : 28,
        data: points.map((point) => ({
          value: point.value,
          itemStyle: {
            color: point.color ??
              (point.categoryKey
                ? categorySeriesColor(
                  point.categoryKey,
                  theme?.seriesColors ?? [],
                  defaultColor,
                )
                : defaultColor),
          },
        })),
        label: {
          show: !mobile,
          position: "right",
          color: textColor,
          formatter: (params: { dataIndex: number }) => {
            const point = points[params.dataIndex];
            if (!point) return "";
            const formatted = formatValue(
              point.value,
              data.valueFormat ?? "currency",
            );
            if (typeof point.secondaryValue === "number") {
              return `${formatted} (${
                formatValue(point.secondaryValue, "number")
              })`;
            }
            return formatted;
          },
        },
      },
      points.some((point) => typeof point.target === "number")
        ? {
          name: data.targetLabel ?? "Target",
          type: "scatter",
          symbol: "diamond",
          symbolSize: mobile ? 10 : 12,
          itemStyle: {
            color: theme?.warningColor ?? defaultColor,
            borderColor: theme?.surfaceColor ?? "transparent",
            borderWidth: 1,
          },
          data: points.map((point, index) =>
            typeof point.target === "number" ? [point.target, index] : null
          ),
          tooltip: { show: false },
        }
        : undefined,
    ].filter(Boolean),
  };
}
