<script lang="ts">
import { buildGainAccountSeries } from "$lib/features/assets/time_series_data";
import type { Networth } from "$lib/domain/assets";
import TimeSeriesChart from "$lib/shared/charts/TimeSeriesChart.svelte";

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
