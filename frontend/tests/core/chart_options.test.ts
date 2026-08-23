import { describe, expect, it } from "vitest";
import { buildComparisonBarOption } from "$lib/charts/echarts/bar_comparison";
import { buildFinancialHierarchyOption } from "$lib/charts/echarts/hierarchy";
import {
  buildAllocationCategoryComparison,
  buildFlattenedHoldings,
  buildTopHoldingsComparison,
} from "$lib/charts/hierarchy_data";
import { buildPeriodSeriesOption } from "$lib/charts/echarts/period_series";
import type { PaisaChartTheme } from "$lib/charts/echarts/theme";

const theme = {
  fontFamily: "Paisa Sans",
  textColor: "text",
  mutedColor: "muted",
  borderColor: "border",
  gridColor: "grid",
  surfaceColor: "surface",
  tooltipSurfaceColor: "tooltip-bg",
  tooltipTextColor: "tooltip-text",
  primaryColor: "primary",
  positiveColor: "positive",
  negativeColor: "negative",
  warningColor: "warning",
  neutralColor: "neutral",
  seriesColors: Array.from({ length: 12 }, (_, index) => `series-${index + 1}`),
} satisfies PaisaChartTheme;

describe("chart option contracts", () => {
  it("keeps absent time-series values as gaps and assigns distinct category colors", () => {
    const option = buildPeriodSeriesOption({
      points: [
        { period: "Jan", values: { actual: 10 } },
        { period: "Feb", values: { forecast: 20 } },
      ],
      series: [
        {
          key: "actual",
          label: "Actual",
          intent: "line",
          categoryKey: "actual",
        },
        {
          key: "forecast",
          label: "Forecast",
          intent: "line",
          categoryKey: "forecast",
        },
      ],
    }, { theme }) as {
      baseOption: {
        animation: boolean;
        color: string[];
        series: Array<{ data: Array<number | null>; connectNulls: boolean }>;
      };
      media: Array<{ query: { maxWidth: number }; option: unknown }>;
    };

    expect(option.baseOption.animation).toBe(false);
    expect(option.baseOption.series[0].data).toEqual([10, null]);
    expect(option.baseOption.series[1].data).toEqual([null, 20]);
    expect(option.baseOption.series.every((series) => !series.connectNulls))
      .toBe(true);
    expect(new Set(option.baseOption.color).size).toBe(2);
    expect(option.media[0].query).toEqual({ maxWidth: 639 });
  });

  it("keeps a useful compact comparison plot and readable tooltip colors", () => {
    const option = buildComparisonBarOption({
      points: [
        { key: "food", label: "Food", value: 10, categoryKey: "food" },
        { key: "rent", label: "Rent", value: 100, categoryKey: "rent" },
      ],
    }, { theme }) as {
      baseOption: {
        animation: boolean;
        grid: { left: number; right: number; containLabel: boolean };
        tooltip: { backgroundColor: string; textStyle: { color: string } };
        xAxis: { splitNumber: number };
        series: Array<{ data: Array<{ itemStyle: { color: string } }> }>;
      };
      media: Array<{
        option: {
          grid: { left: number; right: number; containLabel: boolean };
          xAxis: { splitNumber: number };
        };
      }>;
    };
    const desktop = option.baseOption;
    const compact = option.media[0].option;

    expect(desktop.animation).toBe(false);
    expect(compact.grid).toMatchObject({
      left: 8,
      right: 8,
      containLabel: true,
    });
    expect(compact.xAxis.splitNumber).toBe(2);
    expect(desktop.tooltip).toMatchObject({
      backgroundColor: "tooltip-bg",
      textStyle: { color: "tooltip-text" },
    });
    const comparisonTooltip = (desktop.tooltip as unknown as {
      formatter: (params: unknown) => string;
    }).formatter({ dataIndex: 1 });
    expect(comparisonTooltip).toContain("Rent");
    expect(comparisonTooltip).toContain("100");
    expect(
      new Set(desktop.series[0].data.map((point) => point.itemStyle.color))
        .size,
    )
      .toBe(2);
  });

  it("keeps top-level hierarchy colors distinct and inherited by leaves", () => {
    const option = buildFinancialHierarchyOption({
      mode: "treemap",
      roots: [
        {
          id: "energy",
          label: "Energy",
          value: 60,
          categoryKey: "energy",
          children: [{ id: "oil", label: "Oil", value: 60 }],
        },
        {
          id: "technology",
          label: "Technology",
          value: 40,
          categoryKey: "technology",
          children: [{ id: "software", label: "Software", value: 40 }],
        },
      ],
    }, { theme }) as {
      baseOption: {
        series: Array<{
          data: Array<{
            itemStyle: { color: string };
            children: Array<{ itemStyle: { color: string } }>;
          }>;
        }>;
      };
    };

    const [energy, technology] = option.baseOption.series[0].data;
    expect(energy.itemStyle.color).not.toBe(technology.itemStyle.color);
    expect(energy.children[0].itemStyle.color).toBe(energy.itemStyle.color);
    expect(technology.children[0].itemStyle.color).toBe(
      technology.itemStyle.color,
    );
  });

  it("builds a treemap hierarchy option for nested holdings", () => {
    const option = buildFinancialHierarchyOption({
      mode: "treemap",
      roots: [
        {
          id: "tech",
          label: "Technology",
          value: 100,
          children: [
            { id: "infy", label: "Infosys", value: 60 },
            { id: "tcs", label: "TCS", value: 40 },
          ],
        },
      ],
    }, { theme }) as {
      baseOption: {
        series: Array<{
          type: string;
          data: Array<{
            name: string;
            children: Array<{ name: string }>;
          }>;
        }>;
      };
    };

    expect(option.baseOption.series[0].type).toBe("treemap");
    expect(option.baseOption.series[0].data[0].children.length).toBe(2);
  });

  it("flattens and ranks portfolio holdings across multiple commodities", () => {
    const holdings = buildFlattenedHoldings([
      {
        id: "equity",
        group: "Equity",
        sub_group: "Equity",
        amount: 150000,
        percentage: 75,
        breakdowns: [
          {
            commodity_name: "NIFTY",
            security_name: "Reliance Industries",
            security_type: "Equity",
            amount: 100000,
            percentage: 50,
          },
          {
            commodity_name: "PPFAS",
            security_name: "Reliance Industries",
            security_type: "Equity",
            amount: 50000,
            percentage: 25,
          },
        ],
      },
      {
        id: "debt",
        group: "Debt",
        sub_group: "Debt",
        amount: 50000,
        percentage: 25,
        breakdowns: [
          {
            commodity_name: "DEBT_FUND",
            security_name: "Govt of India 2033",
            security_type: "Debt",
            amount: 50000,
            percentage: 25,
          },
        ],
      },
    ]);

    expect(holdings.length).toBe(2);
    expect(holdings[0].rank).toBe(1);
    expect(holdings[0].security_name).toBe("Reliance Industries");
    expect(holdings[0].amount).toBe(150000);
    expect(holdings[0].commodities).toBe("NIFTY, PPFAS");
    expect(holdings[0].percentage).toBe(75);

    const topComparison = buildTopHoldingsComparison(holdings, 1);
    expect(topComparison.points.length).toBe(1);
    expect(topComparison.points[0].label).toBe("Reliance Industries");
  });

  it("builds clean comparison bars for allocation categories", () => {
    const comparison = buildAllocationCategoryComparison([
      { id: "equity", label: "Equity", value: 100000, percentage: 66.67 },
      { id: "debt", label: "Debt", value: 50000, percentage: 33.33 },
    ]);

    expect(comparison.points.length).toBe(2);
    expect(comparison.points[0].label).toBe("Equity");
    expect(comparison.points[0].value).toBe(100000);
  });
});
