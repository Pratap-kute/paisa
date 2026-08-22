import type { Dimensions } from "$lib/charts/resize";
import type { ECharts, EChartsCoreOption } from "echarts/core";

export type EChartRenderer = "canvas";
export type EChartInit = (
  element: HTMLDivElement,
  renderer: EChartRenderer,
) => ECharts;

export type PaisaChartEventName = "click" | "mouseover" | "mouseout";

export interface PaisaChartEvent {
  name?: string;
  seriesName?: string;
  dataIndex?: number;
  dataType?: string;
  value?: unknown;
}

export interface PaisaChartEventHandler {
  event: PaisaChartEventName;
  handler: (event: PaisaChartEvent) => void;
}

export interface EChartSurfaceEngine {
  setOption: ECharts["setOption"];
  resize: ECharts["resize"];
  dispose: ECharts["dispose"];
  on: ECharts["on"];
  off: ECharts["off"];
}

export interface EChartSurfaceController {
  init: () => void;
  update: (option: EChartsCoreOption) => void;
  resize: (dimensions: Dimensions) => void;
  setEventHandlers: (handlers: PaisaChartEventHandler[]) => void;
  markReady: () => void;
  dispose: () => void;
  chart: () => EChartSurfaceEngine | undefined;
  ready: () => boolean;
}

export function createEChartSurfaceController(options: {
  element: HTMLDivElement;
  option: EChartsCoreOption;
  renderer: EChartRenderer;
  initChart: (
    element: HTMLDivElement,
    renderer: EChartRenderer,
  ) => EChartSurfaceEngine;
  onresize?: (dimensions: Dimensions) => void;
  onready?: () => void;
  eventHandlers?: PaisaChartEventHandler[];
}): EChartSurfaceController {
  let chart: EChartSurfaceEngine | undefined;
  let currentOption = options.option;
  let eventHandlers = options.eventHandlers ?? [];
  let attachedHandlers: PaisaChartEventHandler[] = [];
  let isReady = false;
  let readyTimer: ReturnType<typeof globalThis.setTimeout> | undefined;

  function attachHandlers() {
    if (!chart) return;
    detachHandlers();
    for (const entry of eventHandlers) {
      chart.on(entry.event, entry.handler as never);
      attachedHandlers.push(entry);
    }
  }

  function detachHandlers() {
    if (!chart) return;
    for (const entry of attachedHandlers) {
      chart.off(entry.event, entry.handler as never);
    }
    attachedHandlers = [];
  }

  function markReady() {
    if (isReady) return;
    isReady = true;
    options.element.dataset.chartReady = "true";
    options.onready?.();
  }

  function scheduleReady() {
    if (typeof window === "undefined") {
      markReady();
      return;
    }
    if (readyTimer !== undefined) {
      globalThis.clearTimeout(readyTimer);
    }
    readyTimer = globalThis.setTimeout(() => {
      readyTimer = undefined;
      markReady();
    }, 0);
  }

  return {
    init() {
      if (chart) return;
      chart = options.initChart(options.element, options.renderer);
      options.element.dataset.chartReady = "false";
      chart.on("finished", markReady as never);
      attachHandlers();
      chart.setOption(currentOption, true);
      scheduleReady();
    },
    update(option) {
      currentOption = option;
      if (chart) {
        isReady = false;
        options.element.dataset.chartReady = "false";
      }
      chart?.setOption(currentOption, true);
      if (chart) scheduleReady();
    },
    resize(dimensions) {
      chart?.resize({
        width: dimensions.width,
        height: dimensions.height,
      });
      options.onresize?.(dimensions);
    },
    setEventHandlers(handlers) {
      eventHandlers = handlers;
      attachHandlers();
    },
    markReady,
    dispose() {
      if (chart) {
        chart.off("finished", markReady as never);
      }
      if (readyTimer !== undefined && typeof window !== "undefined") {
        globalThis.clearTimeout(readyTimer);
        readyTimer = undefined;
      }
      detachHandlers();
      chart?.dispose();
      chart = undefined;
      isReady = false;
      delete options.element.dataset.chartReady;
    },
    chart() {
      return chart;
    },
    ready() {
      return isReady;
    },
  };
}
