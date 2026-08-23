import dayjs from "dayjs";
import type { Legend } from "$lib/core/utils";
import { chartFormatters } from "$lib/charts/echarts/formatters";
import {
  categoryColorAssignments,
  normalizeCategoryKey,
  type PaisaChartTheme,
} from "$lib/charts/echarts/theme";
import { responsiveChartOption } from "$lib/charts/echarts/responsive";

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
  categoryKey?: string;
  decal?: boolean;
  stack?: string;
  dashed?: boolean;
  smooth?: boolean;
  showSymbol?: boolean;
  symbolSize?: number;
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
  categoryColors: Map<string, string>,
) {
  return series.color ??
    (series.categoryKey
      ? categoryColors.get(normalizeCategoryKey(series.categoryKey))
      : undefined) ??
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

function buildPeriodSeriesLayout(
  data: PeriodSeriesChartData,
  options: PeriodSeriesOptions = {},
  mobile = false,
) {
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
  const categoryColors = categoryColorAssignments(
    data.series.map((series) => series.categoryKey),
    theme?.seriesColors ?? [],
    theme?.primaryColor,
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
    splitNumber: mobile ? 3 : 5,
    axisLabel: {
      color: mutedColor,
      hideOverlap: true,
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
    animation: false,
    backgroundColor: "transparent",
    color: data.series.map((series, index) =>
      seriesColor(series, theme, index, categoryColors)
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
        left: "center",
        type: "scroll",
        width: mobile ? "92%" : "88%",
        itemWidth: mobile ? 12 : 18,
        itemHeight: mobile ? 8 : 10,
        itemGap: mobile ? 8 : 14,
        textStyle: { color: mutedColor, fontSize: mobile ? 10 : 12 },
        formatter: mobile
          ? (name: string) =>
            ({
              "Interest gain": "Gain",
              "Interest cost": "Cost",
            })[name] ?? name
          : undefined,
      }
      : undefined,
    tooltip: {
      trigger: "axis",
      confine: true,
      borderColor,
      backgroundColor: theme?.tooltipSurfaceColor,
      textStyle: { color: theme?.tooltipTextColor ?? textColor },
      formatter: (params: unknown) => tooltipFormatter(data, params),
    },
    xAxis: horizontal ? valueAxis : periodAxis,
    yAxis: horizontal ? periodAxis : valueAxis,
    textStyle: {
      color: mutedColor,
      fontFamily: theme?.fontFamily,
    },
    series: data.series.map((series, index) => {
      const color = seriesColor(series, theme, index, categoryColors);
      const values = data.points.map((point, pointIndex) => {
        const value = point.values[series.key] ?? null;
        if (!categoryAxis && !horizontal) {
          return [timeValues[pointIndex], value];
        }
        return value;
      });
      const bar = series.intent === "bar" || series.intent === "stacked-bar";
      const defaultShowSymbol = mobile || data.points.length > 25
        ? false
        : !bar;
      return {
        type: bar ? "bar" : "line",
        name: series.label,
        data: values,
        stack: series.stack,
        smooth: series.smooth ?? false,
        connectNulls: false,
        showSymbol: series.showSymbol ?? defaultShowSymbol,
        symbolSize: series.symbolSize ?? 5,
        barMaxWidth: bar ? (mobile ? 36 : 64) : undefined,
        itemStyle: {
          color: (params: { value?: unknown }) => {
            const raw = Array.isArray(params.value)
              ? Number(params.value[params.value.length - 1])
              : Number(params.value ?? 0);
            if (raw < 0 && series.negativeColor) return series.negativeColor;
            if (raw >= 0 && series.positiveColor) return series.positiveColor;
            return color;
          },
          decal: series.decal
            ? {
              symbol: "rect",
              dashArrayX: [1, 0],
              dashArrayY: [4, 3],
              rotation: Math.PI / 4,
              color: theme?.textColor ?? color,
              backgroundColor: color,
              maxTileWidth: 32,
              maxTileHeight: 32,
            }
            : undefined,
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

export function buildPeriodSeriesOption(
  data: PeriodSeriesChartData,
  options: PeriodSeriesOptions = {},
) {
  return responsiveChartOption(
    buildPeriodSeriesLayout(data, options),
    buildPeriodSeriesLayout(data, options, true),
  );
}
