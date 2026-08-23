<script lang="ts">
  import type { ExpenseHeatmapData } from "$lib/charts/expense_heatmap_data";
  import { buildYearlyExpenseHeatmapOption } from "$lib/charts/echarts/expense_heatmap";
  import { readPaisaChartTheme } from "$lib/charts/echarts/theme";
  import EChartSurface from "./EChartSurface.svelte";
  import DailyExpenseCalendar from "./DailyExpenseCalendar.svelte";
  import { theme } from "../../../store";

  interface Props { data: ExpenseHeatmapData; ariaLabel: string; testId: string }
  let { data, ariaLabel, testId }: Props = $props();
  let compact = $state(false);
  let tokenTheme = $state(readPaisaChartTheme());
  const option = $derived(
    data.granularity === "month"
      ? buildYearlyExpenseHeatmapOption(data, { compact, theme: tokenTheme })
      : undefined,
  );
  $effect(() => { $theme; tokenTheme = readPaisaChartTheme(); });
</script>

{#if data.granularity === "day"}
  <DailyExpenseCalendar {data} {ariaLabel} {testId} />
{:else if option}
  <EChartSurface
    {option}
    {ariaLabel}
    {testId}
    class="paisa-yearly-expense-heatmap"
    onresize={(size) => compact = size.width < 640}
  />
{/if}

<style>
  :global(.paisa-yearly-expense-heatmap) {
    min-height: 180px;
  }
</style>
