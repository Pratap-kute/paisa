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
  import { onDestroy, onMount, tick } from "svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";

  let isEmpty = $state(false);
  let isLoading = $state(true);
  let legends: Legend[] = $state([]);
  let interests: Interest[] = $state([]);
  let overviewChart: ChartHandle<Interest[]> | null = $state(null);
  let perAccountChart: ChartHandle<Interest[]> | null = $state(null);

  const perAccountChartLayout =
    "w-full [&_.paisa-interest-account-row]:mb-[var(--paisa-space-4)] [&_.paisa-interest-account-row]:grid [&_.paisa-interest-account-row]:grid-cols-[minmax(220px,240px)_minmax(0,1fr)] [&_.paisa-interest-account-row]:items-stretch [&_.paisa-interest-account-row]:gap-[var(--paisa-space-3)] [&_.paisa-interest-summary-card]:box-border [&_.paisa-interest-summary-card]:flex [&_.paisa-interest-summary-card]:flex-col [&_.paisa-interest-summary-card]:justify-center [&_.paisa-interest-summary-card]:self-stretch [&_.paisa-interest-summary-card]:p-[var(--paisa-space-2)_var(--paisa-space-3)] [&_.paisa-interest-chart-card]:box-border [&_.paisa-interest-chart-card]:flex [&_.paisa-interest-chart-card]:flex-col [&_.paisa-interest-chart-card]:self-stretch [&_.paisa-interest-chart-card]:overflow-x-auto [&_.paisa-interest-chart-card]:p-[var(--paisa-space-2)_var(--paisa-space-3)] [&_.paisa-interest-summary-table]:mb-0 [&_.paisa-interest-summary-table]:table-fixed [&_.paisa-interest-summary-table_td]:overflow-hidden [&_.paisa-interest-summary-table_td]:text-ellipsis [&_.paisa-interest-summary-table_td]:whitespace-nowrap [&_.paisa-interest-chart-card_svg]:block [&_.paisa-interest-chart-card_svg]:w-full [&_.paisa-interest-chart-card_svg]:max-w-none max-md:[&_.paisa-interest-account-row]:grid-cols-1 max-md:[&_.paisa-interest-summary-card]:max-w-full";

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
    try {
      const { interest_timeline_breakdown: loadedInterests } = await ajax("/api/liabilities/interest");

      if (!hasLiabilityActivity(loadedInterests)) {
        isEmpty = true;
        return;
      }

      legends = buildLegends();
      interests = loadedInterests;
      isLoading = false;
      await tick();
      overviewChart = createInterestOverviewChart();
      perAccountChart = createInterestPerAccountChart();
      overviewChart.update(interests);
      perAccountChart.update(interests);
    } finally {
      isLoading = false;
    }
  });

  onDestroy(() => {
    overviewChart?.destroy();
    perAccountChart?.destroy();
  });
</script>

<svelte:head>
  <title>Interest Breakdown - Paisa</title>
</svelte:head>

<Page width="analysis">
  <PageHeader
    title="Interest Breakdown"
    description="Interest payments and rates across all liabilities"
  />

  <Section title="Interest Overview">
    {#if !isLoading && !isEmpty}
      <LegendCard {legends} clazz="mb-3 paisa-overflow-x-auto" />
    {/if}
    <ChartFrame
      type="dynamic"
      loading={isLoading}
      empty={!isLoading && isEmpty}
      emptyMessage="No liability activity in this period"
      preserveChildren
      onresize={(dim) => overviewChart?.resize(dim)}
    >
      <div class="w-full paisa-overflow-x-auto [&_svg]:block [&_svg]:w-auto [&_svg]:max-w-none">
        <svg id="d3-interest-overview" />
      </div>
    </ChartFrame>
  </Section>

  <Section title="Per-Account Breakdown">
    <ChartFrame
      type="dynamic"
      loading={isLoading}
      empty={!isLoading && isEmpty}
      emptyMessage="No liability activity in this period"
      preserveChildren
      class={perAccountChartLayout}
    >
      <div class="w-full">
        <div id="d3-interest-timeline-breakdown"></div>
      </div>
    </ChartFrame>
  </Section>
</Page>
