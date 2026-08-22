<script lang="ts">
  import { buildCashFlowSankeyData, buildCashFlowSankeyOption } from "$lib/charts/echarts/cash_flow_sankey";
  import { readPaisaChartTheme } from "$lib/charts/echarts/theme";
  import type { Graph } from "$lib/core/utils";
  import EChartSurface from "./EChartSurface.svelte";
  import { theme } from "../../../store";

  interface Props {
    graph: Graph;
    width?: number;
  }

  let { graph, width = 0 }: Props = $props();
  let chartWidth = $state(0);
  let tokenTheme = $state(readPaisaChartTheme());
  const sankeyData = $derived(buildCashFlowSankeyData(graph));
  const option = $derived(buildCashFlowSankeyOption(sankeyData, {
    width: chartWidth,
    darkMode: $theme === "dark",
    theme: tokenTheme,
  }));

  $effect(() => {
    chartWidth = width;
  });

  $effect(() => {
    $theme;
    tokenTheme = readPaisaChartTheme();
  });
</script>

<EChartSurface
  {option}
  ariaLabel="Yearly cash flow Sankey chart"
  testId="cash-flow-yearly-echart"
  onresize={(dimensions) => {
    chartWidth = dimensions.width;
  }}
/>
