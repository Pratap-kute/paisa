<script lang="ts">
  import type { ExpenseHeatmapData } from "$lib/charts/expense_heatmap_data";
  import DailyExpenseCalendar from "./DailyExpenseCalendar.svelte";
  import YearlyExpenseCalendar from "./YearlyExpenseCalendar.svelte";

  interface Props {
    data: ExpenseHeatmapData;
    ariaLabel: string;
    testId: string;
    colorFor?: (key: string) => string;
  }
  let { data, ariaLabel, testId, colorFor }: Props = $props();
</script>

{#if data.granularity === "day"}
  <DailyExpenseCalendar {data} {ariaLabel} {testId} {colorFor} />
{:else}
  <YearlyExpenseCalendar {data} {ariaLabel} {testId} {colorFor} />
{/if}
