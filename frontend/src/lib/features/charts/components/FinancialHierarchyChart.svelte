<script lang="ts">
  import { buildFinancialHierarchyOption, type FinancialHierarchyChartData } from "$lib/shared/charts/echarts/hierarchy";
  import { readPaisaChartTheme } from "$lib/shared/charts/echarts/theme";
  import EChartSurface from "$lib/shared/charts/EChartSurface.svelte";
  import { theme } from "$lib/state/store";
  interface Props { data: FinancialHierarchyChartData; ariaLabel: string; testId: string }
  let { data, ariaLabel, testId }: Props = $props();
  let tokenTheme = $state(readPaisaChartTheme());
  const option = $derived(buildFinancialHierarchyOption(data, { theme: tokenTheme }));
  $effect(() => { $theme; tokenTheme = readPaisaChartTheme(); });
</script>
<EChartSurface {option} {ariaLabel} {testId} />
