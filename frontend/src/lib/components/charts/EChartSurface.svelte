<script lang="ts">
  import type { Dimensions } from "$lib/charts/resize";
  import { observeElementSize } from "$lib/charts/resize";
  import {
    createEChartSurfaceController,
    type EChartSurfaceController,
    type EChartRenderer,
    type PaisaChartEventHandler,
  } from "$lib/charts/echarts/surface_lifecycle";
  import type { EChartsCoreOption } from "echarts/core";
  import { untrack } from "svelte";

  interface Props {
    option: EChartsCoreOption;
    renderer?: EChartRenderer;
    class?: string;
    ariaLabel?: string;
    testId?: string;
    events?: PaisaChartEventHandler[];
    onresize?: (dimensions: Dimensions) => void;
    onready?: () => void;
  }

  let {
    option,
    renderer = "canvas",
    class: className = "",
    ariaLabel = "Chart",
    testId = "paisa-echart-surface",
    events = [],
    onresize,
    onready,
  }: Props = $props();

  let element: HTMLDivElement | undefined = $state();
  let controller: EChartSurfaceController | undefined = $state();
  let chartReady = $state(false);
  let pendingDimensions: Dimensions | undefined;

  async function ensureChart() {
    if (!element || controller || typeof window === "undefined") return;

    const echarts = await import("$lib/charts/echarts/core");
    if (!element?.isConnected || controller) return;
    controller = createEChartSurfaceController({
      element,
      option,
      renderer,
      initChart: echarts.initChart,
      onresize,
      onready,
      onreadinesschange: (ready) => {
        chartReady = ready;
      },
      eventHandlers: events,
    });
    controller.init();
    const rect = element.getBoundingClientRect();
    const dimensions = pendingDimensions ?? {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
    if (dimensions.width > 0 && dimensions.height > 0) {
      controller.resize(dimensions);
    }
  }

  $effect(() => {
    if (!element || typeof window === "undefined") return;

    let disposed = false;
    const cleanup = observeElementSize(element, (dimensions) => {
      if (disposed) return;
      pendingDimensions = dimensions;
      if (!controller) return;
      controller.resize(dimensions);
    });
    untrack(() => ensureChart());

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
    controller?.setEventHandlers(events);
  });
</script>

<div
  bind:this={element}
  class="paisa-echart-surface {className}"
  data-testid={testId}
  data-chart-ready={chartReady ? "true" : "false"}
  role="img"
  aria-label={ariaLabel}
></div>

<style>
  .paisa-echart-surface {
    min-height: 320px;
    height: 100%;
    width: 100%;
    min-width: 0;
    overflow: hidden;
  }
</style>
