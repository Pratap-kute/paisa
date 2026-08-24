export function responsiveChartOption(
  desktop: Record<string, unknown>,
  compact: Record<string, unknown>,
) {
  return {
    baseOption: desktop,
    media: [{ query: { maxWidth: 639 }, option: compact }],
  };
}
