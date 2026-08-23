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
  mode: "treemap" | "sunburst";
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

  if (data.mode === "sunburst") {
    return {
      ...common,
      series: [
        {
          type: "sunburst",
          data: data.roots.map((node) => mapNode(node, theme, categoryColors)),
          radius: mobile ? ["12%", "88%"] : ["16%", "92%"],
          sort: undefined,
          nodeClick: "rootToNode",
          emphasis: {
            focus: "ancestor",
          },
          levels: [
            {},
            {
              r0: "15%",
              r: "44%",
              itemStyle: {
                borderWidth: 2,
                borderColor: theme?.surfaceColor ?? "#ffffff",
                borderRadius: 4,
              },
              label: {
                rotate: "tangential",
                minAngle: 10,
                color: theme?.textColor,
                fontSize: mobile ? 10 : 12,
                fontWeight: 600,
              },
            },
            {
              r0: "46%",
              r: "72%",
              itemStyle: {
                borderWidth: 1.5,
                borderColor: theme?.surfaceColor ?? "#ffffff",
                borderRadius: 2,
              },
              label: {
                rotate: "radial",
                minAngle: 6,
                color: theme?.textColor,
                fontSize: mobile ? 9 : 11,
              },
            },
            {
              r0: "74%",
              r: "94%",
              itemStyle: {
                borderWidth: 1,
                borderColor: theme?.surfaceColor ?? "#ffffff",
                borderRadius: 2,
              },
              label: {
                rotate: "radial",
                minAngle: 4,
                color: theme?.textColor,
                fontSize: mobile ? 8 : 10,
              },
            },
          ],
        },
      ],
    };
  }

  return {
    ...common,
    series: [
      {
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
