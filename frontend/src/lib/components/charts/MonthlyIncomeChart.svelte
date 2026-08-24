<script lang="ts">
  import { buildMonthlyIncomeSeries } from "$lib/charts/time_series_data";
  import type { Income } from "$lib/core/utils";
  import TimeSeriesChart from "./TimeSeriesChart.svelte";

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
