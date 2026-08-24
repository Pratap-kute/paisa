<script lang="ts">
  import dayjs from "dayjs";
  import type { ExpenseHeatmapData } from "$lib/charts/expense_heatmap_data";
  import { categoryColor } from "$lib/charts/mixed_period_data";
  import {
    formatCurrency,
    tooltip,
  } from "$lib/core/utils";
  import { iconText } from "$lib/shared/ui/icon";

  interface Props {
    data: ExpenseHeatmapData;
    ariaLabel: string;
    testId: string;
    colorFor?: (key: string) => string;
  }

  let { data, ariaLabel, testId, colorFor = categoryColor }: Props = $props();
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
    return [point.label, ...rows, `Total: ${formatCurrency(point.value)}`].join("\n");
  }

  function detailHtml(index: number) {
    const point = data.points[index];
    if (!point.tooltipRows.length) return null;
    return tooltip(
      point.tooltipRows.map((row) => [
        [
          iconText(row.detail ?? ""),
          "custom-icon",
        ],
        [row.label, "paisa-truncate"],
        [formatCurrency(row.value), "paisa-text-bold paisa-text-right"],
      ]),
      { header: point.label, total: formatCurrency(point.value) },
    );
  }

  function ring(point: ExpenseHeatmapData["points"][number]) {
    if (!point.segments?.length || point.value <= 0) return "none";
    let offset = 0;
    const stops = point.segments.flatMap((segment) => {
      const start = offset;
      offset += segment.value / point.value * 100;
      return [
        `${colorFor(segment.key)} ${start}%`,
        `${colorFor(segment.key)} ${offset}%`,
      ];
    });
    return `conic-gradient(${stops.join(", ")})`;
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
      class:paisa-expense-calendar-active={point.hasActivity}
      class="paisa-expense-calendar-day"
      style="--calendar-column: {index === 0 ? firstColumn : 'auto'}; --expense-ring: {ring(point)};"
      aria-label={detail(index)}
      data-tippy-content={detailHtml(index)}
      role="gridcell"
    >
      <span class="paisa-expense-calendar-ring" aria-hidden="true">
        <span>{index + 1}</span>
      </span>
      <span class="paisa-expense-calendar-total">
        {point.value > 0 ? formatCurrency(point.value, 0) : ""}
      </span>
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
    min-height: 4.25rem;
    grid-template-rows: auto 1rem;
    align-content: center;
    gap: 0.2rem;
    background: var(--paisa-surface);
  }

  .paisa-expense-calendar-ring {
    position: relative;
    display: grid;
    width: 2.25rem;
    height: 2.25rem;
    place-items: center;
    border-radius: 50%;
    background: var(--expense-ring);
  }

  .paisa-expense-calendar-ring::after {
    position: absolute;
    inset: 4px;
    border-radius: 50%;
    background: var(--paisa-surface);
    content: "";
  }

  .paisa-expense-calendar-ring > span {
    position: relative;
    z-index: 1;
    font-weight: var(--paisa-font-weight-medium);
  }

  .paisa-expense-calendar-day:not(.paisa-expense-calendar-active) .paisa-expense-calendar-ring {
    box-shadow: inset 0 0 0 1px var(--paisa-border-subtle);
  }

  .paisa-expense-calendar-total {
    max-width: 100%;
    overflow: hidden;
    color: var(--paisa-muted-foreground);
    font-size: 0.625rem;
    line-height: 1rem;
    text-overflow: ellipsis;
    white-space: nowrap;
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
      min-height: 3.75rem;
    }

    .paisa-expense-calendar-ring {
      width: 2rem;
      height: 2rem;
    }
  }
</style>
