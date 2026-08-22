export interface PaisaChartTheme {
  textColor: string;
  mutedColor: string;
  borderColor: string;
  gridColor: string;
  surfaceColor: string;
  tooltipSurfaceColor: string;
  primaryColor: string;
  positiveColor: string;
  negativeColor: string;
  warningColor: string;
  neutralColor: string;
  seriesColors: string[];
}

function token(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

function seriesToken(index: number, fallback: string): string {
  return token(`--paisa-chart-series-${index}`, fallback);
}

export function readPaisaChartTheme(): PaisaChartTheme {
  return {
    textColor: token("--paisa-foreground", "currentColor"),
    mutedColor: token("--paisa-muted-foreground", "currentColor"),
    borderColor: token("--paisa-border-subtle", "currentColor"),
    gridColor: token("--paisa-border-subtle", "currentColor"),
    surfaceColor: token("--paisa-surface", "transparent"),
    tooltipSurfaceColor: token("--paisa-popover", "Canvas"),
    primaryColor: token("--paisa-primary", "#2563eb"),
    positiveColor: token("--paisa-positive", "#16a34a"),
    negativeColor: token("--paisa-negative", "#dc2626"),
    warningColor: token("--paisa-warning", "#d97706"),
    neutralColor: token("--paisa-muted-foreground", "#64748b"),
    seriesColors: [
      seriesToken(1, "#2563eb"),
      seriesToken(2, "#16a34a"),
      seriesToken(3, "#dc2626"),
      seriesToken(4, "#d97706"),
      seriesToken(5, "#7c3aed"),
      seriesToken(6, "#0891b2"),
    ],
  };
}

export const readEChartTokenTheme = readPaisaChartTheme;

export function normalizeCategoryKey(key?: string): string {
  const normalized = key?.normalize("NFKC").trim().toLowerCase();
  return normalized || "uncategorized";
}

export function categorySeriesIndex(
  key: string | undefined,
  colorCount: number,
): number {
  if (colorCount <= 0) return 0;

  let hash = 2166136261;
  for (const character of normalizeCategoryKey(key)) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) % colorCount;
}

export function categorySeriesColor(
  key: string | undefined,
  colors: readonly string[],
  fallback = "currentColor",
): string {
  if (colors.length === 0) return fallback;
  return colors[categorySeriesIndex(key, colors.length)] ?? fallback;
}
