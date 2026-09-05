<script lang="ts">
import type { Insight } from "$lib/domain/insights";
import InsightCard from "./InsightCard.svelte";
import Spinner from "$lib/shared/ui/Spinner.svelte";

interface Props {
  insights: Insight[];
  isPartial?: boolean;
  comparisonPeriod?: string;
  loading?: boolean;
  maxItems?: number;
}

let {
  insights = [],
  isPartial = false,
  comparisonPeriod,
  loading = false,
  maxItems = 3,
}: Props = $props();

let topInsights = $derived(insights.slice(0, maxItems));

let criticalCount = $derived(
  insights.filter((i) => i.severity === "critical" || i.severity === "warning")
    .length,
);
</script>

{#if loading}
  <div
  class="rounded-xl p-3.5 sm:p-4 bg-surface border border-border-subtle shadow-xs">
  <div class="flex items-center justify-between mb-2">
    <div class="flex items-center gap-2">
      <i class="fa-solid fa-lightbulb text-xs text-primary"></i>
      <span
        class="text-xs font-semibold uppercase tracking-wider text-foreground">
          Financial Insights
        </span>
    </div>
  </div>
  <div class="flex items-center justify-center py-4">
    <Spinner />
  </div>
</div>
{:else if topInsights.length > 0}
  <div
  class="rounded-xl p-3.5 sm:p-4 bg-surface border border-border-subtle shadow-xs flex flex-col min-w-0 space-y-2.5">
  <!-- Header -->
  <div class="flex items-center justify-between gap-2">
    <div class="flex items-center gap-2">
        <i class="fa-solid fa-lightbulb text-xs text-primary"></i>
        <a href="/insights" class="text-xs font-semibold uppercase tracking-wider text-foreground hover:text-primary transition-colors">
          Financial Insights
        </a>
        {#if criticalCount > 0}
          <span class="inline-flex items-center text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-negative-subtle text-negative border border-[var(--paisa-negative)]/20">
            {criticalCount} {criticalCount === 1 ? 'alert' : 'alerts'}
          </span>
        {/if}
      </div>

    <a
      href="/insights"
      class="text-xs font-semibold text-primary hover:underline flex items-center gap-1 uppercase tracking-wider group"
    >
      <span>View all {insights.length}</span>
      <i
        class="fa-solid fa-arrow-right text-[9px] transform group-hover:translate-x-0.5 transition-transform"></i>
    </a>
  </div>

  <!-- Single Row 3-Column Compact Grid -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5">
      {#each topInsights as insight (insight.id)}
        <InsightCard
          {insight}
          {isPartial}
          {comparisonPeriod}
          compact={true}
        />
      {/each}
    </div>
</div>
{/if}
