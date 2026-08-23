<script lang="ts">
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import {
    buildMonthlyInvestmentSeries,
    buildYearlyInvestmentSeries,
  } from "$lib/charts/time_series_data";
  import {
    ajax,
    formatCurrency,
    type InvestmentYearlyCard as InvestmentYearlyCardType,
    type Legend,
    type Posting,
  } from "$lib/core/utils";
  import _ from "lodash";
  import { onMount } from "svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import MetricStrip from "$lib/components/layout/MetricStrip.svelte";
  import Metric from "$lib/components/layout/Metric.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";
  import ResponsiveGrid from "$lib/components/layout/ResponsiveGrid.svelte";
  import InvestmentYearlyCard from "$lib/components/finance/InvestmentYearlyCard.svelte";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";
  import MonthlyInvestmentChart from "$lib/components/charts/MonthlyInvestmentChart.svelte";
  import YearlyInvestmentChart from "$lib/components/charts/YearlyInvestmentChart.svelte";

  let monthlyInvestmentTimelineLegends: Legend[] = $state([]);
  let yearlyInvestmentTimelineLegends: Legend[] = $state([]);
  let yearlyCards: InvestmentYearlyCardType[] = $state([]);
  let postings: Posting[] = $state([]);
  let isLoading = $state(true);
  let hasData = $state(false);
  let totalInvested = $state(0);
  let latestFyInvestment = $state("");
  let latestFyLabel = $state("");

  let sortedYearlyCards = $derived(
    _.orderBy(yearlyCards, (c) => c.start_date.valueOf(), "desc"),
  );

  onMount(async () => {
    try {
      const { assets, yearly_cards: fetchedYearlyCards } = await ajax("/api/investment");
      yearlyCards = fetchedYearlyCards || [];
      postings = assets as Posting[];

      totalInvested = _.sumBy(yearlyCards, (c) => c.net_investment);
      const latest = sortedYearlyCards[0];
      if (latest) {
        latestFyInvestment = formatCurrency(latest.net_investment);
        latestFyLabel = `${latest.start_date.format("YYYY")}-${latest.end_date.format("YY")}`;
      }

      hasData = !_.isEmpty(postings) || !_.isEmpty(yearlyCards);
      monthlyInvestmentTimelineLegends = buildMonthlyInvestmentSeries(postings).legends ?? [];
      yearlyInvestmentTimelineLegends = buildYearlyInvestmentSeries(yearlyCards).legends ?? [];

      isLoading = false;
    } catch {
      isLoading = false;
    }
  });
</script>

<svelte:head>
  <title>Investment - Paisa</title>
</svelte:head>

<Page width="analysis">
  <PageHeader
    title="Investment"
    description="Monthly and yearly investment timeline and breakdowns"
  />

  <MetricStrip cols={2}>
    <Metric
      label="Total Invested"
      value={formatCurrency(totalInvested)}
      loading={isLoading}
    />
    <Metric
      label="Latest FY Investment"
      value={latestFyInvestment || "—"}
      secondary={latestFyLabel || undefined}
      loading={isLoading}
    />
  </MetricStrip>

  {#if !isLoading && !hasData}
    <ZeroState item={[]}>
      <p class="text-sm text-[var(--paisa-muted-foreground)]">
        No investment postings found in the journal.
      </p>
    </ZeroState>
  {:else}
    <Section
      title="Monthly Investment Timeline"
      subtitle="Capital invested by month and account"
    >
      <LegendCard legends={monthlyInvestmentTimelineLegends} clazz="mb-3 paisa-overflow-x-auto" />
      <ChartFrame height="tall">
        <MonthlyInvestmentChart {postings} />
      </ChartFrame>
    </Section>

    <Section
      title="Financial Year Investment"
      subtitle="Yearly invested capital comparison"
    >
      <LegendCard legends={yearlyInvestmentTimelineLegends} clazz="mb-3 paisa-overflow-x-auto" />
      <ChartFrame height="tall">
        <YearlyInvestmentChart {yearlyCards} />
      </ChartFrame>
    </Section>

    {#if sortedYearlyCards.length > 0}
      <Section title="Annual Breakdown" subtitle="Financial year investment detail">
        <ResponsiveGrid variant="cards">
          {#each sortedYearlyCards as card (card.start_date.valueOf())}
            <InvestmentYearlyCard {card} />
          {/each}
        </ResponsiveGrid>
      </Section>
    {/if}
  {/if}
</Page>
