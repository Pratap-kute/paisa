import { chartFormatters } from "$lib/charts/echarts/formatters";
import {
  categoryColorAssignments,
  normalizeCategoryKey,
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
  categoryColors = new Map<string, string>(),
  inheritedCategoryKey = node.id,
): Record<string, unknown> {
  const categoryKey = node.categoryKey ?? inheritedCategoryKey;
  return {
    name: node.label,
    value: Math.max(0, node.value),
    itemStyle: {
      color: categoryColors.get(normalizeCategoryKey(categoryKey)) ??
        theme?.primaryColor,
      borderColor: theme?.surfaceColor,
    },
    children: node.children?.map((child) =>
      mapNode(child, theme, categoryColors, categoryKey)
    ),
    paisa: node,
  };
}

function categoryKeys(nodes: FinancialHierarchyNode[]): string[] {
  return nodes.flatMap((node) => [
    node.categoryKey ?? node.id,
    ...categoryKeys(node.children ?? []),
  ]);
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
  options: { compact?: boolean; theme?: PaisaChartTheme } = {},
) {
  const mobile = options.compact ?? false;
  const theme = options.theme;
  const categoryColors = categoryColorAssignments(
    categoryKeys(data.roots),
    theme?.seriesColors ?? [],
    theme?.primaryColor,
  );
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
      formatter: tooltip,
    },
  };
  return {
    ...common,
    series: [{
      type: "treemap",
      data: data.roots.map((node) => mapNode(node, theme, categoryColors)),
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
