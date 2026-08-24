<script lang="ts">
  import {
    buildComparisonBarOption,
    type ComparisonBarChartData,
  } from "$lib/charts/echarts/bar_comparison";
  import type { PaisaChartEventHandler } from "$lib/charts/echarts/surface_lifecycle";
  import { readPaisaChartTheme } from "$lib/charts/echarts/theme";
  import EChartSurface from "./EChartSurface.svelte";
  import { theme } from "../../../store";

  interface Props {
    data: ComparisonBarChartData;
    ariaLabel: string;
    testId: string;
    events?: PaisaChartEventHandler[];
  }

  let { data, ariaLabel, testId, events = [] }: Props = $props();
  let tokenTheme = $state(readPaisaChartTheme());
  const option = $derived(buildComparisonBarOption(data, {
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
  {ariaLabel}
  {testId}
  {events}
/>
