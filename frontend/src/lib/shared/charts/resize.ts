export interface Dimensions {
  width: number;
  height: number;
}

export type ResizeCallback = (dimensions: Dimensions) => void;

/**
 * Robust chart resize observer with:
 * 1. Dimension equality check to prevent needless redraws
 * 2. requestAnimationFrame coalescing to prevent ResizeObserver loops and lag
 * 3. In-flight frame cancellation & complete cleanup
 */
export function observeElementSize(
  element: HTMLElement | SVGElement,
  callback: ResizeCallback,
): () => void {
  if (typeof window === "undefined" || !("ResizeObserver" in window)) {
    return () => {};
  }

  let previousWidth = -1;
  let previousHeight = -1;
  let rafId: number | null = null;

  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width, height } = entry.contentRect;
      const roundedWidth = Math.round(width);
      const roundedHeight = Math.round(height);

      if (roundedWidth <= 0 || roundedHeight <= 0) {
        continue;
      }

      if (
        roundedWidth === previousWidth &&
        roundedHeight === previousHeight
      ) {
        continue;
      }

      previousWidth = roundedWidth;
      previousHeight = roundedHeight;

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        rafId = null;
        callback({ width: roundedWidth, height: roundedHeight });
      });
    }
  });

  observer.observe(element);

  return () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    observer.disconnect();
  };
}
