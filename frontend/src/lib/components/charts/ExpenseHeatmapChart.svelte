<script lang="ts">
  import type { ExpenseHeatmapData } from "$lib/charts/expense_heatmap_data";
  import { buildExpenseHeatmapOption } from "$lib/charts/echarts/expense_heatmap";
  import { readPaisaChartTheme } from "$lib/charts/echarts/theme";
  import EChartSurface from "./EChartSurface.svelte";
  import { theme } from "../../../store";

  interface Props { data: ExpenseHeatmapData; ariaLabel: string; testId: string }
  let { data, ariaLabel, testId }: Props = $props();
  let width = $state(0);
  let tokenTheme = $state(readPaisaChartTheme());
  const option = $derived(buildExpenseHeatmapOption(data, { width, theme: tokenTheme }));
  $effect(() => { $theme; tokenTheme = readPaisaChartTheme(); });
</script>

<EChartSurface {option} {ariaLabel} {testId} onresize={(size) => width = size.width} />
