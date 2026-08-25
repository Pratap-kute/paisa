<script lang="ts">
  import { buildGainAccountSeries } from "$lib/charts/time_series_data";
  import type { Networth } from "$lib/core/utils";
  import TimeSeriesChart from "$lib/features/charts/components/TimeSeriesChart.svelte";

  interface Props {
    points: Networth[];
  }

  let { points }: Props = $props();
  const data = $derived(buildGainAccountSeries(points));
</script>

<TimeSeriesChart
  {data}
  ariaLabel="Asset gain account timeline"
  testId="gain-account-timeline-echart"
/>
