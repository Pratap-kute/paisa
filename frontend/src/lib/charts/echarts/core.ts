import { BarChart, LineChart, SankeyChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { type ECharts, init, use } from "echarts/core";

use([
  CanvasRenderer,
  BarChart,
  GridComponent,
  LegendComponent,
  LineChart,
  MarkLineComponent,
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
