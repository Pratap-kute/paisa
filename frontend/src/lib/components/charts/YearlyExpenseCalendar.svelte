<script lang="ts">
  import type { ExpenseHeatmapData } from "$lib/charts/expense_heatmap_data";
  import { categoryColor } from "$lib/charts/mixed_period_data";
  import { formatCurrency, formatPercentage, tooltip } from "$lib/core/utils";
  import { iconText } from "$lib/core/icon";

  interface Props {
    data: ExpenseHeatmapData;
    ariaLabel: string;
    testId: string;
    colorFor?: (key: string) => string;
  }

  let { data, ariaLabel, testId, colorFor = categoryColor }: Props = $props();

  function detail(point: ExpenseHeatmapData["points"][number]) {
    const rows = point.tooltipRows.length
      ? point.tooltipRows.map((row) =>
        `${row.label}: ${formatCurrency(row.value)} (${
          point.value ? formatPercentage(row.value / point.value, 1) : "0%"
        })`
      )
      : ["No expense activity"];
    return [point.label, ...rows, `Total: ${formatCurrency(point.value)}`].join("\n");
  }

  function detailHtml(point: ExpenseHeatmapData["points"][number]) {
    if (!point.tooltipRows.length) return null;
    return tooltip(
      point.tooltipRows.map((row) => [
        [iconText(row.label), "custom-icon"],
        [row.label, "paisa-truncate"],
        [formatPercentage(row.value / point.value, 1), "paisa-text-right"],
        [formatCurrency(row.value), "paisa-text-bold paisa-text-right"],
      ]),
      { header: point.label, total: formatCurrency(point.value) },
    );
  }

  function composition(point: ExpenseHeatmapData["points"][number]) {
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
  class="paisa-yearly-expense-calendar"
  data-testid={testId}
  data-chart-ready="true"
  role="group"
  aria-label={ariaLabel}
>
  {#each data.points as point}
    <button
      type="button"
      class:paisa-yearly-expense-month-active={point.hasActivity}
      class:paisa-yearly-expense-month-zero={point.hasActivity && point.value === 0}
      class="paisa-yearly-expense-month"
      style="--expense-composition: {composition(point)}"
      aria-label={detail(point)}
      data-tippy-content={detailHtml(point)}
    >
      <span class="paisa-yearly-expense-ring" aria-hidden="true"></span>
      <span class="paisa-yearly-expense-copy">
        <span class="paisa-yearly-expense-label">{point.label.slice(0, 3)}</span>
        <span class="paisa-yearly-expense-total">
          {point.hasActivity ? formatCurrency(point.value, 0) : "No activity"}
        </span>
      </span>
    </button>
  {/each}
</div>

<style>
  .paisa-yearly-expense-calendar {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    width: 100%;
    min-width: 0;
    gap: var(--paisa-space-2);
    container-type: inline-size;
  }

  .paisa-yearly-expense-month {
    display: grid;
    grid-template-columns: 2.75rem minmax(0, 1fr);
    align-items: center;
    min-width: 0;
    min-height: 4.25rem;
    gap: var(--paisa-space-2);
    border: 1px solid var(--paisa-border-subtle);
    border-radius: var(--paisa-radius-sm);
    background: var(--paisa-surface);
    color: var(--paisa-foreground);
    padding: var(--paisa-space-2);
    text-align: left;
    cursor: help;
  }

  .paisa-yearly-expense-ring {
    position: relative;
    display: block;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 50%;
    background: var(--expense-composition);
    box-shadow: inset 0 0 0 1px var(--paisa-border-subtle);
  }

  .paisa-yearly-expense-ring::after {
    position: absolute;
    inset: 0.6rem;
    border-radius: 50%;
    background: var(--paisa-surface);
    content: "";
  }

  .paisa-yearly-expense-copy {
    display: grid;
    min-width: 0;
    gap: 0.125rem;
  }

  .paisa-yearly-expense-label {
    font-size: var(--paisa-font-size-xs);
    font-weight: var(--paisa-font-weight-semibold);
  }

  .paisa-yearly-expense-total {
    overflow: hidden;
    color: var(--paisa-muted-foreground);
    font-size: 0.6875rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .paisa-yearly-expense-month:hover,
  .paisa-yearly-expense-month:focus-visible {
    border-color: var(--paisa-focus-ring);
    outline: 2px solid var(--paisa-focus-ring);
    outline-offset: 1px;
  }

  .paisa-yearly-expense-month:not(.paisa-yearly-expense-month-active) {
    background: var(--paisa-surface-subtle);
  }

  .paisa-yearly-expense-month-zero {
    box-shadow: inset 0 0 0 1px var(--paisa-primary);
  }

  @container (min-width: 44rem) {
    .paisa-yearly-expense-calendar {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  @media (max-width: 520px) {
    .paisa-yearly-expense-calendar {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .paisa-yearly-expense-month {
      grid-template-columns: 2.25rem minmax(0, 1fr);
      min-height: 3.75rem;
    }

    .paisa-yearly-expense-ring {
      width: 2.25rem;
      height: 2.25rem;
    }

    .paisa-yearly-expense-ring::after {
      inset: 0.5rem;
    }
  }
</style>
