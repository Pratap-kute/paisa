import { describe, expect, it, vi } from "vitest";
import { createEChartSurfaceController } from "$lib/charts/echarts/surface_lifecycle";

function createFrameScheduler() {
  let nextId = 0;
  const callbacks = new Map<number, FrameRequestCallback>();
  return {
    request: vi.fn((callback: FrameRequestCallback) => {
      const id = ++nextId;
      callbacks.set(id, callback);
      return id;
    }),
    cancel: vi.fn((id: number) => callbacks.delete(id)),
    flush() {
      const pending = [...callbacks.entries()];
      callbacks.clear();
      pending.forEach(([, callback]) => callback(performance.now()));
    },
    pending: () => callbacks.size,
  };
}

function chartEngine() {
  return {
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };
}

describe("ECharts surface lifecycle controller", () => {
  it("initializes, updates, resizes, and disposes through the Paisa boundary", () => {
    const chart = {
      setOption: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    };
    const initChart = vi.fn(() => chart as never);
    const onresize = vi.fn();
    const onreadinesschange = vi.fn();
    const element = document.createElement("div");
    const initialOption = { series: [{ type: "sankey", data: [] }] };
    const updatedOption = {
      series: [{ type: "sankey", data: [{ name: "Income" }] }],
    };

    const controller = createEChartSurfaceController({
      element,
      option: initialOption,
      renderer: "canvas",
      initChart,
      onresize,
      onreadinesschange,
    });

    controller.init();
    expect(initChart).toHaveBeenCalledWith(element, "canvas");
    expect(chart.setOption).toHaveBeenCalledWith(initialOption, true);
    expect(element.dataset.chartReady).toBe("false");
    expect(onreadinesschange).toHaveBeenLastCalledWith(false);

    controller.update(updatedOption);
    expect(chart.setOption).toHaveBeenCalledWith(updatedOption, true);

    controller.resize({ width: 640, height: 360 });
    expect(chart.resize).toHaveBeenCalledWith({ width: 640, height: 360 });
    expect(onresize).toHaveBeenCalledWith({ width: 640, height: 360 });
    controller.resize({ width: 640, height: 360 });
    expect(onresize).toHaveBeenCalledTimes(1);
    expect(chart.resize).toHaveBeenCalledTimes(1);

    controller.markReady();
    expect(controller.ready()).toBe(true);
    expect(element.dataset.chartReady).toBe("true");
    expect(onreadinesschange).toHaveBeenLastCalledWith(true);

    controller.dispose();
    expect(chart.dispose).toHaveBeenCalledTimes(1);
    expect(controller.chart()).toBeUndefined();
    expect(controller.ready()).toBe(false);
    expect(element.dataset.chartReady).toBeUndefined();
    expect(onreadinesschange).toHaveBeenLastCalledWith(false);
  });

  it("keeps the latest option when update occurs before initialization", () => {
    const chart = {
      setOption: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    };
    const element = document.createElement("div");
    const initialOption = { series: [] };
    const updatedOption = {
      series: [{ type: "sankey", data: [{ name: "Expenses" }] }],
    };

    const controller = createEChartSurfaceController({
      element,
      option: initialOption,
      renderer: "canvas",
      initChart: () => chart as never,
    });

    controller.update(updatedOption);
    controller.init();

    expect(chart.setOption).toHaveBeenCalledTimes(1);
    expect(chart.setOption).toHaveBeenCalledWith(updatedOption, true);
  });

  it("attaches, replaces, and detaches typed Paisa chart events", () => {
    const chart = {
      setOption: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    };
    const element = document.createElement("div");
    const onClick = vi.fn();
    const onHover = vi.fn();

    const controller = createEChartSurfaceController({
      element,
      option: { series: [] },
      renderer: "canvas",
      initChart: () => chart as never,
      eventHandlers: [{ event: "click", handler: onClick }],
    });

    controller.init();
    expect(chart.on).toHaveBeenCalledWith("click", onClick);

    controller.setEventHandlers([{ event: "mouseover", handler: onHover }]);
    expect(chart.off).toHaveBeenCalledWith("click", onClick);
    expect(chart.on).toHaveBeenCalledWith("mouseover", onHover);

    controller.dispose();
    expect(chart.off).toHaveBeenCalledWith("mouseover", onHover);
  });

  it("waits for a positive size that is stable across two frames", () => {
    const chart = chartEngine();
    const frames = createFrameScheduler();
    const element = document.createElement("div");
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
      width: 640,
      height: 360,
    } as DOMRect);
    const onready = vi.fn();
    const controller = createEChartSurfaceController({
      element,
      option: { series: [] },
      renderer: "canvas",
      initChart: () => chart as never,
      requestFrame: frames.request,
      cancelFrame: frames.cancel,
      onready,
    });

    controller.init();
    expect(controller.ready()).toBe(false);

    controller.resize({ width: 640, height: 360 });
    frames.flush();
    expect(controller.ready()).toBe(false);
    frames.flush();
    expect(controller.ready()).toBe(true);
    expect(element.dataset.chartReady).toBe("true");
    expect(onready).toHaveBeenCalledTimes(1);
  });

  it("invalidates readiness and cancels stale frames on update and resize", () => {
    const chart = chartEngine();
    const frames = createFrameScheduler();
    const element = document.createElement("div");
    const rect = { width: 640, height: 360 };
    vi.spyOn(element, "getBoundingClientRect").mockImplementation(() =>
      rect as DOMRect
    );
    const controller = createEChartSurfaceController({
      element,
      option: { series: [] },
      renderer: "canvas",
      initChart: () => chart as never,
      requestFrame: frames.request,
      cancelFrame: frames.cancel,
    });

    controller.init();
    controller.resize({ width: 640, height: 360 });
    frames.flush();
    controller.update({ series: [{ type: "line", data: [1] }] });
    expect(controller.ready()).toBe(false);
    expect(frames.cancel).toHaveBeenCalled();
    frames.flush();
    frames.flush();
    expect(controller.ready()).toBe(true);

    rect.width = 480;
    controller.resize({ width: 480, height: 360 });
    expect(element.dataset.chartReady).toBe("false");
    frames.flush();
    frames.flush();
    expect(controller.ready()).toBe(true);
  });

  it("reconciles the final element rect before publishing readiness", () => {
    const chart = chartEngine();
    const frames = createFrameScheduler();
    const element = document.createElement("div");
    const rect = { width: 640, height: 360 };
    vi.spyOn(element, "getBoundingClientRect").mockImplementation(() =>
      rect as DOMRect
    );
    const controller = createEChartSurfaceController({
      element,
      option: { series: [] },
      renderer: "canvas",
      initChart: () => chart as never,
      requestFrame: frames.request,
      cancelFrame: frames.cancel,
    });

    controller.init();
    controller.resize({ width: 640, height: 360 });
    frames.flush();
    rect.width = 520;
    frames.flush();
    expect(controller.ready()).toBe(false);
    expect(chart.resize).toHaveBeenLastCalledWith({ width: 520, height: 360 });
    frames.flush();
    frames.flush();
    expect(controller.ready()).toBe(true);
  });

  it("cancels pending readiness work when disposed", () => {
    const chart = chartEngine();
    const frames = createFrameScheduler();
    const element = document.createElement("div");
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
      width: 640,
      height: 360,
    } as DOMRect);
    const controller = createEChartSurfaceController({
      element,
      option: { series: [] },
      renderer: "canvas",
      initChart: () => chart as never,
      requestFrame: frames.request,
      cancelFrame: frames.cancel,
    });

    controller.init();
    controller.resize({ width: 640, height: 360 });
    expect(frames.pending()).toBe(1);
    controller.dispose();
    expect(frames.pending()).toBe(0);
    frames.flush();
    expect(element.dataset.chartReady).toBeUndefined();
    expect(controller.ready()).toBe(false);
  });
});
