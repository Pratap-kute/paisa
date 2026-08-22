import { describe, expect, it } from "vitest";
import { chartFormatters } from "$lib/charts/echarts/formatters";
import { readPaisaChartTheme } from "$lib/charts/echarts/theme";
import {
  formatCurrency,
  formatCurrencyCrude,
  formatFloat,
  formatPercentage,
} from "$lib/core/utils";

describe("ECharts foundation helpers", () => {
  it("maps Paisa semantic CSS tokens into a chart theme", () => {
    const root = document.documentElement;
    root.style.setProperty("--paisa-foreground", "rgb(1, 2, 3)");
    root.style.setProperty("--paisa-muted-foreground", "rgb(4, 5, 6)");
    root.style.setProperty("--paisa-border-subtle", "rgb(7, 8, 9)");
    root.style.setProperty("--paisa-surface", "rgb(10, 11, 12)");
    root.style.setProperty("--paisa-popover", "rgb(13, 14, 15)");
    root.style.setProperty("--paisa-primary", "rgb(16, 17, 18)");
    root.style.setProperty("--paisa-positive", "rgb(19, 20, 21)");
    root.style.setProperty("--paisa-negative", "rgb(22, 23, 24)");
    root.style.setProperty("--paisa-warning", "rgb(25, 26, 27)");

    const theme = readPaisaChartTheme();

    expect(theme.textColor).toBe("rgb(1, 2, 3)");
    expect(theme.mutedColor).toBe("rgb(4, 5, 6)");
    expect(theme.borderColor).toBe("rgb(7, 8, 9)");
    expect(theme.gridColor).toBe("rgb(7, 8, 9)");
    expect(theme.surfaceColor).toBe("rgb(10, 11, 12)");
    expect(theme.tooltipSurfaceColor).toBe("rgb(13, 14, 15)");
    expect(theme.primaryColor).toBe("rgb(16, 17, 18)");
    expect(theme.positiveColor).toBe("rgb(19, 20, 21)");
    expect(theme.negativeColor).toBe("rgb(22, 23, 24)");
    expect(theme.warningColor).toBe("rgb(25, 26, 27)");
    expect(theme.seriesColors).toHaveLength(6);
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
