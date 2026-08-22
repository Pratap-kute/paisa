import { SankeyChart } from "echarts/charts";
import {
  GridComponent,
  TitleComponent,
  TooltipComponent,
  TransformComponent,
} from "echarts/components";
import { CanvasRenderer, SVGRenderer } from "echarts/renderers";
import { type ECharts, init, use } from "echarts/core";

use([
  CanvasRenderer,
  SVGRenderer,
  GridComponent,
  SankeyChart,
  TitleComponent,
  TooltipComponent,
  TransformComponent,
]);

export function initChart(
  element: HTMLDivElement,
  renderer: "canvas" | "svg" = "canvas",
): ECharts {
  return init(element, undefined, {
    renderer,
  });
}
