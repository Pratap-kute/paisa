<script lang="ts">
  import { onMount } from "svelte";
  import _ from "lodash";
  import { buildCashFlowSankeyData } from "$lib/charts/cash_flow_sankey_data";
  import CashFlowSankeyChart from "$lib/components/charts/CashFlowSankeyChart.svelte";
  import { ajax, depth, firstName, type Graph, type Legend, type Posting } from "$lib/core/utils";
  import { dateMin, dateMax, year } from "../../../../store";
  import {
    setCashflowDepthAllowed,
    cashflowExpenseDepth,
    cashflowExpenseDepthAllowed,
    cashflowIncomeDepth,
    cashflowIncomeDepthAllowed,
  } from "../../../../persisted_store";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";
  import FinancialYearPicker from "$lib/components/ui/FinancialYearPicker.svelte";
  import InputRange from "$lib/components/ui/InputRange.svelte";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";

  let graph: Record<string, Graph> = $state();
  let expenses: Posting[] = $state([]);
  let isLoading = $state(true);
  let selectedGraph: Graph | undefined = $derived.by(() => {
    if (!graph || isLoading || !graph[$year]) return undefined;
    return filter(
      graph[$year],
      $cashflowIncomeDepth,
      $cashflowExpenseDepth,
    );
  });
  let legends: Legend[] = $derived(
    selectedGraph ? buildCashFlowSankeyData(selectedGraph).legends : [],
  );
  let isEmpty = $derived(!isLoading && Boolean(graph) && !selectedGraph);

  let showDepthControls = $derived(
    $cashflowExpenseDepthAllowed.max > 1 || $cashflowIncomeDepthAllowed.max > 1,
  );

  function maxDepth(prefix: string) {
    if (!graph) return 1;
    const max = _.chain(graph)
      .flatMap((g) => g.nodes)
      .filter((n) => n.name.startsWith(prefix))
      .map((n) => depth(n.name))
      .max()
      .value();

    return max || 1;
  }

  function filter(graph: Graph, incomeDepth: number, expenseDepth: number) {
    if (!graph) return graph;

    const [removed, allowed] = _.partition(graph.nodes, (n) => {
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
      const firstExpense = _.minBy(expenses, (e) => e.date);
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
    subtitle="Multi-year flows at selected account depth"
  >
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
          <CashFlowSankeyChart graph={selectedGraph} />
        {/if}
      </ChartFrame>
    {/if}
  </Section>
</Page>
