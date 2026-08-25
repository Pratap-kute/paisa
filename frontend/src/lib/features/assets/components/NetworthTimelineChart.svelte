<script lang="ts">
  import { buildNetworthSeries } from "$lib/features/charts/time_series_data";
  import type { Networth } from "$lib/core/utils";
  import TimeSeriesChart from "$lib/features/charts/components/TimeSeriesChart.svelte";

  interface Props {
    points: Networth[];
  }

  let { points }: Props = $props();
  const data = $derived(buildNetworthSeries(points));
</script>

<TimeSeriesChart
  {data}
  ariaLabel="Net worth timeline"
  testId="networth-timeline-echart"
/>
