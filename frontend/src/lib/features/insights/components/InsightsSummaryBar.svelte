<script lang="ts">
import type { Insight } from "$lib/domain/insights";
import dayjs from "dayjs";

interface Props {
  insights: Insight[];
  period: string;
  comparisonPeriod?: string;
  isPartial?: boolean;
}

let {
  insights = [],
  period,
  comparisonPeriod,
  isPartial = false,
}: Props = $props();

let criticalCount = $derived(
  insights.filter((i) => i.severity === "critical" || i.severity === "warning")
    .length,
);
let positiveCount = $derived(
  insights.filter((i) => i.severity === "positive").length,
);

let monthName = $derived.by(() => {
  const d = dayjs(`${period}-01`);
  return d.isValid() ? d.format("MMMM YYYY") : period;
});

let compName = $derived.by(() => {
  if (!comparisonPeriod) return "previous month";
  const d = dayjs(`${comparisonPeriod}-01`);
  return d.isValid() ? d.format("MMMM") : comparisonPeriod;
});
</script>

<div
  class="rounded-xl p-3.5 sm:p-4 bg-[var(--paisa-surface)] border border-[var(--paisa-border-subtle)] shadow-xs">
  <div
    class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <!-- Left: Status Greeting -->
    <div class="space-y-0.5">
      <div class="flex items-center gap-1.5">
        <span
          class="inline-flex items-center justify-center h-1.5 w-1.5 rounded-full bg-[var(--paisa-primary)]"></span>
        <span
          class="text-[11px] font-semibold uppercase tracking-wider text-[var(--paisa-primary)]">
          {monthName} Financial Health
        </span>
      </div>
      <h3
        class="text-sm sm:text-base font-bold text-[var(--paisa-foreground)] tracking-tight">
        {#if criticalCount > 0}
          {criticalCount} {criticalCount === 1 ? 'area requires' : 'areas require'} attention
        {:else if insights.length > 0}
          Finances looking stable this month
        {:else}
          All clear for this month
        {/if}
      </h3>
      <p class="text-[11px] text-[var(--paisa-muted-foreground)]">
        Compared against {compName} {isPartial ? '(month-to-date)' : '(full month)'}.
      </p>
    </div>

    <!-- Right: Metric Stat Chips -->
    <div class="flex items-center gap-2 flex-wrap">
      {#if criticalCount > 0}
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--paisa-negative-subtle)] border border-[var(--paisa-negative)]/20 text-[var(--paisa-negative)]">
          <i class="fa-solid fa-triangle-exclamation text-xs"></i>
          <span class="text-xs font-bold">{criticalCount} Attention</span>
        </div>
      {/if}

      {#if positiveCount > 0}
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--paisa-positive-subtle)] border border-[var(--paisa-positive)]/20 text-[var(--paisa-positive)]">
          <i class="fa-solid fa-arrow-trend-up text-xs"></i>
          <span class="text-xs font-bold">{positiveCount} Positive</span>
        </div>
      {/if}

      <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--paisa-surface-hover)] border border-[var(--paisa-border-subtle)] text-[var(--paisa-muted-foreground)]">
        <i class="fa-solid fa-list-check text-xs"></i>
        <span class="text-xs font-semibold text-[var(--paisa-foreground)]">{insights.length} Total</span>
      </div>
    </div>
  </div>
</div>
