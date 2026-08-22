<script lang="ts">
  import {
    renderMonthlyInvestmentTimeline,
    renderYearlyIncomeTimeline,
    renderYearlyTimelineOf,
  } from "$lib/charts/income";
  import { createClientWidthChart, type ChartHandle } from "$lib/charts/resize";
  import { financialColors } from "$lib/theme/chartPalette";
  import { ajax, formatCurrency, type Legend } from "$lib/core/utils";
  import _ from "lodash";
  import { onDestroy, onMount, tick } from "svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import MetricStrip from "$lib/components/layout/MetricStrip.svelte";
  import Metric from "$lib/components/layout/Metric.svelte";
  import ResponsiveGrid from "$lib/components/layout/ResponsiveGrid.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";

  let grossIncome = $state(0);
  let netTax = $state(0);
  let isLoading = $state(true);
  let hasIncomeData = $state(false);

  let monthlyInvestmentTimelineLegends: Legend[] = $state([]);
  let yearlyIncomeTimelineLegends: Legend[] = $state([]);
  let yearlyNetIncomeTimelineLegends: Legend[] = $state([]);
  let yearlyNetTaxTimelineLegends: Legend[] = $state([]);
  let charts: ChartHandle<null>[] = [];

  onMount(async () => {
    try {
      const {
        income_timeline: incomes,
        tax_timeline: taxes,
        yearly_cards: yearlyCards,
      } = await ajax("/api/income");

      grossIncome = _.sumBy(incomes, (i) => _.sumBy(i.postings, (p) => -p.amount));
      netTax = _.sumBy(taxes, (t) => _.sumBy(t.postings, (p) => p.amount));
      hasIncomeData = grossIncome !== 0 || netTax !== 0 || !_.isEmpty(yearlyCards);

      await tick();
      charts = [
        createClientWidthChart("#d3-income-timeline", (_data, _size) => {
          monthlyInvestmentTimelineLegends = renderMonthlyInvestmentTimeline(incomes);
        }),
        createClientWidthChart("#d3-yearly-income-timeline", (_data, _size) => {
          yearlyIncomeTimelineLegends = renderYearlyIncomeTimeline(yearlyCards);
        }),
        createClientWidthChart("#d3-yearly-net_income-timeline", (_data, _size) => {
          yearlyNetIncomeTimelineLegends = renderYearlyTimelineOf(
            "Net Income",
            "net_income",
            financialColors.gainText,
            yearlyCards,
          );
        }),
        createClientWidthChart("#d3-yearly-net_tax-timeline", (_data, _size) => {
          yearlyNetTaxTimelineLegends = renderYearlyTimelineOf(
            "Net Tax",
            "net_tax",
            financialColors.lossText,
            yearlyCards,
          );
        }),
      ];
      charts.forEach((chart) => chart.update(null));
    } finally {
      isLoading = false;
    }
  });

  onDestroy(() => {
    charts.forEach((chart) => chart.destroy());
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
      <ChartFrame type="timeline" size="dynamic" onresize={(dim) => charts[0]?.resize(dim)}>
        <svg id="d3-income-timeline" width="100%" height="500" />
      </ChartFrame>
    </Section>

    <Section
      title="Financial Year Income"
      subtitle="Yearly gross income, net income, and tax comparison"
    >
      <ResponsiveGrid variant="cards" cols={3}>
        <div class="min-w-0">
          <LegendCard legends={yearlyIncomeTimelineLegends} clazz="mb-3 paisa-overflow-x-auto" />
          <ChartFrame type="timeline" size="dynamic" onresize={(dim) => charts[1]?.resize(dim)}>
            <svg id="d3-yearly-income-timeline" width="100%" />
          </ChartFrame>
        </div>
        <div class="min-w-0">
          <LegendCard legends={yearlyNetIncomeTimelineLegends} clazz="mb-3 paisa-overflow-x-auto" />
          <ChartFrame type="timeline" size="dynamic" onresize={(dim) => charts[2]?.resize(dim)}>
            <svg id="d3-yearly-net_income-timeline" width="100%" />
          </ChartFrame>
        </div>
        <div class="min-w-0">
          <LegendCard legends={yearlyNetTaxTimelineLegends} clazz="mb-3 paisa-overflow-x-auto" />
          <ChartFrame type="timeline" size="dynamic" onresize={(dim) => charts[3]?.resize(dim)}>
            <svg id="d3-yearly-net_tax-timeline" width="100%" />
          </ChartFrame>
        </div>
      </ResponsiveGrid>
    </Section>
  {/if}
</Page>
