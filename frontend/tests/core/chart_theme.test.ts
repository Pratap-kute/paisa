import { formatCurrencyCrude } from "$lib/shared/formatters/currency";
import { formatFloat } from "$lib/shared/formatters/currency";
import { formatPercentage } from "$lib/shared/formatters/currency";
import {} from "$lib/shared/formatters/currency";
import {} from "$lib/shared/formatters/currency";
import {} from "$lib/shared/formatters/currency";
import { describe, expect, it } from "vitest";
import { chartFormatters } from "$lib/shared/charts/echarts/formatters";
import {
  categoryColorAssignments,
  categorySeriesColor,
  categorySeriesIndex,
  normalizeCategoryKey,
  readPaisaChartTheme,
} from "$lib/shared/charts/echarts/theme";
import { formatCurrency } from "$lib/shared/formatters/currency";

describe("chart theme and formatter helpers", () => {
  it("maps Paisa semantic CSS tokens into a chart theme", () => {
    const root = document.documentElement;
    root.style.setProperty("--paisa-foreground", "rgb(1, 2, 3)");
    root.style.setProperty("--paisa-font-sans", "Paisa Sans");
    root.style.setProperty("--paisa-muted-foreground", "rgb(4, 5, 6)");
    root.style.setProperty("--paisa-border-subtle", "rgb(7, 8, 9)");
    root.style.setProperty("--paisa-surface", "rgb(10, 11, 12)");
    root.style.setProperty("--paisa-tooltip-bg", "rgb(13, 14, 15)");
    root.style.setProperty("--paisa-tooltip-text", "rgb(240, 241, 242)");
    root.style.setProperty("--paisa-primary", "rgb(16, 17, 18)");
    root.style.setProperty("--paisa-positive", "rgb(19, 20, 21)");
    root.style.setProperty("--paisa-negative", "rgb(22, 23, 24)");
    root.style.setProperty("--paisa-warning", "rgb(25, 26, 27)");
    root.style.setProperty("--paisa-chart-series-1", "rgb(31, 32, 33)");

    const theme = readPaisaChartTheme();

    expect(theme.textColor).toBe("rgb(1, 2, 3)");
    expect(theme.fontFamily).toBe("Paisa Sans");
    expect(theme.mutedColor).toBe("rgb(4, 5, 6)");
    expect(theme.borderColor).toBe("rgb(7, 8, 9)");
    expect(theme.gridColor).toBe("rgb(7, 8, 9)");
    expect(theme.surfaceColor).toBe("rgb(10, 11, 12)");
    expect(theme.tooltipSurfaceColor).toBe("rgb(13, 14, 15)");
    expect(theme.tooltipTextColor).toBe("rgb(240, 241, 242)");
    expect(theme.primaryColor).toBe("rgb(16, 17, 18)");
    expect(theme.positiveColor).toBe("rgb(19, 20, 21)");
    expect(theme.negativeColor).toBe("rgb(22, 23, 24)");
    expect(theme.warningColor).toBe("rgb(25, 26, 27)");
    expect(theme.seriesColors).toHaveLength(12);
    expect(theme.seriesColors[0]).toBe("rgb(31, 32, 33)");
  });

  it("assigns distinct colors to categories in the same dataset", () => {
    const colors = ["one", "two", "three", "four"];
    const assignments = categoryColorAssignments(
      ["Rent", "Food", "Rent", "Travel"],
      colors,
    );

    expect(assignments.size).toBe(3);
    expect(new Set(assignments.values()).size).toBe(3);
    expect(assignments.get("rent")).toBe(
      categoryColorAssignments(["Travel", "Rent", "Food"], colors).get("rent"),
    );
  });

  it("maps normalized category identities deterministically", () => {
    const colors = ["one", "two", "three", "four", "five", "six"];

    expect(normalizeCategoryKey("  Housing ")).toBe("housing");
    expect(normalizeCategoryKey("   ")).toBe("uncategorized");
    expect(categorySeriesIndex("Housing", colors.length)).toBe(
      categorySeriesIndex(" housing ", colors.length),
    );
    expect(categorySeriesColor("Housing", colors)).toBe(
      categorySeriesColor("Housing", [...colors].reverse().reverse()),
    );
    expect(
      new Set(
        ["Housing", "Food", "Travel", "Utilities"].map((key) =>
          categorySeriesColor(key, colors)
        ),
      ).size,
    ).toBeGreaterThan(1);
    expect(categorySeriesColor(undefined, [])).toBe("currentColor");
  });

  it("delegates chart number formatting to existing Paisa formatters", () => {
    expect(chartFormatters.currency(1234)).toBe(formatCurrency(1234));
    expect(chartFormatters.compactCurrency(1234)).toBe(
      formatCurrencyCrude(1234),
    );
    expect(chartFormatters.number(12.345)).toBe(formatFloat(12.345));
    expect(chartFormatters.percentage(0.125, 1)).toBe(
      formatPercentage(0.125, 1),
    );
  });
});
