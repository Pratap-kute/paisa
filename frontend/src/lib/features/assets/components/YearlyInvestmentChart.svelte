<script lang="ts">
import { buildYearlyInvestmentSeries } from "$lib/features/assets/time_series_data";
import type { InvestmentYearlyCard } from "$lib/domain/assets";
import TimeSeriesChart from "$lib/shared/charts/TimeSeriesChart.svelte";

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
