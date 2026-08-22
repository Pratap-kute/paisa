<script lang="ts">
  import {
    renderAllocation,
    renderAllocationTarget,
    renderAllocationTimeline,
  } from "$lib/charts/allocation";
  import COLORS, { generateColorScheme } from "$lib/core/colors";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import Table from "$lib/components/ui/Table.svelte";
  import { accountName, nonZeroCurrency } from "$lib/tables/formatters";
  import {
    ajax,
    formatPercentage,
    type Aggregate,
    type AllocationTarget,
    type Legend,
  } from "$lib/core/utils";
  import _ from "lodash";
  import { onMount, tick } from "svelte";
  import type { ColumnDefinition, ProgressBarParams } from "tabulator-tables";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";

  let allocationTargets: AllocationTarget[] = $state([]);
  let aggregates: Record<string, Aggregate> = $state({});
  let allocationTimeline: { [key: string]: Aggregate }[] = $state([]);
  let allocationTimelineLegends: Legend[] = $state([]);
  let aggregateLeafNodes: Aggregate[] = $state([]);
  let depth = $state(2);
  let isLoading = $state(true);
  let color: d3.ScaleOrdinal<string, string> | undefined = $state();

  let hasTargets = $derived(!_.isEmpty(allocationTargets));
  let hasAllocationData = $derived(!_.isEmpty(aggregates));

  const columns: ColumnDefinition[] = [
    {
      title: "Account",
      field: "account",
      formatter: accountName,
      minWidth: 240,
      widthGrow: 1,
      headerHozAlign: "left",
    },
    {
      title: "Market Value",
      field: "market_amount",
      width: 140,
      minWidth: 130,
      maxWidth: 160,
      hozAlign: "right",
      headerHozAlign: "right",
      formatter: nonZeroCurrency,
    },
    {
      title: "Percent",
      field: "percent",
      width: 96,
      minWidth: 88,
      maxWidth: 110,
      hozAlign: "right",
      headerHozAlign: "right",
      formatter: (cell) => formatPercentage(cell.getValue() / 100, 2),
    },
    {
      title: "Share",
      field: "percent",
      minWidth: 180,
      widthGrow: 2,
      hozAlign: "left",
      headerHozAlign: "left",
      headerSort: false,
      formatter: "progress",
      formatterParams: {
        color: COLORS.assets,
        min: 0,
      },
    },
  ];

  function renderTargetCharts() {
    if (!color) return;
    document.getElementById("d3-allocation-target")?.replaceChildren();
    document.getElementById("d3-allocation-target-treemap")?.replaceChildren();
    renderAllocationTarget(allocationTargets, color);
  }

  function renderCategoryValueCharts() {
    if (!color) return;
    renderAllocation(aggregates, color);
  }

  function renderTimelineChart() {
    document.getElementById("d3-allocation-timeline")?.replaceChildren();
    if (!_.isEmpty(allocationTimeline)) {
      allocationTimelineLegends = renderAllocationTimeline(allocationTimeline);
    }
  }

  onMount(async () => {
    try {
      const {
        aggregates: fetchedAggregates,
        aggregates_timeline: aggregatesTimeline,
        allocation_targets: fetchedTargets,
      } = await ajax("/api/allocation");

      aggregates = fetchedAggregates;
      allocationTargets = fetchedTargets || [];
      allocationTimeline = aggregatesTimeline;

      const accounts = _.keys(aggregates);
      aggregateLeafNodes = _.filter(_.values(aggregates), (a) => a.market_amount > 0);
      const total = _.sumBy(aggregateLeafNodes, (a) => a.market_amount);
      aggregateLeafNodes = _.map(aggregateLeafNodes, (a) => {
        a.percent = total > 0 ? (a.market_amount / total) * 100 : 0;
        return a;
      });
      const max = _.max(_.map(aggregateLeafNodes, (a) => a.percent)) || 100;
      (_.last(columns).formatterParams as ProgressBarParams).max = max;
      color = generateColorScheme(accounts);
      depth = _.max(_.map(accounts, (account) => account.split(":").length)) || 2;

      isLoading = false;
      await tick();
      renderTargetCharts();
      renderCategoryValueCharts();
      renderTimelineChart();
    } catch {
      isLoading = false;
    }
  });
</script>

<svelte:head>
  <title>Asset Allocation - Paisa</title>
</svelte:head>

<Page width="analysis">
  <PageHeader
    title="Asset Allocation"
    description="Asset class distribution, targets, and historical allocation"
  />

  {#if isLoading}
    <Section title="Loading allocation data">
      <ChartFrame type="dynamic" />
    </Section>
  {:else}
    <Section title="Allocation Targets" subtitle="Current vs configured target weights">
      {#if hasTargets}
        <ChartFrame type="dynamic" onresize={renderTargetCharts}>
          <div id="d3-allocation-target-treemap" style="width: 100%; position: relative"></div>
          <svg id="d3-allocation-target" />
        </ChartFrame>
      {:else}
        <ZeroState item={[]}>
          <p class="text-sm text-[var(--paisa-muted-foreground)]">
            No allocation targets configured.
            <a href="/more/config" class="text-[var(--paisa-primary)] underline">
              Configure allocation targets
            </a>
            in settings to compare current vs target weights.
          </p>
        </ZeroState>
      {/if}
    </Section>

    {#if hasAllocationData}
      <Section title="Allocation by category" subtitle="Hierarchical partition by account group">
        <ChartFrame type="dynamic" onresize={renderCategoryValueCharts}>
          <div id="d3-allocation-category" style="width: 100%; height: {depth * 100}px"></div>
        </ChartFrame>
      </Section>

      <Section title="Allocation by value" subtitle="Treemap by market value">
        <ChartFrame type="dynamic" onresize={renderCategoryValueCharts}>
          <div id="d3-allocation-value" style="width: 100%; height: 300px"></div>
        </ChartFrame>
      </Section>

      <Section title="Allocation Timeline" subtitle="Historical allocation by asset class">
        <LegendCard legends={allocationTimelineLegends} clazz="mb-3 paisa-overflow-x-auto" />
        <ChartFrame type="timeline" onresize={renderTimelineChart}>
          <svg id="d3-allocation-timeline" width="100%" height="300" />
        </ChartFrame>
      </Section>

      <Section title="Allocation Table" subtitle="Leaf accounts with share of portfolio">
        <div class="paisa-allocation-table-wrap">
          <Table data={aggregateLeafNodes} {columns} options={{ layout: "fitDataFill" }} />
        </div>
      </Section>
    {:else}
      <ZeroState item={[]}>
        <p class="text-sm text-[var(--paisa-muted-foreground)]">
          No asset allocation data available.
        </p>
      </ZeroState>
    {/if}
  {/if}
</Page>

<style lang="scss">
  .paisa-allocation-table-wrap {
    border: 1px solid var(--paisa-border-subtle);
    border-radius: var(--paisa-radius-md);
    overflow: auto;
    max-width: 100%;
  }
</style>
