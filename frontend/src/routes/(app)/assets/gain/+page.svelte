<script lang="ts">
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import { buildLegends, renderOverview } from "$lib/charts/gain";
  import { createClientWidthChart, type ChartHandle } from "$lib/charts/resize";
  import { ajax, formatCurrency, type Gain, type Legend } from "$lib/core/utils";
  import _ from "lodash";
  import { onDestroy, onMount, tick } from "svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import MetricStrip from "$lib/components/layout/MetricStrip.svelte";
  import Metric from "$lib/components/layout/Metric.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";

  let legends: Legend[] = $state([]);
  let gains: Gain[] = $state([]);
  let overviewChart: ChartHandle<null> | null = $state(null);
  let isLoading = $state(true);
  let totalGain = $state(0);
  let totalInvestment = $state(0);

  let hasGains = $derived(gains.length > 0);

  onMount(async () => {
    try {
      ({ gain_breakdown: gains } = await ajax("/api/gain"));
      totalGain = _.sumBy(gains, (g) => g.networth.gainAmount);
      totalInvestment = _.sumBy(
        gains,
        (g) => g.networth.investmentAmount - g.networth.withdrawalAmount,
      );
      legends = buildLegends();
      isLoading = false;
      await tick();
      overviewChart = createClientWidthChart("#d3-gain-overview", (_data, _size) => {
        renderOverview(gains);
      });
      overviewChart.update(null);
    } catch {
      isLoading = false;
    }
  });

  onDestroy(() => {
    overviewChart?.destroy();
  });
</script>

<svelte:head>
  <title>Asset Gain - Paisa</title>
</svelte:head>

<Page width="analysis">
  <PageHeader
    title="Asset Gain"
    description="Realized and unrealized gains across investment holdings"
  />

  <MetricStrip cols={2}>
    <Metric
      label="Net Investment"
      value={formatCurrency(totalInvestment)}
      loading={isLoading}
    />
    <Metric
      label="Total Gain / Loss"
      value={formatCurrency(totalGain)}
      status={totalGain >= 0 ? "positive" : "negative"}
      loading={isLoading}
    />
  </MetricStrip>

  <Section
    title="Gain Overview"
    subtitle="Per-account investment, gain, and XIRR — click account labels to drill down"
  >
    {#if !isLoading && !hasGains}
      <ZeroState item={[]}>
        <p class="text-sm text-[var(--paisa-muted-foreground)]">
          No investment gains recorded.
        </p>
      </ZeroState>
    {:else}
      <LegendCard {legends} clazz="mb-3 paisa-overflow-x-auto" />
      <ChartFrame
        type="category"
        class="paisa-gain-overview-chart"
        onresize={(dim) => overviewChart?.resize(dim)}
      >
        <svg id="d3-gain-overview" />
      </ChartFrame>
    {/if}
  </Section>
</Page>

<style lang="scss">
  :global(.paisa-gain-overview-chart .paisa-chart-frame-body) {
    overflow-x: auto;
    overflow-y: visible;
  }

  :global(.paisa-gain-overview-chart svg) {
    min-width: 100%;
  }
</style>
