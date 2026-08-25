import type { Legend } from "$lib/shared/charts/types";
import { categorySeriesIndex } from "$lib/shared/charts/echarts/theme";

export const categoryColor = (key: string) =>
  `var(--paisa-chart-series-${categorySeriesIndex(key, 12) + 1})`;

export function categoryColorResolver(keys: string[]) {
  const colors = new Map(
    [...new Set(keys)].sort().map((key, index) => [
      key,
      `var(--paisa-chart-series-${index % 12 + 1})`,
    ]),
  );
  return (key: string) => colors.get(key) ?? categoryColor(key);
}

export function categoryLegends(
  keys: string[],
  onSelect?: (key: string) => void,
): Legend[] {
  const color = categoryColorResolver(keys);
  return keys.map((key) => ({
    label: key,
    color: color(key),
    shape: "square",
    onClick: onSelect ? () => onSelect(key) : undefined,
  }));
}
