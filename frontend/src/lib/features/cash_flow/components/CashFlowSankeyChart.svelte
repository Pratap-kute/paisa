<script lang="ts">
  import { buildCashFlowSankeyData, buildCashFlowSankeyOption } from "$lib/shared/charts/echarts/cash_flow_sankey";
  import { readPaisaChartTheme } from "$lib/shared/charts/echarts/theme";
  import type { Graph } from "$lib/core/utils";
  import EChartSurface from "$lib/shared/charts/EChartSurface.svelte";
  import { theme } from "$lib/state/store";

  interface Props {
    graph: Graph;
  }

  let { graph }: Props = $props();
  let tokenTheme = $state(readPaisaChartTheme());
  const sankeyData = $derived(buildCashFlowSankeyData(graph));
  const option = $derived(buildCashFlowSankeyOption(sankeyData, {
    darkMode: $theme === "dark",
    theme: tokenTheme,
  }));

  $effect(() => {
    $theme;
    tokenTheme = readPaisaChartTheme();
  });
</script>

<EChartSurface
  {option}
  ariaLabel="Yearly cash flow Sankey chart"
  testId="cash-flow-yearly-echart"
/>
