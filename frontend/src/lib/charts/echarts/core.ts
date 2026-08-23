import {
  BarChart,
  GraphChart,
  LineChart,
  PieChart,
  SankeyChart,
  ScatterChart,
  SunburstChart,
  TreemapChart,
} from "echarts/charts";
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
  GraphChart,
  GridComponent,
  LegendComponent,
  LineChart,
  MarkLineComponent,
  PieChart,
  SankeyChart,
  ScatterChart,
  SunburstChart,
  TooltipComponent,
  TreemapChart,
]);

export function initChart(
  element: HTMLDivElement,
  renderer: "canvas" = "canvas",
): ECharts {
  return init(element, undefined, {
    renderer,
  });
}
