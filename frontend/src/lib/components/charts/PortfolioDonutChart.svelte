<script lang="ts">
  import {
    buildPortfolioDonutData,
    buildPortfolioDonutOption,
    type DonutChartItem,
  } from "$lib/charts/echarts/donut";
  import { readPaisaChartTheme } from "$lib/charts/echarts/theme";
  import type { PortfolioAggregate } from "$lib/core/utils";
  import EChartSurface from "./EChartSurface.svelte";
  import { theme } from "../../../store";

  interface Props {
    data: PortfolioAggregate[] | DonutChartItem[];
    ariaLabel: string;
    testId: string;
  }

  let { data, ariaLabel, testId }: Props = $props();

  let tokenTheme = $state(readPaisaChartTheme());

  const items = $derived.by(() => {
    if (!data || data.length === 0) return [];
    if ("group" in data[0]) {
      return buildPortfolioDonutData(data as PortfolioAggregate[]);
    }
    return data as DonutChartItem[];
  });

  const option = $derived(
    buildPortfolioDonutOption(items, { theme: tokenTheme }),
  );

  $effect(() => {
    $theme;
    tokenTheme = readPaisaChartTheme();
  });
</script>

<EChartSurface {option} {ariaLabel} {testId} />
