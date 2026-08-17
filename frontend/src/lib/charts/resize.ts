export interface Dimensions {
  width: number;
  height: number;
}

export type ResizeCallback = (dimensions: Dimensions) => void;

export interface ChartHandle<T = unknown> {
  update: (data: T) => void;
  resize: (dimensions: Dimensions) => void;
  destroy: () => void;
}

export function plotSize(
  el: { parentElement: HTMLElement | null } | null | undefined,
  margin: { left: number; right: number; top?: number; bottom?: number },
  dimensions?: Dimensions,
  options?: { minWidth?: number; fallbackWidth?: number },
): { width: number; height: number; containerWidth: number } {
  const fallback = options?.fallbackWidth ?? 600;
  const containerWidth = dimensions?.width && dimensions.width > 0
    ? dimensions.width
    : (el?.parentElement?.clientWidth || fallback);
  const minWidth = options?.minWidth ?? 0;
  const width = Math.max(
    minWidth,
    containerWidth - margin.left - margin.right,
  );
  const height = Math.max(
    0,
    (dimensions?.height && dimensions.height > 0
      ? dimensions.height
      : 0) - (margin.top ?? 0) - (margin.bottom ?? 0),
  );
  return { width, height, containerWidth };
}

export function createRedrawChart<T>(options: {
  draw: (data: T, size: Dimensions) => void;
  clear?: () => void;
}): ChartHandle<T> {
  let data: T | undefined;
  let hasData = false;
  let size: Dimensions = { width: 0, height: 0 };

  const redraw = () => {
    if (!hasData) return;
    options.draw(data as T, size);
  };

  return {
    update(next) {
      data = next;
      hasData = true;
      redraw();
    },
    resize(dimensions) {
      size = dimensions;
      redraw();
    },
    destroy() {
      hasData = false;
      options.clear?.();
    },
  };
}

export function createClientWidthChart<T>(
  selector: string,
  render: (data: T) => void,
): ChartHandle<T> {
  const clear = () => {
    const el = document.querySelector(selector);
    if (el) {
      el.replaceChildren();
    }
  };

  return createRedrawChart({
    draw: (data) => {
      clear();
      render(data);
    },
    clear,
  });
}

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
