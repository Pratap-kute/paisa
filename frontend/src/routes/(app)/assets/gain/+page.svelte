<script lang="ts">
  import { goto } from "$app/navigation";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import { buildLegends } from "$lib/charts/gain";
  import { buildGainOverviewComparison } from "$lib/charts/bar_comparison_data";
  import { ajax, formatCurrency, type Gain, type Legend } from "$lib/core/utils";
  import _ from "lodash";
  import { onMount } from "svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import MetricStrip from "$lib/components/layout/MetricStrip.svelte";
  import Metric from "$lib/components/layout/Metric.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";
  import ComparisonBarChart from "$lib/components/charts/ComparisonBarChart.svelte";

  let legends: Legend[] = $state([]);
  let gains: Gain[] = $state([]);
  let isLoading = $state(true);
  let totalGain = $state(0);
  let totalInvestment = $state(0);

  let hasGains = $derived(gains.length > 0);
  let overviewData = $derived(buildGainOverviewComparison(gains));
  let chartEvents = $derived([
    {
      event: "click" as const,
      handler: (event: { dataIndex?: number }) => {
        if (typeof event.dataIndex !== "number") return;
        const account = overviewData.points[event.dataIndex]?.key;
        if (account) goto(`/assets/gain/${account}`);
      },
    },
  ]);

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
    } catch {
      isLoading = false;
    }
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
        height="compact"
        rows={Math.max(5, overviewData.points.length)}
        class="[&_.paisa-chart-frame-body]:overflow-y-visible"
      >
        <ComparisonBarChart
          data={overviewData}
          ariaLabel="Asset gain account overview"
          testId="asset-gain-overview-echart"
          events={chartEvents}
        />
      </ChartFrame>
    {/if}
  </Section>
</Page>
