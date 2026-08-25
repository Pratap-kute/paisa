<script lang="ts">
  import { buildGoalInvestmentSeries } from "$lib/features/charts/time_series_data";
  import type { Posting } from "$lib/core/utils";
  import TimeSeriesChart from "$lib/features/charts/components/TimeSeriesChart.svelte";

  interface Props {
    postings: Posting[];
    pmt?: number;
    testId: string;
  }

  let { postings, pmt = 0, testId }: Props = $props();
  const data = $derived(buildGoalInvestmentSeries(postings, pmt));
</script>

<TimeSeriesChart
  {data}
  ariaLabel="Goal monthly investment timeline"
  {testId}
/>
