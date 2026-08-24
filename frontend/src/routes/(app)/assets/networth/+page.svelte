<script lang="ts">
  import {
    ajax,
    formatCurrency,
    formatFloat,
    type Legend,
    type Networth,
  } from "$lib/core/utils";
  import { last } from "es-toolkit";
  import { onMount } from "svelte";
  import {
    dateMin,
    dateMax,
    dateRange,
    dateRangeOption,
    setAllowedDateRange,
  } from "../../../../store";
  import DateRange from "$lib/components/ui/DateRange.svelte";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import MetricStrip from "$lib/components/layout/MetricStrip.svelte";
  import Metric from "$lib/components/layout/Metric.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";
  import NetworthTimelineChart from "$lib/components/charts/NetworthTimelineChart.svelte";
  import { buildNetworthSeries } from "$lib/charts/time_series_data";
import { filter, map } from "$lib/core/collection";

  let networth = $state(0);
  let investment = $state(0);
  let gain = $state(0);
  let xirr = $state(0);
  let isLoading = $state(true);
  let points: Networth[] = $state([]);
  let legends: Legend[] = $state([]);

  let filteredPoints = $derived(
    filter(
      points,
      (p) => p.date.isSameOrBefore($dateRange.to) && p.date.isSameOrAfter($dateRange.from),
    ),
  );

  $effect(() => {
    legends = buildNetworthSeries(filteredPoints).legends ?? [];
  });

  onMount(async () => {
    try {
      const result = await ajax("/api/networth");
      points = result.networthTimeline;
      setAllowedDateRange(map(points, (p) => p.date));

      const current = last(points);
      if (current) {
        networth = current.investmentAmount + current.gainAmount - current.withdrawalAmount;
        investment = current.investmentAmount - current.withdrawalAmount;
        gain = current.gainAmount;
      }
      xirr = result.xirr;
    } finally {
      isLoading = false;
    }
  });
</script>

<svelte:head>
  <title>Net Worth - Paisa</title>
</svelte:head>

<Page width="analysis">
  <PageHeader
    title="Net Worth"
    description="Track assets and investment growth over time"
  >
    {#snippet actions()}
      <div class="inline-flex items-center sm:hidden">
        <DateRange bind:value={$dateRangeOption} dateMin={$dateMin} dateMax={$dateMax} />
      </div>
    {/snippet}
  </PageHeader>

  <MetricStrip cols={4}>
    <Metric
      label="Net Worth"
      value={formatCurrency(networth)}
      loading={isLoading}
    />
    <Metric
      label="Net Investment"
      value={formatCurrency(investment)}
      loading={isLoading}
    />
    <Metric
      label="Gain / Loss"
      value={formatCurrency(gain)}
      status={gain >= 0 ? "positive" : "negative"}
      loading={isLoading}
    />
    <Metric
      label="XIRR"
      value={formatFloat(xirr)}
      loading={isLoading}
    />
  </MetricStrip>

  <Section
    title="Net Worth Trend"
    subtitle="Assets, liabilities, and investment performance over time"
    fill
  >
    {#if filteredPoints.length > 0}
      <LegendCard {legends} clazz="mb-3 paisa-overflow-x-auto" />
    {/if}

    <ChartFrame
      height="tall"
      empty={!isLoading && filteredPoints.length === 0}
      emptyMessage="No net-worth activity in this period"
      preserveChildren
    >
      <NetworthTimelineChart points={filteredPoints} />
    </ChartFrame>
  </Section>
</Page>
