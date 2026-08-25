<script lang="ts">
  import { buildMonthlyInvestmentSeries } from "$lib/features/assets/time_series_data";
  import type { Posting } from "$lib/domain/ledger";
  import TimeSeriesChart from "$lib/shared/charts/TimeSeriesChart.svelte";

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
