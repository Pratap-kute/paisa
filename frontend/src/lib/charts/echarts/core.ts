import {
  BarChart,
  GraphChart,
  HeatmapChart,
  LineChart,
  SankeyChart,
  ScatterChart,
  TreemapChart,
} from "echarts/charts";
import {
  CalendarComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { type ECharts, init, use } from "echarts/core";

use([
  CanvasRenderer,
  BarChart,
  GraphChart,
  CalendarComponent,
  GridComponent,
  HeatmapChart,
  LegendComponent,
  LineChart,
  MarkLineComponent,
  SankeyChart,
  ScatterChart,
  TooltipComponent,
  TreemapChart,
  VisualMapComponent,
]);

export function initChart(
  element: HTMLDivElement,
  renderer: "canvas" = "canvas",
): ECharts {
  return init(element, undefined, {
    renderer,
  });
}
