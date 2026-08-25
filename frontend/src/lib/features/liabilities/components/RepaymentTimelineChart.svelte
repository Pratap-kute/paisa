<script lang="ts">
  import { buildRepaymentSeries } from "$lib/charts/time_series_data";
  import type { Posting } from "$lib/core/utils";
  import TimeSeriesChart from "$lib/features/charts/components/TimeSeriesChart.svelte";

  interface Props {
    repayments: Posting[];
  }

  let { repayments }: Props = $props();
  const data = $derived(buildRepaymentSeries(repayments));
</script>

<TimeSeriesChart
  {data}
  ariaLabel="Monthly repayment timeline"
  testId="repayment-timeline-echart"
/>
