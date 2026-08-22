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

type RequestFrame = (callback: FrameRequestCallback) => number;
type CancelFrame = (handle: number) => void;

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
  requestFrame?: RequestFrame;
  cancelFrame?: CancelFrame;
}): EChartSurfaceController {
  let chart: EChartSurfaceEngine | undefined;
  let currentOption = options.option;
  let eventHandlers = options.eventHandlers ?? [];
  let attachedHandlers: PaisaChartEventHandler[] = [];
  let isReady = false;
  let dimensions: Dimensions | undefined;
  let generation = 0;
  let readyFrame: number | undefined;
  const requestFrame: RequestFrame = options.requestFrame ??
    globalThis.requestAnimationFrame.bind(globalThis);
  const cancelFrame: CancelFrame = options.cancelFrame ??
    globalThis.cancelAnimationFrame.bind(globalThis);

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

  function clearReadyFrame() {
    if (readyFrame === undefined) return;
    cancelFrame(readyFrame);
    readyFrame = undefined;
  }

  function invalidateReady() {
    generation += 1;
    isReady = false;
    options.element.dataset.chartReady = "false";
    clearReadyFrame();
  }

  function markReady(expectedGeneration = generation) {
    if (expectedGeneration !== generation || !dimensions) return;
    if (isReady) return;
    isReady = true;
    options.element.dataset.chartReady = "true";
    options.onready?.();
  }

  function scheduleReady() {
    if (!chart || !dimensions || isReady) return;
    if (readyFrame !== undefined) return;
    const expectedGeneration = generation;
    readyFrame = requestFrame(() => {
      readyFrame = requestFrame(() => {
        readyFrame = undefined;
        if (expectedGeneration !== generation || !dimensions) return;
        const rect = options.element.getBoundingClientRect();
        const actual = {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
        if (
          actual.width > 0 && actual.height > 0 &&
          (actual.width !== dimensions.width ||
            actual.height !== dimensions.height)
        ) {
          controller.resize(actual);
          return;
        }
        markReady(expectedGeneration);
      });
    });
  }

  const controller: EChartSurfaceController = {
    init() {
      if (chart) return;
      chart = options.initChart(options.element, options.renderer);
      invalidateReady();
      chart.on("finished", scheduleReady as never);
      attachHandlers();
      chart.setOption(currentOption, true);
    },
    update(option) {
      currentOption = option;
      if (chart) invalidateReady();
      chart?.setOption(currentOption, true);
      if (chart) scheduleReady();
    },
    resize(nextDimensions) {
      if (nextDimensions.width <= 0 || nextDimensions.height <= 0) return;
      const changed = dimensions?.width !== nextDimensions.width ||
        dimensions?.height !== nextDimensions.height;
      dimensions = nextDimensions;
      if (changed) invalidateReady();
      chart?.resize({
        width: nextDimensions.width,
        height: nextDimensions.height,
      });
      options.onresize?.(nextDimensions);
      scheduleReady();
    },
    setEventHandlers(handlers) {
      eventHandlers = handlers;
      attachHandlers();
    },
    markReady,
    dispose() {
      if (chart) {
        chart.off("finished", scheduleReady as never);
      }
      clearReadyFrame();
      detachHandlers();
      chart?.dispose();
      chart = undefined;
      dimensions = undefined;
      generation += 1;
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
  return controller;
}
