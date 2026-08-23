<script lang="ts">
  import {
    buildInterestOverviewComparison,
    buildInterestTimelineSeries,
    interestSummary,
  } from "$lib/charts/interest_data";
  import { ajax, formatCurrency, formatFloat, type Interest } from "$lib/core/utils";
  import _ from "lodash";
  import { onMount } from "svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";
  import ComparisonBarChart from "$lib/components/charts/ComparisonBarChart.svelte";
  import TimeSeriesChart from "$lib/components/charts/TimeSeriesChart.svelte";

  let isEmpty = $state(false);
  let isLoading = $state(true);
  let interests: Interest[] = $state([]);
  let overviewData = $derived(buildInterestOverviewComparison(interests));

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
      <ComparisonBarChart data={overviewData} ariaLabel="Liability interest overview" testId="interest-overview-echart" />
    </ChartFrame>
  </Section>

  <Section title="Per-Account Breakdown">
    {#if !isLoading && !isEmpty}
      <div class="flex flex-col gap-4">
        {#each interests as interest (interest.account)}
          {@const summary = interestSummary(interest)}
          <div class="grid grid-cols-1 gap-3 rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface)] p-3 md:grid-cols-[220px_minmax(0,1fr)]">
            <table class="w-full text-xs">
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
