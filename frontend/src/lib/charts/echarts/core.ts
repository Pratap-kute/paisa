import { SankeyChart } from "echarts/charts";
import {
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { type ECharts, init, use } from "echarts/core";

use([
  CanvasRenderer,
  SankeyChart,
  TooltipComponent,
]);

export function initChart(
  element: HTMLDivElement,
  renderer: "canvas" = "canvas",
): ECharts {
  return init(element, undefined, {
    renderer,
  });
}
