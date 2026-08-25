<script lang="ts">
import { buildYearlyIncomeComparisonSeries } from "$lib/features/income/time_series_data";
import type { IncomeYearlyCard } from "$lib/domain/cash_flow";
import TimeSeriesChart from "$lib/shared/charts/TimeSeriesChart.svelte";

interface Props {
  yearlyCards: IncomeYearlyCard[];
}

let { yearlyCards }: Props = $props();
const data = $derived(buildYearlyIncomeComparisonSeries(yearlyCards));
</script>

<TimeSeriesChart
  {data}
  ariaLabel="Financial year income chart"
  testId="income-yearly-echart"
/>
