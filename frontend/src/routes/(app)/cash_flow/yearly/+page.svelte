<script lang="ts">
  import { onMount } from "svelte";
  import { partition } from "es-toolkit";
  import { buildCashFlowSankeyData } from "$lib/charts/cash_flow_sankey_data";
  import { buildCashFlowHierarchyData } from "$lib/charts/cash_flow_hierarchy";
  import CashFlowSankeyChart from "$lib/components/charts/CashFlowSankeyChart.svelte";
  import FinancialHierarchyChart from "$lib/components/charts/FinancialHierarchyChart.svelte";
  import { ajax, depth, firstName, type Graph, type Legend, type Posting } from "$lib/core/utils";
  import { dateMin, dateMax, year } from "../../../../store";
  import {
    setCashflowDepthAllowed,
    cashflowExpenseDepth,
    cashflowExpenseDepthAllowed,
    cashflowIncomeDepth,
    cashflowIncomeDepthAllowed,
    cashflowViewMode,
  } from "../../../../persisted_store";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";
  import FinancialYearPicker from "$lib/components/ui/FinancialYearPicker.svelte";
  import InputRange from "$lib/components/ui/InputRange.svelte";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";
  import { max as arrayMax, minBy } from "$lib/core/collection";

  let graph: Record<string, Graph> = $state();
  let expenses: Posting[] = $state([]);
  let isLoading = $state(true);
  let rawGraph: Graph | undefined = $derived.by(() => {
    if (!graph || isLoading || !graph[$year]) return undefined;
    return graph[$year];
  });
  let selectedGraph: Graph | undefined = $derived.by(() => {
    if (!graph || isLoading || !graph[$year]) return undefined;
    return filter(
      graph[$year],
      $cashflowIncomeDepth,
      $cashflowExpenseDepth,
    );
  });
  let sankeyData = $derived(
    selectedGraph ? buildCashFlowSankeyData(selectedGraph) : undefined,
  );
  let hierarchyData = $derived(
    rawGraph
      ? buildCashFlowHierarchyData(rawGraph)
      : { roots: [], mode: "treemap" as const },
  );
  let legends: Legend[] = $derived(
    sankeyData ? sankeyData.legends : [],
  );
  let isEmpty = $derived(!isLoading && Boolean(graph) && !selectedGraph);

  let showDepthControls = $derived(
    $cashflowExpenseDepthAllowed.max > 1 || $cashflowIncomeDepthAllowed.max > 1,
  );

  function maxDepth(prefix: string) {
    if (!graph) return 1;
    const depths = Object.values(graph)
      .flatMap((g) => g.nodes)
      .filter((n) => n.name.startsWith(prefix))
      .map((n) => depth(n.name));
    const max = arrayMax(depths);

    return max || 1;
  }

  function filter(graph: Graph, incomeDepth: number, expenseDepth: number) {
    if (!graph) return graph;

    const [removed, allowed] = partition(graph.nodes, (n) => {
      const account = firstName(n.name);
      if (account === "Income") return depth(n.name) > incomeDepth;
      if (account === "Expenses") return depth(n.name) > expenseDepth;
      return false;
    });

    const removedIds = removed.map((n) => n.id);
    return {
      nodes: allowed,
      links: graph.links.filter(
        (l) => !removedIds.includes(l.source) && !removedIds.includes(l.target),
      ),
    };
  }

  onMount(async () => {
    try {
      ({ expenses, graph } = await ajax("/api/expense"));
      const firstExpense = minBy(expenses, (e) => e.date);
      if (firstExpense) {
        dateMin.set(firstExpense.date);
      }

      setCashflowDepthAllowed(maxDepth("Expenses"), maxDepth("Income"));
      isLoading = false;
    } catch {
      isLoading = false;
    }
  });
</script>

<svelte:head>
  <title>Yearly Cash Flow - {$year} - Paisa</title>
</svelte:head>

<Page width="analysis">
  <PageHeader
    title="Yearly Cash Flow"
    description="Annual income, expense, and asset transfer flows"
  >
    {#snippet actions()}
      <div class="inline-flex flex-wrap items-center gap-[var(--paisa-space-2)] sm:hidden">
        <div class="inline-flex items-center rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-2)] p-0.5">
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-[calc(var(--paisa-radius-md)-2px)] px-2 py-1 text-xs font-medium transition-all {$cashflowViewMode === 'treemap' ? 'bg-[var(--paisa-surface-elevated)] font-semibold text-[var(--paisa-text-primary)] shadow-sm' : 'text-[var(--paisa-muted-foreground)] hover:text-[var(--paisa-text-primary)]'}"
            onclick={() => ($cashflowViewMode = "treemap")}
          >
            Breakdown
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-[calc(var(--paisa-radius-md)-2px)] px-2 py-1 text-xs font-medium transition-all {$cashflowViewMode === 'sankey' ? 'bg-[var(--paisa-surface-elevated)] font-semibold text-[var(--paisa-text-primary)] shadow-sm' : 'text-[var(--paisa-muted-foreground)] hover:text-[var(--paisa-text-primary)]'}"
            onclick={() => ($cashflowViewMode = "sankey")}
          >
            Flow
          </button>
        </div>
        <FinancialYearPicker bind:value={$year} dateMin={$dateMin} dateMax={$dateMax} />
        {#if showDepthControls}
          <details class="rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface)]">
            <summary class="cursor-pointer list-none px-2 py-1 text-xs font-semibold text-[var(--paisa-muted-foreground)] [&::-webkit-details-marker]:hidden">
              Depth
            </summary>
            <div class="min-w-[180px] border-t border-[var(--paisa-border-subtle)] px-2 pb-2">
              <InputRange
                label="Expenses"
                bind:value={$cashflowExpenseDepth}
                allowed={$cashflowExpenseDepthAllowed}
              />
              <InputRange
                label="Income"
                bind:value={$cashflowIncomeDepth}
                allowed={$cashflowIncomeDepthAllowed}
              />
            </div>
          </details>
        {/if}
      </div>
    {/snippet}
  </PageHeader>

  <Section
    title="Yearly Cash Flow"
    subtitle={$cashflowViewMode === "treemap" ? "Interactive hierarchical treemap (click tile to zoom in/out)" : "Multi-year flows at selected account depth"}
  >
    {#snippet action()}
      <div class="hidden items-center gap-[var(--paisa-space-2)] sm:inline-flex">
        <div class="inline-flex items-center rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-2)] p-0.5" role="group" aria-label="Visualization mode">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-[calc(var(--paisa-radius-md)-2px)] px-2.5 py-1 text-xs font-medium transition-all {$cashflowViewMode === 'treemap' ? 'bg-[var(--paisa-surface-elevated)] font-semibold text-[var(--paisa-text-primary)] shadow-sm' : 'text-[var(--paisa-muted-foreground)] hover:text-[var(--paisa-text-primary)]'}"
            onclick={() => ($cashflowViewMode = "treemap")}
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="9" rx="1" />
              <rect x="14" y="3" width="7" height="5" rx="1" />
              <rect x="14" y="12" width="7" height="9" rx="1" />
              <rect x="3" y="16" width="7" height="5" rx="1" />
            </svg>
            Breakdown
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-[calc(var(--paisa-radius-md)-2px)] px-2.5 py-1 text-xs font-medium transition-all {$cashflowViewMode === 'sankey' ? 'bg-[var(--paisa-surface-elevated)] font-semibold text-[var(--paisa-text-primary)] shadow-sm' : 'text-[var(--paisa-muted-foreground)] hover:text-[var(--paisa-text-primary)]'}"
            onclick={() => ($cashflowViewMode = "sankey")}
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 5h4c2 0 4 3 6 3s4-3 6-3h2" />
              <path d="M3 12h4c2 0 4 3 6 3s4-3 6-3h2" />
              <path d="M3 19h4c2 0 4-3 6-3s4 3 6 3h2" />
            </svg>
            Flow
          </button>
        </div>
      </div>
    {/snippet}

    {#if !isLoading && isEmpty}
      <ZeroState item={[]}>
        <p class="text-sm text-[var(--paisa-muted-foreground)]">
          No cash-flow activity for the selected year.
        </p>
      </ZeroState>
    {:else}
      {#if !isLoading && !isEmpty}
        <LegendCard {legends} clazz="mb-3 paisa-overflow-x-auto" />
      {/if}
      <ChartFrame height="tall" preserveChildren>
        {#if selectedGraph}
          {#if $cashflowViewMode === "treemap"}
            <FinancialHierarchyChart
              data={hierarchyData}
              ariaLabel="Yearly cash flow hierarchical treemap chart"
              testId="cash-flow-yearly-treemap-echart"
            />
          {:else}
            <CashFlowSankeyChart graph={selectedGraph} />
          {/if}
        {/if}
      </ChartFrame>
    {/if}
  </Section>
</Page>
