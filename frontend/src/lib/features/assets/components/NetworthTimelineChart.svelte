<script lang="ts">
import { buildNetworthSeries } from "$lib/features/assets/time_series_data";
import type { Networth } from "$lib/domain/assets";
import TimeSeriesChart from "$lib/shared/charts/TimeSeriesChart.svelte";

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
