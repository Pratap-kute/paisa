<script lang="ts">
import Page from "$lib/shared/layout/Page.svelte";
import PageHeader from "$lib/shared/layout/PageHeader.svelte";
import LastNMonths from "$lib/shared/ui/LastNMonths.svelte";
import ZeroState from "$lib/shared/ui/ZeroState.svelte";
import Spinner from "$lib/shared/ui/Spinner.svelte";
import BoxedTabs from "$lib/shared/ui/BoxedTabs.svelte";
import InsightCard from "$lib/features/insights/components/InsightCard.svelte";
import InsightItem from "$lib/features/insights/components/InsightItem.svelte";
import InsightsSummaryBar from "$lib/features/insights/components/InsightsSummaryBar.svelte";
import { mapInsightsResponseToDomain } from "$lib/features/insights/presentation";
import {
  type Insight,
  INSIGHT_CATEGORIES,
  type InsightCategoryFilter,
  type InsightsResult,
} from "$lib/domain/insights";
import { now } from "$lib/domain/time";
import { api } from "$lib/api";

let selectedMonth = $state(now().format("YYYY-MM"));
let selectedCategory: InsightCategoryFilter = $state("all");
let viewMode: "grid" | "list" = $state("grid");
let isLoading = $state(true);
let response: InsightsResult | null = $state(null);

async function loadInsights(period: string) {
  isLoading = true;
  try {
    const res = await api.insights.getInsights({ period });
    response = mapInsightsResponseToDomain(res);
  } catch (err) {
    console.error("Failed to fetch insights:", err);
    response = null;
  } finally {
    isLoading = false;
  }
}

$effect(() => {
  if (selectedMonth) {
    loadInsights(selectedMonth);
  }
});

let allInsights = $derived(response?.insights || []);

let filteredInsights = $derived.by(() => {
  if (selectedCategory === "all") return allInsights;
  return allInsights.filter((ins) => ins.category === selectedCategory);
});

// Strict partitions for executive briefing when "All" is active (Zero duplication)
let attentionInsights = $derived(
  allInsights.filter((i) =>
    i.severity === "critical" || i.severity === "warning"
  ),
);
let positiveInsights = $derived(
  allInsights.filter((i) => i.severity === "positive"),
);
let observationInsights = $derived(
  allInsights.filter(
    (i) =>
      i.severity !== "critical" &&
      i.severity !== "warning" &&
      i.severity !== "positive",
  ),
);

const tabOptions = $derived.by(() => {
  return INSIGHT_CATEGORIES.map((c) => {
    const count = c.id === "all"
      ? allInsights.length
      : allInsights.filter((i) => i.category === c.id).length;
    return {
      value: c.id,
      label: count > 0 ? `${c.label} (${count})` : c.label,
    };
  });
});
</script>

<Page width="analysis">
  <div class="w-full flex flex-col space-y-6">
    <!-- Header with Month Switcher -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <PageHeader
        title="Financial Insights"
        description="Deterministic observations, risks, and milestones derived from your ledger"
      />
      <div class="flex items-center gap-3 self-start sm:self-auto flex-wrap">
        <!-- View Mode Switcher -->
        <div class="inline-flex rounded-lg bg-[var(--paisa-surface-raised)] p-1 border border-[var(--paisa-border-subtle)]">
          <button
            type="button"
            class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors {viewMode === 'grid' ? 'bg-[var(--paisa-surface)] text-[var(--paisa-foreground)] shadow-xs' : 'text-[var(--paisa-muted-foreground)] hover:text-[var(--paisa-foreground)]'}"
            onclick={() => (viewMode = "grid")}
            title="Card Grid View"
          >
            <i class="fa-solid fa-table-cells-large text-[11px]"></i>
            <span class="hidden sm:inline">Cards</span>
          </button>
          <button
            type="button"
            class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors {viewMode === 'list' ? 'bg-[var(--paisa-surface)] text-[var(--paisa-foreground)] shadow-xs' : 'text-[var(--paisa-muted-foreground)] hover:text-[var(--paisa-foreground)]'}"
            onclick={() => (viewMode = "list")}
            title="Compact List View"
          >
            <i class="fa-solid fa-list text-[11px]"></i>
            <span class="hidden sm:inline">List</span>
          </button>
        </div>

        <LastNMonths n={6} bind:value={selectedMonth} />
      </div>
    </div>

    <!-- Top Executive Health Summary Bar -->
    {#if !isLoading && allInsights.length > 0}
      <InsightsSummaryBar
        insights={allInsights}
        period={response?.period || selectedMonth}
        comparisonPeriod={response?.comparisonPeriod}
        isPartial={response?.isPartial}
      />
    {/if}

    <!-- Category Filter Tabs -->
    <div class="paisa-overflow-x-auto pb-1">
      <BoxedTabs
        options={tabOptions}
        bind:value={selectedCategory}
      />
    </div>

    <!-- Main Insights Area -->
    {#if isLoading}
      <div class="flex items-center justify-center py-20">
        <Spinner />
      </div>
    {:else if filteredInsights.length === 0}
      <div class="rounded-xl p-8 bg-[var(--paisa-surface)] border border-[var(--paisa-border-subtle)]">
        <ZeroState item={false}>
          <div class="text-center space-y-2">
            <i class="fa-solid fa-circle-check text-3xl text-[var(--paisa-positive)]"></i>
            <h3 class="text-base font-semibold text-[var(--paisa-foreground)]">
              No observations in this category
            </h3>
            <p class="text-sm text-[var(--paisa-muted-foreground)] max-w-md mx-auto">
              No material deviations, risks, or unusual spikes were detected for {selectedCategory === 'all' ? 'this month' : selectedCategory}.
            </p>
          </div>
        </ZeroState>
      </div>
    {:else if viewMode === "list"}
      <!-- Compact List View (High Density) -->
      <div class="grid grid-cols-1 gap-2.5">
        {#each filteredInsights as insight (insight.id)}
          <InsightItem
            {insight}
            isPartial={response?.isPartial}
            comparisonPeriod={response?.comparisonPeriod}
          />
        {/each}
      </div>
    {:else if selectedCategory !== "all"}
      <!-- Filtered Category Card Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {#each filteredInsights as insight (insight.id)}
          <InsightCard
            {insight}
            isPartial={response?.isPartial}
            comparisonPeriod={response?.comparisonPeriod}
          />
        {/each}
      </div>
    {:else}
      <!-- Executive Briefing Grouped View (When "All" is active) -->
      <div class="space-y-6">
        <!-- Section 1: Needs Attention / Critical Risks -->
        {#if attentionInsights.length > 0}
          <div class="space-y-2.5">
            <div class="flex items-center gap-2">
              <i class="fa-solid fa-triangle-exclamation text-xs text-[var(--paisa-negative)]"></i>
              <h3 class="text-xs font-bold uppercase tracking-wider text-[var(--paisa-foreground)]">
                Needs Attention ({attentionInsights.length})
              </h3>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {#each attentionInsights as insight (insight.id)}
                <InsightCard
                  {insight}
                  isPartial={response?.isPartial}
                  comparisonPeriod={response?.comparisonPeriod}
                />
              {/each}
            </div>
          </div>
        {/if}

        <!-- Section 2: Positive Trends -->
        {#if positiveInsights.length > 0}
          <div class="space-y-2.5">
            <div class="flex items-center gap-2">
              <i class="fa-solid fa-circle-check text-xs text-[var(--paisa-positive)]"></i>
              <h3 class="text-xs font-bold uppercase tracking-wider text-[var(--paisa-foreground)]">
                Positive Trends ({positiveInsights.length})
              </h3>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {#each positiveInsights as insight (insight.id)}
                <InsightCard
                  {insight}
                  isPartial={response?.isPartial}
                  comparisonPeriod={response?.comparisonPeriod}
                />
              {/each}
            </div>
          </div>
        {/if}

        <!-- Section 3: Observations & Trends -->
        {#if observationInsights.length > 0}
          <div class="space-y-2.5">
            <div class="flex items-center gap-2">
              <i class="fa-solid fa-chart-line text-xs text-[var(--paisa-muted-foreground)]"></i>
              <h3 class="text-xs font-bold uppercase tracking-wider text-[var(--paisa-foreground)]">
                Observations & Shifts ({observationInsights.length})
              </h3>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {#each observationInsights as insight (insight.id)}
                <InsightCard
                  {insight}
                  isPartial={response?.isPartial}
                  comparisonPeriod={response?.comparisonPeriod}
                />
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</Page>
