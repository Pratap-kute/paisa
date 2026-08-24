import { chartFormatters } from "$lib/charts/echarts/formatters";
import {
  categoryColorAssignments,
  normalizeCategoryKey,
  type PaisaChartTheme,
} from "$lib/charts/echarts/theme";
import { responsiveChartOption } from "$lib/charts/echarts/responsive";
import type { FinancialHierarchyNode } from "$lib/charts/hierarchy_data";

export interface FinancialHierarchyChartData {
  roots: FinancialHierarchyNode[];
  mode?: "treemap";
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
  const valueLabel = typeof node.metadata?.valueLabel === "string"
    ? node.metadata.valueLabel
    : (node.metadata?.account ? "Amount" : "Market value");
  return [
    `<strong>${node.label}</strong>`,
    `${valueLabel}: <strong>${chartFormatters.currency(node.value)}</strong>`,
    typeof node.percentage === "number"
      ? `Share: <strong>${
        chartFormatters.percentage(node.percentage / 100)
      }</strong>`
      : "",
  ].filter(Boolean).join("<br/>");
}

function buildFinancialHierarchyLayout(
  data: FinancialHierarchyChartData,
  options: { theme?: PaisaChartTheme } = {},
  mobile = false,
) {
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
    series: [
      {
        type: "treemap",
        data: data.roots.map((node) => mapNode(node, theme, categoryColors)),
        roam: false,
        nodeClick: "zoomToNode",
        leafDepth: 1,
        drillDownIcon: "▶",
        breadcrumb: {
          show: true,
          top: "bottom",
          height: 30,
          emptyItemWidth: 25,
          itemStyle: {
            color: theme?.surfaceColor ?? "rgba(30, 41, 59, 0.8)",
            borderColor: theme?.borderColor ?? "rgba(148, 163, 184, 0.3)",
            borderWidth: 1,
            borderRadius: 4,
            textStyle: {
              color: theme?.textColor ?? "#ffffff",
              fontSize: 12,
              fontWeight: 600,
            },
          },
        },
        visibleMin: 10,
        label: {
          show: true,
          position: "inside",
          color: "#ffffff",
          textBorderColor: "rgba(0, 0, 0, 0.8)",
          textBorderWidth: 2.5,
          fontSize: mobile ? 12 : 14,
          fontWeight: 600,
          lineHeight: 18,
          overflow: "truncate",
          formatter: (params: { name?: string; value?: number }) => {
            if (!params.name) return "";
            if (typeof params.value === "number" && params.value > 0) {
              return `${params.name}\n${
                chartFormatters.currency(params.value)
              }`;
            }
            return params.name;
          },
        },
        upperLabel: {
          show: false,
        },
        itemStyle: {
          borderColor: theme?.surfaceColor ?? "#0f172a",
          borderWidth: 3,
          gapWidth: 3,
          borderRadius: 6,
        },
        levels: [
          {
            itemStyle: {
              borderWidth: 0,
              gapWidth: 4,
            },
          },
          {
            itemStyle: {
              borderWidth: 3,
              gapWidth: 3,
              borderRadius: 6,
            },
          },
          {
            itemStyle: {
              borderWidth: 2,
              gapWidth: 2,
              borderRadius: 4,
            },
          },
        ],
      },
    ],
  };
}

export function buildFinancialHierarchyOption(
  data: FinancialHierarchyChartData,
  options: { theme?: PaisaChartTheme } = {},
) {
  return responsiveChartOption(
    buildFinancialHierarchyLayout(data, options),
    buildFinancialHierarchyLayout(data, options, true),
  );
}
