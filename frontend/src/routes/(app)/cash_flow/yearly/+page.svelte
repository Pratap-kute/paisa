<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import _ from "lodash";
  import { createFlow } from "$lib/charts/cash_flow";
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

  let legends: Legend[] = $state([]);
  let graph: Record<string, Graph> = $state();
  let expenses: Posting[] = $state([]);
  let isEmpty = $state(false);
  let isLoading = $state(true);
  let flowChart = createFlow();

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

  function updateChart() {
    if (!graph || isLoading) return;
    if (graph[$year] == null) {
      isEmpty = true;
      return;
    }
    flowChart.update(
      filter(_.cloneDeep(graph[$year]), $cashflowIncomeDepth, $cashflowExpenseDepth),
    );
    legends = flowChart.legends();
    isEmpty = false;
  }

  $effect(() => {
    if (graph) {
      updateChart();
    }
  });

  onDestroy(() => {
    flowChart.destroy();
  });

  onMount(async () => {
    try {
      ({ expenses, graph } = await ajax("/api/expense"));
      const firstExpense = _.minBy(expenses, (e) => e.date);
      if (firstExpense) {
        dateMin.set(firstExpense.date);
      }

      setCashflowDepthAllowed(maxDepth("Expenses"), maxDepth("Income"));
      isLoading = false;
      await tick();
      updateChart();
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
      <div class="paisa-page-toolbar-mobile">
        <FinancialYearPicker bind:value={$year} dateMin={$dateMin} dateMax={$dateMax} />
        {#if showDepthControls}
          <details class="paisa-depth-disclosure">
            <summary class="paisa-depth-summary">Depth</summary>
            <div class="paisa-depth-panel">
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
      <ChartFrame
        type="timeline"
        size="dynamic"
        preserveChildren
        onresize={(dim) => flowChart.resize(dim)}
      >
        <svg id="d3-expense-flow" width="100%" />
      </ChartFrame>
    {/if}
  </Section>
</Page>

<style lang="scss">
  .paisa-page-toolbar-mobile {
    display: inline-flex;
    align-items: center;
    gap: var(--paisa-space-2);
    flex-wrap: wrap;

    @media screen and (min-width: 640px) {
      display: none;
    }
  }

  .paisa-depth-disclosure {
    border: 1px solid var(--paisa-border-subtle);
    border-radius: var(--paisa-radius-md);
    background-color: var(--paisa-surface);
  }

  .paisa-depth-summary {
    padding: var(--paisa-space-1) var(--paisa-space-2);
    font-size: var(--paisa-font-size-xs);
    font-weight: var(--paisa-font-weight-semibold);
    color: var(--paisa-muted-foreground);
    cursor: pointer;
    list-style: none;

    &::-webkit-details-marker {
      display: none;
    }
  }

  .paisa-depth-panel {
    padding: 0 var(--paisa-space-2) var(--paisa-space-2);
    border-top: 1px solid var(--paisa-border-subtle);
    min-width: 180px;
  }
</style>
