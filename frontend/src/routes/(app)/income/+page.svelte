<script lang="ts">
  import COLORS from "$lib/core/colors";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import LevelItem from "$lib/components/ui/LevelItem.svelte";
  import {
    renderMonthlyInvestmentTimeline,
    renderYearlyIncomeTimeline,
    renderYearlyTimelineOf
  } from "$lib/charts/income";
  import { createClientWidthChart, type ChartHandle } from "$lib/charts/resize";
  import { ajax, formatCurrency, type Legend } from "$lib/core/utils";
  import _ from "lodash";
  import { onDestroy, onMount } from "svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import MetricStrip from "$lib/components/layout/MetricStrip.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";

  let grossIncome = $state(0);
  let netTax = $state(0);

  let monthlyInvestmentTimelineLegends: Legend[] = $state([]);
  let yearlyIncomeTimelineLegends: Legend[] = $state([]);
  let yearlyNetIncomeTimelineLegends: Legend[] = $state([]);
  let yearlyNetTaxTimelineLegends: Legend[] = $state([]);
  let charts: ChartHandle<null>[] = [];

  onMount(async () => {
    const {
      income_timeline: incomes,
      tax_timeline: taxes,
      yearly_cards: yearlyCards
    } = await ajax("/api/income");
    charts = [
      createClientWidthChart("#d3-income-timeline", () => {
        monthlyInvestmentTimelineLegends = renderMonthlyInvestmentTimeline(incomes);
      }),
      createClientWidthChart("#d3-yearly-income-timeline", () => {
        yearlyIncomeTimelineLegends = renderYearlyIncomeTimeline(yearlyCards);
      }),
      createClientWidthChart("#d3-yearly-net_income-timeline", () => {
        yearlyNetIncomeTimelineLegends = renderYearlyTimelineOf(
          "Net Income",
          "net_income",
          COLORS.gain,
          yearlyCards
        );
      }),
      createClientWidthChart("#d3-yearly-net_tax-timeline", () => {
        yearlyNetTaxTimelineLegends = renderYearlyTimelineOf(
          "Net Tax",
          "net_tax",
          COLORS.loss,
          yearlyCards
        );
      }),
    ];
    charts.forEach((chart) => chart.update(null));

    grossIncome = _.sumBy(incomes, (i) => _.sumBy(i.postings, (p) => -p.amount));
    netTax = _.sumBy(taxes, (t) => _.sumBy(t.postings, (p) => p.amount));
  });

  onDestroy(() => {
    charts.forEach((chart) => chart.destroy());
  });
</script>

<Page width="analysis">
  <PageHeader
    title="Income"
    description="Monthly and financial year income, net income, and tax tracking"
  />

  <MetricStrip cols={2}>
    <LevelItem title="Gross Income" value={formatCurrency(grossIncome)} color={COLORS.gainText} />
    <LevelItem title="Net Tax" value={formatCurrency(netTax)} color={COLORS.lossText} />
  </MetricStrip>

  <Section title="Monthly Income Timeline">
    <LegendCard legends={monthlyInvestmentTimelineLegends} clazz="mb-3 paisa-overflow-x-auto" />
    <ChartFrame type="timeline" onresize={(dim) => charts[0]?.resize(dim)}>
      <svg id="d3-income-timeline" width="100%" height="500" />
    </ChartFrame>
  </Section>

  <Section title="Financial Year Income Timeline">
    <div class="paisa-yearly-income-grid">
      <div class="paisa-yearly-income-col">
        <LegendCard legends={yearlyIncomeTimelineLegends} clazz="mb-3 paisa-overflow-x-auto" />
        <ChartFrame type="timeline" onresize={(dim) => charts[1]?.resize(dim)}>
          <svg id="d3-yearly-income-timeline" width="100%" />
        </ChartFrame>
      </div>
      <div class="paisa-yearly-income-col">
        <LegendCard legends={yearlyNetIncomeTimelineLegends} clazz="mb-3 paisa-overflow-x-auto" />
        <ChartFrame type="timeline" onresize={(dim) => charts[2]?.resize(dim)}>
          <svg id="d3-yearly-net_income-timeline" width="100%" />
        </ChartFrame>
      </div>
      <div class="paisa-yearly-income-col">
        <LegendCard legends={yearlyNetTaxTimelineLegends} clazz="mb-3 paisa-overflow-x-auto" />
        <ChartFrame type="timeline" onresize={(dim) => charts[3]?.resize(dim)}>
          <svg id="d3-yearly-net_tax-timeline" width="100%" />
        </ChartFrame>
      </div>
    </div>
  </Section>
</Page>

<style lang="scss">
  .paisa-yearly-income-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--paisa-space-4);

    @media screen and (min-width: 1024px) {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .paisa-yearly-income-col {
    min-width: 0;
  }
</style>
