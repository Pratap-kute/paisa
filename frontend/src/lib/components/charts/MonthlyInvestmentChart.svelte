<script lang="ts">
  import { buildMonthlyInvestmentSeries } from "$lib/charts/time_series_data";
  import type { Posting } from "$lib/core/utils";
  import TimeSeriesChart from "./TimeSeriesChart.svelte";

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
