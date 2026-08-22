export interface EChartTokenTheme {
  textColor: string;
  mutedColor: string;
  borderColor: string;
}

function token(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

export function readEChartTokenTheme(): EChartTokenTheme {
  return {
    textColor: token("--paisa-foreground", "currentColor"),
    mutedColor: token("--paisa-muted-foreground", "currentColor"),
    borderColor: token("--paisa-border-subtle", "currentColor"),
  };
}
