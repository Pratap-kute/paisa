import { chartFormatters } from "$lib/charts/echarts/formatters";
import {
  categorySeriesColor,
  type PaisaChartTheme,
} from "$lib/charts/echarts/theme";
import type { FinancialHierarchyNode } from "$lib/charts/hierarchy_data";

export interface FinancialHierarchyChartData {
  roots: FinancialHierarchyNode[];
  mode: "treemap";
}

function mapNode(
  node: FinancialHierarchyNode,
  theme?: PaisaChartTheme,
): Record<string, unknown> {
  return {
    name: node.label,
    value: Math.max(0, node.value),
    itemStyle: {
      color: categorySeriesColor(
        node.categoryKey ?? node.id,
        theme?.seriesColors ?? [],
        theme?.primaryColor,
      ),
      borderColor: theme?.surfaceColor,
    },
    children: node.children?.map((child) => mapNode(child, theme)),
    paisa: node,
  };
}

function tooltip(params: { data?: { paisa?: FinancialHierarchyNode } }) {
  const node = params.data?.paisa;
  if (!node) return "";
  return [
    `<strong>${node.label}</strong>`,
    `Market value: <strong>${chartFormatters.currency(node.value)}</strong>`,
    typeof node.percentage === "number"
      ? `Share: <strong>${
        chartFormatters.percentage(node.percentage / 100)
      }</strong>`
      : "",
  ].filter(Boolean).join("<br/>");
}

export function buildFinancialHierarchyOption(
  data: FinancialHierarchyChartData,
  options: { width?: number; theme?: PaisaChartTheme } = {},
) {
  const mobile = (options.width ?? 0) > 0 && (options.width ?? 0) < 640;
  const theme = options.theme;
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
      formatter: tooltip,
    },
  };
  return {
    ...common,
    series: [{
      type: "treemap",
      data: data.roots.map((node) => mapNode(node, theme)),
      roam: false,
      nodeClick: false,
      breadcrumb: { show: false },
      visibleMin: 2,
      label: {
        show: true,
        color: theme?.textColor,
        overflow: "truncate",
        formatter: "{b}",
      },
      upperLabel: { show: true, height: 24, color: theme?.textColor },
      itemStyle: {
        borderColor: theme?.surfaceColor,
        borderWidth: 2,
        gapWidth: 2,
      },
      levels: [
        { itemStyle: { borderWidth: 0, gapWidth: 3 } },
        {
          upperLabel: { show: true },
          itemStyle: { borderWidth: 2, gapWidth: 2 },
        },
        {
          label: { show: !mobile },
          itemStyle: { borderWidth: 1, gapWidth: 1 },
        },
      ],
    }],
  };
}
