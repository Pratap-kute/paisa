<script lang="ts">
  import { buildRepaymentSeries } from "$lib/features/liabilities/time_series_data";
  import type { Posting } from "$lib/domain/ledger";
  import TimeSeriesChart from "$lib/shared/charts/TimeSeriesChart.svelte";

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
