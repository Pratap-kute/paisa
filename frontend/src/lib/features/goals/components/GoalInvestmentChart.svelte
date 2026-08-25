<script lang="ts">
import { buildGoalInvestmentSeries } from "$lib/features/goals/time_series_data";
import type { Posting } from "$lib/domain/ledger";
import TimeSeriesChart from "$lib/shared/charts/TimeSeriesChart.svelte";

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
