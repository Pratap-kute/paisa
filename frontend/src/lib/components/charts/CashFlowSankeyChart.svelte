<script lang="ts">
  import { buildCashFlowSankeyData, buildCashFlowSankeyOption } from "$lib/charts/echarts/cash_flow_sankey";
  import { readEChartTokenTheme } from "$lib/charts/echarts/theme";
  import type { Graph } from "$lib/core/utils";
  import EChartSurface from "./EChartSurface.svelte";
  import { theme } from "../../../store";

  interface Props {
    graph: Graph;
    width?: number;
  }

  let { graph, width = 0 }: Props = $props();
  let chartWidth = $state(0);
  let tokenTheme = $state(readEChartTokenTheme());
  const sankeyData = $derived(buildCashFlowSankeyData(graph));
  const option = $derived(buildCashFlowSankeyOption(sankeyData, {
    width: chartWidth,
    darkMode: $theme === "dark",
    ...tokenTheme,
  }));

  $effect(() => {
    chartWidth = width;
  });

  $effect(() => {
    $theme;
    tokenTheme = readEChartTokenTheme();
  });
</script>

<EChartSurface
  {option}
  ariaLabel="Yearly cash flow Sankey chart"
  onresize={(dimensions) => {
    chartWidth = dimensions.width;
  }}
/>
