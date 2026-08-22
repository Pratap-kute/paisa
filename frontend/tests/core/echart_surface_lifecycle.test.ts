import { describe, expect, it, vi } from "vitest";
import { createEChartSurfaceController } from "$lib/charts/echarts/surface_lifecycle";

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
    });

    controller.init();
    expect(initChart).toHaveBeenCalledWith(element, "canvas");
    expect(chart.on).toHaveBeenCalledWith("finished", expect.any(Function));
    expect(chart.setOption).toHaveBeenCalledWith(initialOption, true);
    expect(element.dataset.chartReady).toBe("false");

    controller.update(updatedOption);
    expect(chart.setOption).toHaveBeenCalledWith(updatedOption, true);

    controller.resize({ width: 640, height: 360 });
    expect(chart.resize).toHaveBeenCalledWith({ width: 640, height: 360 });
    expect(onresize).toHaveBeenCalledWith({ width: 640, height: 360 });

    controller.markReady();
    expect(controller.ready()).toBe(true);
    expect(element.dataset.chartReady).toBe("true");

    controller.dispose();
    expect(chart.off).toHaveBeenCalledWith("finished", expect.any(Function));
    expect(chart.dispose).toHaveBeenCalledTimes(1);
    expect(controller.chart()).toBeUndefined();
    expect(controller.ready()).toBe(false);
    expect(element.dataset.chartReady).toBeUndefined();
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
});
