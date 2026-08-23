<script lang="ts">
  import type { IncomeStatementWaterfallData } from "$lib/charts/income_statement_data";
  import { buildIncomeStatementWaterfallOption } from "$lib/charts/echarts/waterfall";
  import { readPaisaChartTheme } from "$lib/charts/echarts/theme";
  import EChartSurface from "./EChartSurface.svelte";
  import { theme } from "../../../store";

  interface Props { data: IncomeStatementWaterfallData; ariaLabel: string; testId: string }
  let { data, ariaLabel, testId }: Props = $props();
  let compact = $state(false);
  let tokenTheme = $state(readPaisaChartTheme());
  const option = $derived(buildIncomeStatementWaterfallOption(data, { compact, theme: tokenTheme, darkMode: $theme === "dark" }));
  $effect(() => { $theme; tokenTheme = readPaisaChartTheme(); });
</script>

<EChartSurface {option} {ariaLabel} {testId} onresize={(dimensions) => compact = dimensions.width < 640} />
