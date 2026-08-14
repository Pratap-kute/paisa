export function svgRectSpan(start: number, end: number) {
  return {
    x: Math.min(start, end),
    width: Math.abs(end - start),
  };
}
