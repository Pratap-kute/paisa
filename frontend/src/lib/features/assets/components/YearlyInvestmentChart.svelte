<script lang="ts">
  import { buildYearlyInvestmentSeries } from "$lib/features/charts/time_series_data";
  import type { InvestmentYearlyCard } from "$lib/core/utils";
  import TimeSeriesChart from "$lib/features/charts/components/TimeSeriesChart.svelte";

  interface Props {
    yearlyCards: InvestmentYearlyCard[];
  }

  let { yearlyCards }: Props = $props();
  const data = $derived(buildYearlyInvestmentSeries(yearlyCards));
</script>

<TimeSeriesChart
  {data}
  ariaLabel="Financial year investment chart"
  testId="investment-yearly-echart"
/>
