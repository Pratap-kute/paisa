import type { Dimensions } from "$lib/charts/resize";
import type { ECharts, EChartsCoreOption } from "echarts/core";

export type EChartRenderer = "canvas" | "svg";
export type EChartInit = (
  element: HTMLDivElement,
  renderer: EChartRenderer,
) => ECharts;

export interface EChartSurfaceController {
  init: () => void;
  update: (option: EChartsCoreOption) => void;
  resize: (dimensions: Dimensions) => void;
  dispose: () => void;
  chart: () => ECharts | undefined;
}

export function createEChartSurfaceController(options: {
  element: HTMLDivElement;
  option: EChartsCoreOption;
  renderer: EChartRenderer;
  initChart: EChartInit;
  onresize?: (dimensions: Dimensions) => void;
}): EChartSurfaceController {
  let chart: ECharts | undefined;
  let currentOption = options.option;

  return {
    init() {
      if (chart) return;
      chart = options.initChart(options.element, options.renderer);
      chart.setOption(currentOption, true);
    },
    update(option) {
      currentOption = option;
      chart?.setOption(currentOption, true);
    },
    resize(dimensions) {
      chart?.resize({
        width: dimensions.width,
        height: dimensions.height,
      });
      options.onresize?.(dimensions);
    },
    dispose() {
      chart?.dispose();
      chart = undefined;
    },
    chart() {
      return chart;
    },
  };
}
