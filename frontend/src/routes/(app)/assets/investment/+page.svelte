<script lang="ts">
import LegendCard from "$lib/shared/ui/LegendCard.svelte";
import type { InvestmentYearlyCard as InvestmentYearlyCardType } from "$lib/domain/assets";
import type { Legend } from "$lib/shared/charts/types";
import type { Posting } from "$lib/domain/ledger";
import {
  buildMonthlyInvestmentSeries,
  buildYearlyInvestmentSeries,
} from "$lib/features/assets/time_series_data";
import { formatCurrency } from "$lib/shared/formatters/currency";
import { api } from "$lib/api";
import { orderBy, sumBy } from "es-toolkit";
import { onMount } from "svelte";
import Page from "$lib/shared/layout/Page.svelte";
import PageHeader from "$lib/shared/layout/PageHeader.svelte";
import Section from "$lib/shared/layout/Section.svelte";
import MetricStrip from "$lib/shared/layout/MetricStrip.svelte";
import Metric from "$lib/shared/layout/Metric.svelte";
import ChartFrame from "$lib/shared/ui/ChartFrame.svelte";
import ResponsiveGrid from "$lib/shared/layout/ResponsiveGrid.svelte";
import InvestmentYearlyCard from "$lib/features/assets/components/InvestmentYearlyCard.svelte";
import ZeroState from "$lib/shared/ui/ZeroState.svelte";
import MonthlyInvestmentChart from "$lib/features/assets/components/MonthlyInvestmentChart.svelte";
import YearlyInvestmentChart from "$lib/features/assets/components/YearlyInvestmentChart.svelte";
import { isEmpty } from "$lib/shared/utils/collection";

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
  orderBy(yearlyCards, [(c) => c.start_date.valueOf()], ["desc"]),
);

onMount(async () => {
  try {
    const res = await api.investment.getInvestment();
    yearlyCards = (res.yearly_cards as unknown as InvestmentYearlyCardType[]) ||
      [];
    postings = (res.assets as unknown as Posting[]) || [];

    totalInvested = sumBy(yearlyCards, (c) => c.net_investment);
    const latest = sortedYearlyCards[0];
    if (latest) {
      latestFyInvestment = formatCurrency(latest.net_investment);
      latestFyLabel = `${latest.start_date.format("YYYY")}-${
        latest.end_date.format("YY")
      }`;
    }

    hasData = !isEmpty(postings) || !isEmpty(yearlyCards);
    monthlyInvestmentTimelineLegends =
      buildMonthlyInvestmentSeries(postings).legends ?? [];
    yearlyInvestmentTimelineLegends =
      buildYearlyInvestmentSeries(yearlyCards).legends ?? [];

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
