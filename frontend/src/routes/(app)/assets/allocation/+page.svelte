<script lang="ts">
  import {
    renderAllocation,
    renderAllocationTarget,
    renderAllocationTimeline
  } from "$lib/charts/allocation";
  import COLORS, { generateColorScheme } from "$lib/core/colors";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import Table from "$lib/components/ui/Table.svelte";
  import { accountName, nonZeroCurrency } from "$lib/tables/formatters";
  import { ajax, formatPercentage, type Aggregate, type Legend } from "$lib/core/utils";
  import _ from "lodash";
  import { onMount, tick } from "svelte";
  import type { ColumnDefinition, ProgressBarParams } from "tabulator-tables";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";

  let showAllocation = $state(false);
  let depth = $state(2);
  let allocationTimelineLegends: Legend[] = $state([]);
  let aggregateLeafNodes: Aggregate[] = $state([]);
  let allocationTimeline: unknown = $state(null);
  let total = 0;

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

  onMount(async () => {
    const {
      aggregates: aggregates,
      aggregates_timeline: aggregatesTimeline,
      allocation_targets: allocationTargets
    } = await ajax("/api/allocation");
    const accounts = _.keys(aggregates);
    aggregateLeafNodes = _.filter(_.values(aggregates), (a) => a.market_amount > 0);
    total = _.sumBy(aggregateLeafNodes, (a) => a.market_amount);
    aggregateLeafNodes = _.map(aggregateLeafNodes, (a) => {
      a.percent = (a.market_amount / total) * 100;
      return a;
    });
    const max = _.max(_.map(aggregateLeafNodes, (a) => a.percent)) || 100;
    (_.last(columns).formatterParams as ProgressBarParams).max = max;
    const color = generateColorScheme(accounts);
    depth = _.max(_.map(accounts, (account) => account.split(":").length));

    if (!_.isEmpty(allocationTargets)) {
      showAllocation = true;
    }
    allocationTimeline = aggregatesTimeline;
    await tick();

    renderAllocationTarget(allocationTargets, color);
    renderAllocation(aggregates, color);
    allocationTimelineLegends = renderAllocationTimeline(aggregatesTimeline);
  });
</script>

<Page width="analysis">
  <PageHeader
    title="Asset Allocation"
    description="Asset class distribution, targets, and historical allocation"
  />

  {#if showAllocation}
    <Section title="Allocation Targets">
      <ChartFrame type="dynamic">
        <div id="d3-allocation-target-treemap" style="width: 100%; position: relative"></div>
        <svg id="d3-allocation-target" />
      </ChartFrame>
    </Section>
  {/if}

  <Section title="Allocation by category">
    <div id="d3-allocation-category" style="width: 100%; height: {depth * 100}px"></div>
  </Section>

  <Section title="Allocation by value">
    <div id="d3-allocation-value" style="width: 100%; height: 300px"></div>
  </Section>

  <Section title="Allocation Timeline">
    <LegendCard legends={allocationTimelineLegends} clazz="mb-3 paisa-overflow-x-auto" />
    <ChartFrame type="timeline" onresize={() => {
      const el = document.getElementById("d3-allocation-timeline");
      el?.replaceChildren();
      if (allocationTimeline) {
        allocationTimelineLegends = renderAllocationTimeline(allocationTimeline as never);
      }
    }}>
      <svg id="d3-allocation-timeline" width="100%" height="300" />
    </ChartFrame>
  </Section>

  <Section title="Allocation Table">
    <Table data={aggregateLeafNodes} {columns} options={{ layout: "fitDataFill" }} />
  </Section>
</Page>
