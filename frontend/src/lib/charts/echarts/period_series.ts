import dayjs from "dayjs";
import type { Legend } from "$lib/core/utils";
import { chartFormatters } from "$lib/charts/echarts/formatters";
import type { PaisaChartTheme } from "$lib/charts/echarts/theme";

export type PeriodSeriesIntent = "line" | "area" | "bar" | "stacked-bar";
export type PeriodAxis = "time" | "category" | "value";
export type PeriodValueFormat =
  | "currency"
  | "compactCurrency"
  | "number"
  | "percentage";

export interface PeriodSeriesPoint {
  period: string;
  timestamp?: number;
  values: Record<string, number | null | undefined>;
  tooltipRows?: Array<[string, number, PeriodValueFormat?]>;
  metadata?: Record<string, unknown>;
}

export interface PeriodSeriesDefinition {
  key: string;
  label: string;
  intent: PeriodSeriesIntent;
  valueFormat?: PeriodValueFormat;
  color?: string;
  stack?: string;
  dashed?: boolean;
  smooth?: boolean;
  showSymbol?: boolean;
  areaOpacity?: number;
  positiveColor?: string;
  negativeColor?: string;
  markLine?: {
    value: number;
    label: string;
  };
}

export interface PeriodSeriesChartData {
  points: PeriodSeriesPoint[];
  series: PeriodSeriesDefinition[];
  legends?: Legend[];
  orientation?: "vertical" | "horizontal";
  axis?: PeriodAxis;
  granularity?: "day" | "month" | "financial-year" | "year";
  valueFormat?: PeriodValueFormat;
}

export interface PeriodSeriesOptions {
  width?: number;
  darkMode?: boolean;
  theme?: PaisaChartTheme;
  internalLegend?: boolean;
}

export function datePeriod(date: dayjs.Dayjs, format = "DD MMM YYYY") {
  return {
    period: date.format(format),
    timestamp: date.valueOf(),
  };
}

function formatValue(value: number, format: PeriodValueFormat = "currency") {
  return chartFormatters[format](value);
}

function seriesColor(
  series: PeriodSeriesDefinition,
  theme: PaisaChartTheme | undefined,
  index: number,
) {
  return series.color ??
    theme?.seriesColors[index % (theme.seriesColors.length || 1)] ??
    "currentColor";
}

function tooltipFormatter(
  data: PeriodSeriesChartData,
  params: unknown,
) {
  const items = Array.isArray(params) ? params : [params];
  const first = items[0] as
    | { dataIndex?: number; axisValueLabel?: string }
    | undefined;
  const point = typeof first?.dataIndex === "number"
    ? data.points[first.dataIndex]
    : undefined;
  const header = first?.axisValueLabel ?? point?.period ?? "";
  const rows = point?.tooltipRows?.length
    ? point.tooltipRows.map(([label, value, format]) =>
      `${label}: <strong>${
        formatValue(value, format ?? data.valueFormat)
      }</strong>`
    )
    : items.map((item) => {
      const p = item as { seriesName?: string; value?: unknown };
      const raw = Array.isArray(p.value)
        ? p.value[p.value.length - 1]
        : p.value;
      return `${p.seriesName ?? ""}: <strong>${
        formatValue(Number(raw ?? 0), data.valueFormat)
      }</strong>`;
    });

  return [`<strong>${header}</strong>`, ...rows].join("<br/>");
}

export function buildPeriodSeriesOption(
  data: PeriodSeriesChartData,
  options: PeriodSeriesOptions = {},
) {
  const mobile = (options.width ?? 0) > 0 && (options.width ?? 0) < 640;
  const theme = options.theme;
  const textColor = theme?.textColor ?? "currentColor";
  const mutedColor = theme?.mutedColor ?? textColor;
  const borderColor = theme?.borderColor ?? textColor;
  const horizontal = data.orientation === "horizontal";
  const categoryAxis = data.axis !== "time";
  const categories = data.points.map((point) => point.period);
  const timeValues = data.points.map((point) =>
    point.timestamp ?? point.period
  );

  const axisLabel = {
    color: mutedColor,
    hideOverlap: true,
    rotate: !horizontal && categoryAxis && mobile ? 35 : 0,
    formatter: (value: string | number) => {
      if (!categoryAxis) {
        const date = dayjs(Number(value));
        return date.isValid()
          ? date.format(mobile ? "MMM YY" : "DD MMM YYYY")
          : String(value);
      }
      return String(value);
    },
  };
  const valueAxis = {
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
  };
  const periodAxis = {
    type: categoryAxis ? "category" : "time",
    data: categoryAxis ? categories : undefined,
    axisLabel,
    axisTick: { alignWithLabel: true },
  };

  return {
    animationDuration: 250,
    backgroundColor: "transparent",
    color: data.series.map((series, index) =>
      seriesColor(series, theme, index)
    ),
    grid: {
      top: options.internalLegend ? (mobile ? 44 : 52) : 16,
      right: mobile ? 12 : 24,
      bottom: mobile ? 44 : 36,
      left: mobile ? 44 : 60,
      containLabel: true,
    },
    legend: options.internalLegend
      ? {
        top: 0,
        type: "scroll",
        textStyle: { color: mutedColor },
      }
      : undefined,
    tooltip: {
      trigger: "axis",
      confine: true,
      borderColor,
      backgroundColor: theme?.tooltipSurfaceColor,
      textStyle: { color: textColor },
      formatter: (params: unknown) => tooltipFormatter(data, params),
    },
    xAxis: horizontal ? valueAxis : periodAxis,
    yAxis: horizontal ? periodAxis : valueAxis,
    textStyle: {
      color: mutedColor,
      fontFamily: "var(--paisa-font-sans)",
    },
    series: data.series.map((series, index) => {
      const color = seriesColor(series, theme, index);
      const values = data.points.map((point, pointIndex) => {
        const value = point.values[series.key] ?? 0;
        if (!categoryAxis && !horizontal) {
          return [timeValues[pointIndex], value];
        }
        return value;
      });
      const bar = series.intent === "bar" || series.intent === "stacked-bar";
      return {
        type: bar ? "bar" : "line",
        name: series.label,
        data: values,
        stack: series.stack,
        smooth: series.smooth ?? !bar,
        showSymbol: series.showSymbol ?? (mobile ? false : !bar),
        barMaxWidth: bar ? (mobile ? 28 : 40) : undefined,
        itemStyle: {
          color: (params: { value?: unknown }) => {
            const raw = Array.isArray(params.value)
              ? Number(params.value[params.value.length - 1])
              : Number(params.value ?? 0);
            if (raw < 0 && series.negativeColor) return series.negativeColor;
            if (raw >= 0 && series.positiveColor) return series.positiveColor;
            return color;
          },
        },
        lineStyle: bar ? undefined : {
          color,
          type: series.dashed ? "dashed" : "solid",
          width: 2,
        },
        areaStyle: series.intent === "area"
          ? { color, opacity: series.areaOpacity ?? 0.16 }
          : undefined,
        markLine: series.markLine
          ? {
            symbol: "none",
            label: {
              formatter: series.markLine.label,
              color: textColor,
            },
            lineStyle: {
              color,
              type: "dashed",
            },
            data: [{ yAxis: series.markLine.value }],
          }
          : undefined,
      };
    }),
  };
}
