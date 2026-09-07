<script lang="ts">
import InvestmentPerformance from "$lib/features/assets/components/InvestmentPerformance.svelte";
import type { Gain } from "$lib/domain/assets";
import type { Legend } from "$lib/shared/charts/types";
import { goto } from "$app/navigation";
import { page } from "$app/state";
import LegendCard from "$lib/shared/ui/LegendCard.svelte";
import { buildLegends } from "$lib/features/assets/gain";
import { buildGainOverviewComparison } from "$lib/features/assets/chart_comparison_data";
import { performanceLink } from "$lib/features/assets/performance";
import { formatCurrency } from "$lib/shared/formatters/currency";
import { api } from "$lib/api";
import { sumBy } from "es-toolkit";
import { onMount } from "svelte";
import Page from "$lib/shared/layout/Page.svelte";
import PageHeader from "$lib/shared/layout/PageHeader.svelte";
import MetricStrip from "$lib/shared/layout/MetricStrip.svelte";
import Metric from "$lib/shared/layout/Metric.svelte";
import ChartFrame from "$lib/shared/ui/ChartFrame.svelte";
import ZeroState from "$lib/shared/ui/ZeroState.svelte";
import ComparisonBarChart from "$lib/shared/charts/ComparisonBarChart.svelte";

let legends: Legend[] = $state([]);
let gains: Gain[] = $state([]);
let isLoading = $state(true);
let totalGain = $state(0);
let totalInvestment = $state(0);

let hasGains = $derived(gains.length > 0);
let overviewData = $derived(buildGainOverviewComparison(gains));
let chartEvents = $derived([
  {
    target: "series.bar" as const,
    event: "click" as const,
    handler: (event: { dataIndex?: number }) => {
      if (typeof event.dataIndex !== "number") return;
      const account = overviewData.points[event.dataIndex]?.key;
      if (account) goto(performanceLink(account, page.url.searchParams));
    },
  },
]);

onMount(async () => {
  try {
    const res = await api.gain.getGain();
    gains = (res.gain_breakdown as unknown as Gain[]) || [];
    totalGain = sumBy(gains, (g) => g.networth.gainAmount);
    totalInvestment = sumBy(
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
  <title>Investment Performance - Paisa</title>
</svelte:head>

<Page width="analysis">
  <PageHeader
    title="Investment Performance"
    description="Period returns, investment gains, and return drivers"
  />

  <InvestmentPerformance />

  <details
    class="mt-8 rounded-[var(--paisa-radius-md)] border border-border-subtle bg-surface p-4 transition-colors"
    data-testid="lifetime-context-disclosure">
    <summary
      class="cursor-pointer select-none font-medium text-foreground flex items-center justify-between">
      <span class="flex items-center gap-2">
        <i class="fas fa-history text-xs text-muted-foreground"
          aria-hidden="true"></i>
        <span>Lifetime investment context</span>
      </span>
      <span
        class="text-xs text-muted-foreground font-normal">All-time portfolio metrics & account overview</span>
    </summary>

    <div class="mt-4 pt-4 border-t border-border-subtle space-y-6">
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

      <div>
        <div class="mb-3">
          <h3 class="text-sm font-medium text-foreground">Lifetime Gain Overview</h3>
          <p class="text-xs text-muted-foreground">Per-account investment, gain, and XIRR — click bars to drill down</p>
        </div>
        {#if !isLoading && !hasGains}
          <ZeroState item={[]}>
            <p class="text-sm text-muted-foreground">
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
      </div>
    </div>
  </details>
</Page>
