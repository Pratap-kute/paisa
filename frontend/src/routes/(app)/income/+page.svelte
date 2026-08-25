<script lang="ts">
  import {
    buildMonthlyIncomeSeries,
    buildYearlyIncomeComparisonSeries,
  } from "$lib/charts/time_series_data";
  import { ajax, formatCurrency, type Income, type IncomeYearlyCard, type Legend } from "$lib/core/utils";
  import { sumBy } from "es-toolkit";
  import { onMount } from "svelte";
  import Page from "$lib/shared/layout/Page.svelte";
  import PageHeader from "$lib/shared/layout/PageHeader.svelte";
  import Section from "$lib/shared/layout/Section.svelte";
  import MetricStrip from "$lib/shared/layout/MetricStrip.svelte";
  import Metric from "$lib/shared/layout/Metric.svelte";
  import ChartFrame from "$lib/shared/ui/ChartFrame.svelte";
  import LegendCard from "$lib/shared/ui/LegendCard.svelte";
  import ZeroState from "$lib/shared/ui/ZeroState.svelte";
  import MonthlyIncomeChart from "$lib/features/income/components/MonthlyIncomeChart.svelte";
  import YearlyIncomeChart from "$lib/features/income/components/YearlyIncomeChart.svelte";
import { isEmpty } from "$lib/shared/utils/collection";

  let grossIncome = $state(0);
  let netTax = $state(0);
  let isLoading = $state(true);
  let hasIncomeData = $state(false);

  let monthlyInvestmentTimelineLegends: Legend[] = $state([]);
  let yearlyIncomeTimelineLegends: Legend[] = $state([]);
  let incomes: Income[] = $state([]);
  let yearlyCards: IncomeYearlyCard[] = $state([]);

  onMount(async () => {
    try {
      const {
        income_timeline: fetchedIncomes,
        tax_timeline: taxes,
        yearly_cards: fetchedYearlyCards,
      } = await ajax("/api/income");

      incomes = fetchedIncomes ?? [];
      yearlyCards = fetchedYearlyCards ?? [];
      grossIncome = sumBy(incomes, (i) => sumBy(i.postings, (p) => -p.amount));
      netTax = sumBy(taxes, (t) => sumBy(t.postings, (p) => p.amount));
      hasIncomeData = grossIncome !== 0 || netTax !== 0 || !isEmpty(yearlyCards);
      monthlyInvestmentTimelineLegends = buildMonthlyIncomeSeries(incomes).legends ?? [];
      yearlyIncomeTimelineLegends =
        buildYearlyIncomeComparisonSeries(yearlyCards).legends ?? [];
    } finally {
      isLoading = false;
    }
  });
</script>

<svelte:head>
  <title>Income - Paisa</title>
</svelte:head>

<Page width="analysis">
  <PageHeader
    title="Income"
    description="Monthly and financial year income, net income, and tax tracking"
  />

  <MetricStrip cols={2}>
    <Metric
      label="Gross Income"
      value={formatCurrency(grossIncome)}
      status="positive"
      loading={isLoading}
    />
    <Metric
      label="Net Tax"
      value={formatCurrency(netTax)}
      status="negative"
      loading={isLoading}
    />
  </MetricStrip>

  {#if !isLoading && !hasIncomeData}
    <ZeroState item={[]}>
      <p class="text-sm text-[var(--paisa-muted-foreground)]">
        No income postings found.
      </p>
    </ZeroState>
  {:else}
    <Section
      title="Monthly Income Timeline"
      subtitle="Income and investment activity by month"
    >
      <LegendCard legends={monthlyInvestmentTimelineLegends} clazz="mb-3 paisa-overflow-x-auto" />
      <ChartFrame height="tall">
        <MonthlyIncomeChart {incomes} />
      </ChartFrame>
    </Section>

    <Section
      title="Financial Year Income"
      subtitle="Yearly gross income, net income, and tax comparison"
    >
      <LegendCard legends={yearlyIncomeTimelineLegends} clazz="mb-3 paisa-overflow-x-auto" />
      <ChartFrame height="tall">
        <YearlyIncomeChart {yearlyCards} />
      </ChartFrame>
    </Section>
  {/if}
</Page>
