<script lang="ts">
  import dayjs from "dayjs";
  import type { ExpenseHeatmapData } from "$lib/charts/expense_heatmap_data";
  import { formatCurrency } from "$lib/core/utils";

  interface Props {
    data: ExpenseHeatmapData;
    ariaLabel: string;
    testId: string;
  }

  let { data, ariaLabel, testId }: Props = $props();
  const weekStart = USER_CONFIG.week_starting_day;
  const weekdays = $derived(
    Array.from({ length: 7 }, (_, index) =>
      dayjs().day((weekStart + index) % 7).format("dd")
    ),
  );
  const firstColumn = $derived(
    ((dayjs(`${data.period}-01`).day() - weekStart + 7) % 7) + 1,
  );

  function detail(index: number) {
    const point = data.points[index];
    const rows = point.tooltipRows.length
      ? point.tooltipRows.map((row) =>
        `${row.label}${row.detail ? ` (${row.detail})` : ""}: ${
          formatCurrency(row.value)
        }`
      )
      : ["No expense activity"];
    return [point.label, ...rows].join("\n");
  }

  function intensity(value: number) {
    if (data.maxValue <= 0) return 0;
    return Math.round(Math.max(0, Math.min(1, value / data.maxValue)) * 100);
  }
</script>

<div
  class="paisa-expense-calendar"
  data-testid={testId}
  data-chart-ready="true"
  role="grid"
  aria-label={ariaLabel}
>
  {#each weekdays as weekday}
    <div class="paisa-expense-calendar-weekday" role="columnheader">
      {weekday}
    </div>
  {/each}
  {#each data.points as point, index}
    <button
      type="button"
      class:paisa-expense-calendar-zero={point.hasActivity && point.value === 0}
      class="paisa-expense-calendar-day"
      style="--calendar-column: {index === 0 ? firstColumn : 'auto'}; --expense-intensity: {intensity(point.value)}%;"
      title={detail(index)}
      aria-label={detail(index)}
      role="gridcell"
    >
      {index + 1}
    </button>
  {/each}
</div>

<style>
  .paisa-expense-calendar {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    align-content: start;
    width: 100%;
    min-width: 0;
    gap: 1px;
    background: var(--paisa-border-subtle);
  }

  .paisa-expense-calendar-weekday,
  .paisa-expense-calendar-day {
    display: grid;
    place-items: center;
    min-width: 0;
    min-height: 2.75rem;
    border: 0;
    background: var(--paisa-surface);
    color: var(--paisa-foreground);
    font: inherit;
    font-size: var(--paisa-font-size-xs);
  }

  .paisa-expense-calendar-weekday {
    min-height: 2rem;
    color: var(--paisa-muted-foreground);
    font-weight: var(--paisa-font-weight-semibold);
  }

  .paisa-expense-calendar-day {
    grid-column-start: var(--calendar-column);
    cursor: help;
    background: color-mix(
      in srgb,
      var(--paisa-negative) var(--expense-intensity),
      var(--paisa-surface)
    );
  }

  .paisa-expense-calendar-day:hover,
  .paisa-expense-calendar-day:focus-visible {
    position: relative;
    z-index: 1;
    outline: 2px solid var(--paisa-focus-ring);
    outline-offset: -2px;
  }

  .paisa-expense-calendar-zero {
    box-shadow: inset 0 0 0 2px var(--paisa-primary);
  }

  @media (max-width: 640px) {
    .paisa-expense-calendar-day {
      min-height: 2.4rem;
    }
  }
</style>
