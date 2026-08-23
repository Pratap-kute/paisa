<script lang="ts">
  import { buildAllocationTimelineSeries } from "$lib/charts/mixed_period_data";
  import {
    buildAllocationCategoryComparison,
    buildAllocationHierarchy,
  } from "$lib/charts/hierarchy_data";
  import { buildAllocationTargetComparison } from "$lib/charts/bar_comparison_data";
  import COLORS from "$lib/core/colors";
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
  import ComparisonBarChart from "$lib/components/charts/ComparisonBarChart.svelte";
  import TimeSeriesChart from "$lib/components/charts/TimeSeriesChart.svelte";

  let allocationTargets: AllocationTarget[] = $state([]);
  let aggregates: Record<string, Aggregate> = $state({});
  let allocationTimeline: { [key: string]: Aggregate }[] = $state([]);
  let allocationTimelineLegends: Legend[] = $state([]);
  let aggregateLeafNodes: Aggregate[] = $state([]);
  let isLoading = $state(true);

  let hasTargets = $derived(!_.isEmpty(allocationTargets));
  let hasAllocationData = $derived(!_.isEmpty(aggregates));
  let allocationTargetData = $derived(buildAllocationTargetComparison(allocationTargets));
  let allocationHierarchy = $derived(buildAllocationHierarchy(aggregates));
  let allocationCategoryData = $derived(buildAllocationCategoryComparison(allocationHierarchy));
  let allocationTimelineData = $derived(buildAllocationTimelineSeries(allocationTimeline));

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
    try {
      const {
        aggregates: fetchedAggregates,
        aggregates_timeline: aggregatesTimeline,
        allocation_targets: fetchedTargets,
      } = await ajax("/api/allocation");

      aggregates = fetchedAggregates;
      allocationTargets = fetchedTargets || [];
      allocationTimeline = aggregatesTimeline;

      aggregateLeafNodes = _.filter(_.values(aggregates), (a) => a.market_amount > 0);
      const total = _.sumBy(aggregateLeafNodes, (a) => a.market_amount);
      aggregateLeafNodes = _.map(aggregateLeafNodes, (a) => {
        a.percent = total > 0 ? (a.market_amount / total) * 100 : 0;
        return a;
      });
      const max = _.max(_.map(aggregateLeafNodes, (a) => a.percent)) || 100;
      (_.last(columns).formatterParams as ProgressBarParams).max = max;
      isLoading = false;
      await tick();
      allocationTimelineLegends = allocationTimelineData.legends ?? [];
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
      <ChartFrame height="content" />
    </Section>
  {:else}
    <Section title="Allocation Targets" subtitle="Current vs configured target weights">
      {#if hasTargets}
        <ChartFrame height="compact" rows={Math.max(4, allocationTargetData.points.length)}>
          <ComparisonBarChart
            data={allocationTargetData}
            ariaLabel="Allocation target versus current weights"
            testId="allocation-target-echart"
          />
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
      <Section title="Allocation by Category" subtitle="Asset class distribution">
        <ChartFrame height="compact" rows={Math.max(4, allocationCategoryData.points.length)}>
          <ComparisonBarChart
            data={allocationCategoryData}
            ariaLabel="Asset allocation by category"
            testId="allocation-category-echart"
          />
        </ChartFrame>
      </Section>

      <Section title="Allocation Timeline" subtitle="Historical allocation by asset class">
        <LegendCard legends={allocationTimelineLegends} clazz="mb-3 paisa-overflow-x-auto" />
        <ChartFrame height="tall">
          <TimeSeriesChart
            data={allocationTimelineData}
            ariaLabel="Historical allocation percentages by asset class"
            testId="allocation-timeline-echart"
          />
        </ChartFrame>
      </Section>

      <Section title="Allocation Table" subtitle="Leaf accounts with share of portfolio">
        <div class="max-w-full overflow-auto rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)]">
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
