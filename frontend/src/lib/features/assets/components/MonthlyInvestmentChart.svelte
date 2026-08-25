<script lang="ts">
  import { buildMonthlyInvestmentSeries } from "$lib/features/charts/time_series_data";
  import type { Posting } from "$lib/core/utils";
  import TimeSeriesChart from "$lib/features/charts/components/TimeSeriesChart.svelte";

  interface Props {
    postings: Posting[];
  }

  let { postings }: Props = $props();
  const data = $derived(buildMonthlyInvestmentSeries(postings));
</script>

<TimeSeriesChart
  {data}
  ariaLabel="Monthly investment timeline"
  testId="investment-monthly-echart"
/>
