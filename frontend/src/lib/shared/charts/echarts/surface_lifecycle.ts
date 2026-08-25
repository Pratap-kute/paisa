import type { Dimensions } from "$lib/shared/charts/resize";
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
  onready?: () => void;
  onreadinesschange?: (ready: boolean) => void;
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
    isReady = false;
    options.element.dataset.chartReady = "false";
    options.onreadinesschange?.(false);
    clearReadyFrame();
  }

  function markReady() {
    if (!chart || !dimensions) return;
    if (isReady) return;
    isReady = true;
    options.element.dataset.chartReady = "true";
    options.onreadinesschange?.(true);
    options.onready?.();
  }

  function scheduleReady() {
    if (!chart || !dimensions) return;
    clearReadyFrame();
    readyFrame = requestFrame(() => {
      readyFrame = undefined;
      markReady();
    });
  }

  const controller: EChartSurfaceController = {
    init() {
      if (chart) return;
      chart = options.initChart(options.element, options.renderer);
      invalidateReady();
      attachHandlers();
      chart.setOption(currentOption, true);
      scheduleReady();
    },
    update(option) {
      if (option === currentOption) return;
      currentOption = option;
      if (chart) invalidateReady();
      chart?.setOption(currentOption, true);
      if (chart) scheduleReady();
    },
    resize(nextDimensions) {
      if (nextDimensions.width <= 0 || nextDimensions.height <= 0) return;
      const changed = dimensions?.width !== nextDimensions.width ||
        dimensions?.height !== nextDimensions.height;
      if (!changed) return;
      dimensions = nextDimensions;
      invalidateReady();
      chart?.resize({
        width: nextDimensions.width,
        height: nextDimensions.height,
      });
      scheduleReady();
    },
    setEventHandlers(handlers) {
      if (handlers === eventHandlers) return;
      eventHandlers = handlers;
      attachHandlers();
    },
    markReady,
    dispose() {
      clearReadyFrame();
      detachHandlers();
      chart?.dispose();
      chart = undefined;
      dimensions = undefined;
      isReady = false;
      options.onreadinesschange?.(false);
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
