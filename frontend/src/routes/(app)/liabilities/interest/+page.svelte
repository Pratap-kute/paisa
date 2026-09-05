<script lang="ts">
import { api } from "$lib/api";
import { formatCurrency } from "$lib/shared/formatters/currency";
import { formatFloat } from "$lib/shared/formatters/currency";
import type { Interest } from "$lib/domain/liabilities";
import {
  buildInterestOverviewComparison,
  buildInterestTimelineSeries,
  interestSummary,
} from "$lib/features/liabilities/interest_data";
import { onMount } from "svelte";
import Page from "$lib/shared/layout/Page.svelte";
import PageHeader from "$lib/shared/layout/PageHeader.svelte";
import Section from "$lib/shared/layout/Section.svelte";
import ChartFrame from "$lib/shared/ui/ChartFrame.svelte";
import ComparisonBarChart from "$lib/shared/charts/ComparisonBarChart.svelte";
import TimeSeriesChart from "$lib/shared/charts/TimeSeriesChart.svelte";
import { isEmpty as isEmptyValue, some } from "$lib/shared/utils/collection";

let isEmpty = $state(false);
let isLoading = $state(true);
let interests: Interest[] = $state([]);
let overviewData = $derived(buildInterestOverviewComparison(interests));

function hasLiabilityActivity(interests: Interest[]) {
  return some(
    interests,
    (interest) =>
      !isEmptyValue(interest.overview_timeline) &&
      some(interest.overview_timeline, (point) =>
        point.drawn_amount !== 0 ||
        point.interest_amount !== 0 ||
        point.repaid_amount !== 0),
  );
}

onMount(async () => {
  try {
    const { interest_timeline_breakdown: loadedInterests } = await api
      .liabilities.getLiabilitiesInterest() as unknown as {
        interest_timeline_breakdown: Interest[];
      };

    if (!hasLiabilityActivity(loadedInterests)) {
      isEmpty = true;
      return;
    }

    interests = loadedInterests;
    isLoading = false;
  } finally {
    isLoading = false;
  }
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
    <ChartFrame
      height="compact"
      loading={isLoading}
      empty={!isLoading && isEmpty}
      emptyMessage="No liability activity in this period"
    >
      <ComparisonBarChart data={overviewData}
        ariaLabel="Liability interest overview"
        testId="interest-overview-echart" />
    </ChartFrame>
  </Section>

  <Section title="Per-Account Breakdown">
    {#if !isLoading && !isEmpty}
      <div class="flex flex-col gap-4">
        {#each interests as interest (interest.account)}
          {@const summary = interestSummary(interest)}
          <div class="grid grid-cols-1 gap-3 rounded-[var(--paisa-radius-md)] border border-border-subtle bg-surface p-3 md:grid-cols-[220px_minmax(0,1fr)]">
            <table class="w-full text-xs tabular-nums">
              <tbody>
                <tr><th class="py-1 text-left">Account</th><td class="py-1 text-right font-semibold">{summary.label}</td></tr>
                <tr><th class="py-1 text-left">Loan Drawn</th><td class="py-1 text-right">{formatCurrency(summary.drawn)}</td></tr>
                <tr><th class="py-1 text-left">Loan Repaid</th><td class="py-1 text-right">{formatCurrency(summary.repaid)}</td></tr>
                <tr><th class="py-1 text-left">Interest</th><td class="py-1 text-right">{formatCurrency(summary.interest)}</td></tr>
                <tr><th class="py-1 text-left">Balance</th><td class="py-1 text-right font-semibold">{formatCurrency(summary.balance)}</td></tr>
                <tr><th class="py-1 text-left">APR</th><td class="py-1 text-right">{formatFloat(summary.apr)}%</td></tr>
              </tbody>
            </table>
            <ChartFrame height="tall">
              <TimeSeriesChart data={buildInterestTimelineSeries(interest)} ariaLabel="Interest timeline for {summary.label}" testId="interest-account-{encodeURIComponent(interest.account)}-echart" internalLegend />
            </ChartFrame>
          </div>
        {/each}
      </div>
    {/if}
  </Section>
</Page>
