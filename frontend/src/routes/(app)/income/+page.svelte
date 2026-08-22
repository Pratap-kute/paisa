<script lang="ts">
  import {
    buildMonthlyIncomeSeries,
    buildYearlyIncomeSeries,
    buildYearlyIncomeValueSeries,
  } from "$lib/charts/time_series_data";
  import { financialColors } from "$lib/theme/chartPalette";
  import { ajax, formatCurrency, type Income, type IncomeYearlyCard, type Legend } from "$lib/core/utils";
  import _ from "lodash";
  import { onMount } from "svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import MetricStrip from "$lib/components/layout/MetricStrip.svelte";
  import Metric from "$lib/components/layout/Metric.svelte";
  import ResponsiveGrid from "$lib/components/layout/ResponsiveGrid.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";
  import MonthlyIncomeChart from "$lib/components/charts/MonthlyIncomeChart.svelte";
  import YearlyIncomeChart from "$lib/components/charts/YearlyIncomeChart.svelte";
  import YearlyIncomeValueChart from "$lib/components/charts/YearlyIncomeValueChart.svelte";

  let grossIncome = $state(0);
  let netTax = $state(0);
  let isLoading = $state(true);
  let hasIncomeData = $state(false);

  let monthlyInvestmentTimelineLegends: Legend[] = $state([]);
  let yearlyIncomeTimelineLegends: Legend[] = $state([]);
  let yearlyNetIncomeTimelineLegends: Legend[] = $state([]);
  let yearlyNetTaxTimelineLegends: Legend[] = $state([]);
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
      grossIncome = _.sumBy(incomes, (i) => _.sumBy(i.postings, (p) => -p.amount));
      netTax = _.sumBy(taxes, (t) => _.sumBy(t.postings, (p) => p.amount));
      hasIncomeData = grossIncome !== 0 || netTax !== 0 || !_.isEmpty(yearlyCards);
      monthlyInvestmentTimelineLegends = buildMonthlyIncomeSeries(incomes).legends ?? [];
      yearlyIncomeTimelineLegends = buildYearlyIncomeSeries(yearlyCards).legends ?? [];
      yearlyNetIncomeTimelineLegends = buildYearlyIncomeValueSeries(
        "Net Income",
        "net_income",
        financialColors.gainText,
        yearlyCards,
      ).legends ?? [];
      yearlyNetTaxTimelineLegends = buildYearlyIncomeValueSeries(
        "Net Tax",
        "net_tax",
        financialColors.lossText,
        yearlyCards,
      ).legends ?? [];
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
      <ChartFrame type="timeline" size="dynamic">
        <MonthlyIncomeChart {incomes} />
      </ChartFrame>
    </Section>

    <Section
      title="Financial Year Income"
      subtitle="Yearly gross income, net income, and tax comparison"
    >
      <ResponsiveGrid variant="cards" cols={3}>
        <div class="min-w-0">
          <LegendCard legends={yearlyIncomeTimelineLegends} clazz="mb-3 paisa-overflow-x-auto" />
          <ChartFrame type="timeline" size="dynamic">
            <YearlyIncomeChart {yearlyCards} />
          </ChartFrame>
        </div>
        <div class="min-w-0">
          <LegendCard legends={yearlyNetIncomeTimelineLegends} clazz="mb-3 paisa-overflow-x-auto" />
          <ChartFrame type="timeline" size="dynamic">
            <YearlyIncomeValueChart
              label="Net Income"
              seriesKey="net_income"
              color={financialColors.gainText}
              {yearlyCards}
              testId="income-yearly-net-income-echart"
            />
          </ChartFrame>
        </div>
        <div class="min-w-0">
          <LegendCard legends={yearlyNetTaxTimelineLegends} clazz="mb-3 paisa-overflow-x-auto" />
          <ChartFrame type="timeline" size="dynamic">
            <YearlyIncomeValueChart
              label="Net Tax"
              seriesKey="net_tax"
              color={financialColors.lossText}
              {yearlyCards}
              testId="income-yearly-net-tax-echart"
            />
          </ChartFrame>
        </div>
      </ResponsiveGrid>
    </Section>
  {/if}
</Page>
