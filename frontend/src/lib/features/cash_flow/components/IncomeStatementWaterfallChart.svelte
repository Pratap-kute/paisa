<script lang="ts">
  import type { IncomeStatementWaterfallData } from "$lib/charts/income_statement_data";
  import { buildIncomeStatementWaterfallOption } from "$lib/shared/charts/echarts/waterfall";
  import { readPaisaChartTheme } from "$lib/shared/charts/echarts/theme";
  import EChartSurface from "$lib/shared/charts/EChartSurface.svelte";
  import { theme } from "$lib/state/store";

  interface Props { data: IncomeStatementWaterfallData; ariaLabel: string; testId: string }
  let { data, ariaLabel, testId }: Props = $props();
  let tokenTheme = $state(readPaisaChartTheme());
  const option = $derived(buildIncomeStatementWaterfallOption(data, { theme: tokenTheme, darkMode: $theme === "dark" }));
  $effect(() => { $theme; tokenTheme = readPaisaChartTheme(); });
</script>

<EChartSurface {option} {ariaLabel} {testId} />
