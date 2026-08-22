<script lang="ts">
  import { buildYearlyIncomeSeries } from "$lib/charts/time_series_data";
  import type { IncomeYearlyCard } from "$lib/core/utils";
  import TimeSeriesChart from "./TimeSeriesChart.svelte";

  interface Props {
    yearlyCards: IncomeYearlyCard[];
  }

  let { yearlyCards }: Props = $props();
  const data = $derived(buildYearlyIncomeSeries(yearlyCards));
</script>

<TimeSeriesChart
  {data}
  ariaLabel="Financial year income chart"
  testId="income-yearly-echart"
/>
