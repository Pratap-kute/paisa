import { describe, expect, it, vi } from "vitest";
import { createEChartSurfaceController } from "$lib/charts/echarts/surface_lifecycle";

describe("ECharts surface lifecycle controller", () => {
  it("initializes, updates, resizes, and disposes through the Paisa boundary", () => {
    const chart = {
      setOption: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(),
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
    expect(chart.setOption).toHaveBeenCalledWith(initialOption, true);

    controller.update(updatedOption);
    expect(chart.setOption).toHaveBeenCalledWith(updatedOption, true);

    controller.resize({ width: 640, height: 360 });
    expect(chart.resize).toHaveBeenCalledWith({ width: 640, height: 360 });
    expect(onresize).toHaveBeenCalledWith({ width: 640, height: 360 });

    controller.dispose();
    expect(chart.dispose).toHaveBeenCalledTimes(1);
    expect(controller.chart()).toBeUndefined();
  });

  it("keeps the latest option when update occurs before initialization", () => {
    const chart = {
      setOption: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(),
    };
    const element = document.createElement("div");
    const initialOption = { series: [] };
    const updatedOption = {
      series: [{ type: "sankey", data: [{ name: "Expenses" }] }],
    };

    const controller = createEChartSurfaceController({
      element,
      option: initialOption,
      renderer: "svg",
      initChart: () => chart as never,
    });

    controller.update(updatedOption);
    controller.init();

    expect(chart.setOption).toHaveBeenCalledTimes(1);
    expect(chart.setOption).toHaveBeenCalledWith(updatedOption, true);
  });
});
