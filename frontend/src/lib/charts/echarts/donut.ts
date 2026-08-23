import { chartFormatters } from "$lib/charts/echarts/formatters";
import {
  categoryColorAssignments,
  normalizeCategoryKey,
  type PaisaChartTheme,
} from "$lib/charts/echarts/theme";
import { responsiveChartOption } from "$lib/charts/echarts/responsive";
import type { PortfolioAggregate } from "$lib/core/utils";

export interface DonutChartItem {
  name: string;
  value: number;
  percentage: number;
  categoryKey?: string;
}

export function buildPortfolioDonutData(
  aggregates: PortfolioAggregate[],
): DonutChartItem[] {
  return aggregates
    .filter((agg) => agg.amount > 0)
    .map((agg) => ({
      name: agg.group,
      value: agg.amount,
      percentage: agg.percentage,
      categoryKey: agg.group,
    }));
}

function buildDonutLayout(
  items: DonutChartItem[],
  options: { theme?: PaisaChartTheme } = {},
  mobile = false,
) {
  const theme = options.theme;
  const categoryColors = categoryColorAssignments(
    items.map((item) => item.categoryKey ?? item.name),
    theme?.seriesColors ?? [],
    theme?.primaryColor,
  );

  const seriesData = items.map((item) => ({
    name: item.name,
    value: item.value,
    percentage: item.percentage,
    itemStyle: {
      color: categoryColors.get(
        normalizeCategoryKey(item.categoryKey ?? item.name),
      ) ??
        theme?.primaryColor,
      borderColor: theme?.surfaceColor ?? "#ffffff",
      borderWidth: 2,
      borderRadius: 4,
    },
  }));

  return {
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
      formatter: (
        params: { data?: { name: string; value: number; percentage: number } },
      ) => {
        const data = params.data;
        if (!data) return "";
        return [
          `<strong>${data.name}</strong>`,
          `Market value: <strong>${
            chartFormatters.currency(data.value)
          }</strong>`,
          `Share: <strong>${
            chartFormatters.percentage(data.percentage / 100)
          }</strong>`,
        ].join("<br/>");
      },
    },
    legend: {
      type: "scroll",
      orient: mobile ? "horizontal" : "vertical",
      left: mobile ? "center" : undefined,
      right: mobile ? undefined : (mobile ? 12 : 36),
      top: mobile ? undefined : "middle",
      bottom: mobile ? 6 : undefined,
      itemWidth: 12,
      itemHeight: 12,
      itemGap: mobile ? 8 : 12,
      textStyle: {
        color: theme?.textColor,
        fontSize: mobile ? 11 : 12,
      },
      formatter: (name: string) => {
        const item = items.find((i) => i.name === name);
        if (!item) return name;
        return `${name}  (${
          chartFormatters.percentage(item.percentage / 100)
        })`;
      },
    },
    series: [
      {
        type: "pie",
        radius: mobile ? ["36%", "62%"] : ["44%", "72%"],
        center: mobile ? ["50%", "40%"] : ["36%", "50%"],
        avoidLabelOverlap: true,
        padAngle: 2,
        itemStyle: {
          borderRadius: 4,
          borderColor: theme?.surfaceColor ?? "#ffffff",
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          scale: true,
          scaleSize: 6,
          label: {
            show: false,
          },
        },
        data: seriesData,
      },
    ],
  };
}

export function buildPortfolioDonutOption(
  items: DonutChartItem[],
  options: { theme?: PaisaChartTheme } = {},
) {
  return responsiveChartOption(
    buildDonutLayout(items, options),
    buildDonutLayout(items, options, true),
  );
}
