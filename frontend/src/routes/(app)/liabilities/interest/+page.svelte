<script lang="ts">
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import {
    buildLegends,
    createInterestOverviewChart,
    createInterestPerAccountChart,
  } from "$lib/charts/liabilities/interest";
  import type { ChartHandle } from "$lib/charts/resize";
  import { ajax, type Interest, type Legend } from "$lib/core/utils";
  import _ from "lodash";
  import { onDestroy, onMount } from "svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";

  let isEmpty = $state(false);
  let legends: Legend[] = $state([]);
  let interests: Interest[] = $state([]);
  let overviewChart: ChartHandle<Interest[]> | null = $state(null);
  let perAccountChart: ChartHandle<Interest[]> | null = $state(null);

  function hasLiabilityActivity(interests: Interest[]) {
    return _.some(interests, (interest) =>
      !_.isEmpty(interest.overview_timeline) &&
      _.some(interest.overview_timeline, (point) =>
        point.drawn_amount !== 0 ||
        point.interest_amount !== 0 ||
        point.repaid_amount !== 0
      )
    );
  }

  onMount(async () => {
    const { interest_timeline_breakdown: loadedInterests } = await ajax("/api/liabilities/interest");

    if (!hasLiabilityActivity(loadedInterests)) {
      isEmpty = true;
      return;
    }

    legends = buildLegends();
    interests = loadedInterests;
    overviewChart = createInterestOverviewChart();
    perAccountChart = createInterestPerAccountChart();
    overviewChart.update(interests);
    perAccountChart.update(interests);
  });

  onDestroy(() => {
    overviewChart?.destroy();
    perAccountChart?.destroy();
  });
</script>

<Page width="analysis">
  <PageHeader
    title="Interest Breakdown"
    description="Interest payments and rates across all liabilities"
  />

  <Section title="Interest Overview">
    {#if !isEmpty}
      <LegendCard {legends} clazz="mb-3 paisa-overflow-x-auto" />
    {/if}
    <ChartFrame
      type="dynamic"
      empty={isEmpty}
      emptyMessage="No liability activity in this period"
      preserveChildren
      onresize={(dim) => overviewChart?.resize(dim)}
    >
      <div class="paisa-interest-overview-chart paisa-overflow-x-auto">
        <svg id="d3-interest-overview" />
      </div>
    </ChartFrame>
  </Section>

  <Section title="Per-Account Breakdown">
    <ChartFrame
      type="dynamic"
      empty={isEmpty}
      emptyMessage="No liability activity in this period"
      preserveChildren
      onresize={(dim) => perAccountChart?.resize(dim)}
    >
      <div class="d3-interest-timeline-breakdown">
        <div id="d3-interest-timeline-breakdown"></div>
      </div>
    </ChartFrame>
  </Section>
</Page>

<style lang="scss">
  .paisa-interest-overview-chart {
    width: 100%;

    :global(svg) {
      display: block;
      width: auto;
      max-width: none;
    }
  }

  .d3-interest-timeline-breakdown {
    width: 100%;
  }

  :global(.paisa-interest-account-row) {
    display: grid;
    grid-template-columns: minmax(220px, 240px) minmax(0, 1fr);
    gap: var(--paisa-space-3);
    align-items: stretch;
    margin-bottom: var(--paisa-space-4);
  }

  :global(.paisa-interest-summary-card) {
    padding: var(--paisa-space-2) var(--paisa-space-3);
    align-self: stretch;
  }

  :global(.paisa-interest-summary-table) {
    table-layout: fixed;
    margin-bottom: 0;
  }

  :global(.paisa-interest-summary-table td) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.paisa-interest-chart-card) {
    padding: var(--paisa-space-2);
    overflow-x: auto;
  }

  :global(.paisa-interest-chart-card svg) {
    display: block;
    width: auto;
    max-width: none;
    min-width: 760px;
  }

  @media (max-width: 768px) {
    :global(.paisa-interest-account-row) {
      grid-template-columns: 1fr;
    }

    :global(.paisa-interest-summary-card) {
      max-width: 100%;
    }
  }
</style>
