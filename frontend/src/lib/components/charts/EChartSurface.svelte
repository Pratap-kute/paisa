<script lang="ts">
  import type { Dimensions } from "$lib/charts/resize";
  import { observeElementSize } from "$lib/charts/resize";
  import {
    createEChartSurfaceController,
    type EChartSurfaceController,
  } from "$lib/charts/echarts/surface_lifecycle";
  import { theme } from "../../../store";
  import type { EChartsCoreOption } from "echarts/core";

  interface Props {
    option: EChartsCoreOption;
    renderer?: "canvas" | "svg";
    class?: string;
    ariaLabel?: string;
    onresize?: (dimensions: Dimensions) => void;
  }

  let {
    option,
    renderer = "canvas",
    class: className = "",
    ariaLabel = "Chart",
    onresize,
  }: Props = $props();

  let element: HTMLDivElement | undefined = $state();
  let controller: EChartSurfaceController | undefined = $state();
  let currentTheme = $derived($theme);

  async function ensureChart() {
    if (!element || controller || typeof window === "undefined") return;

    const echarts = await import("$lib/charts/echarts/core");
    controller = createEChartSurfaceController({
      element,
      option,
      renderer,
      initChart: echarts.initChart,
      onresize,
    });
    controller.init();
  }

  $effect(() => {
    if (!element || typeof window === "undefined") return;

    let disposed = false;
    ensureChart();
    const cleanup = observeElementSize(element, (dimensions) => {
      if (disposed || !controller) return;
      controller.resize(dimensions);
    });

    return () => {
      disposed = true;
      cleanup?.();
      controller?.dispose();
      controller = undefined;
    };
  });

  $effect(() => {
    controller?.update(option);
  });

  $effect(() => {
    currentTheme;
    controller?.update(option);
  });
</script>

<div
  bind:this={element}
  class="paisa-echart-surface {className}"
  role="img"
  aria-label={ariaLabel}
></div>

<style>
  .paisa-echart-surface {
    min-height: 320px;
    height: 100%;
    width: 100%;
  }
</style>
