<script lang="ts">
  import { buildFinancialHierarchyOption, type FinancialHierarchyChartData } from "$lib/charts/echarts/hierarchy";
  import { readPaisaChartTheme } from "$lib/charts/echarts/theme";
  import EChartSurface from "./EChartSurface.svelte";
  import { theme } from "../../../store";
  interface Props { data: FinancialHierarchyChartData; ariaLabel: string; testId: string }
  let { data, ariaLabel, testId }: Props = $props();
  let tokenTheme = $state(readPaisaChartTheme());
  const option = $derived(buildFinancialHierarchyOption(data, { theme: tokenTheme }));
  $effect(() => { $theme; tokenTheme = readPaisaChartTheme(); });
</script>
<EChartSurface {option} {ariaLabel} {testId} />
