<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import _ from "lodash";
  import { createFlow } from "$lib/charts/cash_flow";
  import { ajax, depth, firstName, rem, type Graph, type Legend, type Posting } from "$lib/core/utils";
  import { dateMin, year } from "../../../../store";
  import {
    setCashflowDepthAllowed,
    cashflowExpenseDepth,
    cashflowIncomeDepth
  } from "../../../../persisted_store";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";

  let legends: Legend[] = $state([]);
  let graph: Record<string, Graph> = $state(), expenses: Posting[];
  let isEmpty = $state(false);
  let flowChart = createFlow();

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
        (l) => !removedIds.includes(l.source) && !removedIds.includes(l.target)
      )
    };
  }

  $effect(() => {
    if (graph) {
      if (graph[$year] == null) {
        isEmpty = true;
      } else {
        flowChart.update(
          filter(_.cloneDeep(graph[$year]), $cashflowIncomeDepth, $cashflowExpenseDepth)
        );
        legends = flowChart.legends();
        isEmpty = false;
      }
    }
  });

  onDestroy(() => {
    flowChart.destroy();
  });

  onMount(async () => {
    ({ expenses, graph } = await ajax("/api/expense"));
    let firstExpense = _.minBy(expenses, (e) => e.date);
    if (firstExpense) {
      dateMin.set(firstExpense.date);
    }

    setCashflowDepthAllowed(maxDepth("Expenses"), maxDepth("Income"));
  });
</script>

<Page width="analysis">
  <PageHeader
    title="Yearly Cash Flow"
    description="Annual income, expense, and asset transfer flows"
  />

  <Section>
    {#if !isEmpty}
      <LegendCard {legends} clazz="mb-3 paisa-overflow-x-auto" />
    {/if}
    <ChartFrame
      type="timeline"
      empty={isEmpty}
      emptyMessage="No cash-flow activity for the selected year"
      preserveChildren
      onresize={(dim) => flowChart.resize(dim)}
    >
      <svg
        id="d3-expense-flow"
        height={window.innerHeight - rem(210)}
        width="100%"
      />
    </ChartFrame>
  </Section>
</Page>
