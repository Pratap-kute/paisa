<script lang="ts">
import { buildMonthlyIncomeSeries } from "$lib/features/income/time_series_data";
import type { Income } from "$lib/domain/cash_flow";
import TimeSeriesChart from "$lib/shared/charts/TimeSeriesChart.svelte";

interface Props {
  incomes: Income[];
}

let { incomes }: Props = $props();
const data = $derived(buildMonthlyIncomeSeries(incomes));
</script>

<TimeSeriesChart
  {data}
  ariaLabel="Monthly income timeline"
  testId="income-monthly-echart"
/>
