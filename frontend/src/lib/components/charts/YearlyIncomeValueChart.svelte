<script lang="ts">
  import { buildYearlyIncomeValueSeries } from "$lib/charts/time_series_data";
  import type { IncomeYearlyCard } from "$lib/core/utils";
  import TimeSeriesChart from "./TimeSeriesChart.svelte";

  interface Props {
    label: string;
    seriesKey: "net_tax" | "net_income";
    color: string;
    yearlyCards: IncomeYearlyCard[];
    testId: string;
  }

  let { label, seriesKey, color, yearlyCards, testId }: Props = $props();
  const data = $derived(buildYearlyIncomeValueSeries(label, seriesKey, color, yearlyCards));
</script>

<TimeSeriesChart
  {data}
  ariaLabel="{label} financial year chart"
  {testId}
/>
