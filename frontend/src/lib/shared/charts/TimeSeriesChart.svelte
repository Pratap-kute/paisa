<script lang="ts">
  import {
    buildPeriodSeriesOption,
    type PeriodSeriesChartData,
  } from "$lib/shared/charts/echarts/period_series";
  import { readPaisaChartTheme } from "$lib/shared/charts/echarts/theme";
  import EChartSurface from "$lib/shared/charts/EChartSurface.svelte";
  import { theme } from "$lib/shared/state/store";

  interface Props {
    data: PeriodSeriesChartData;
    ariaLabel: string;
    testId: string;
    internalLegend?: boolean;
  }

  let { data, ariaLabel, testId, internalLegend = false }: Props = $props();
  let tokenTheme = $state(readPaisaChartTheme());
  const option = $derived(buildPeriodSeriesOption(data, {
    darkMode: $theme === "dark",
    theme: tokenTheme,
    internalLegend,
  }));

  $effect(() => {
    $theme;
    tokenTheme = readPaisaChartTheme();
  });
</script>

<EChartSurface {option} {ariaLabel} {testId} />
