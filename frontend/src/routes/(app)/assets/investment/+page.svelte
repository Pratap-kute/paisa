<script lang="ts">
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import {
    renderMonthlyInvestmentTimeline,
    renderYearlyCards,
    renderYearlyInvestmentTimeline
  } from "$lib/charts/investment";
  import { ajax, type Legend } from "$lib/core/utils";
  import _ from "lodash";
  import { onMount } from "svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";

  let monthlyInvestmentTimelineLegends: Legend[] = $state([]);
  let yearlyInvestmentTimelineLegends: Legend[] = $state([]);

  onMount(async () => {
    const { assets: assets, yearly_cards: yearlyCards } = await ajax("/api/investment");
    monthlyInvestmentTimelineLegends = renderMonthlyInvestmentTimeline(assets);
    yearlyInvestmentTimelineLegends = renderYearlyInvestmentTimeline(yearlyCards);
    renderYearlyCards(yearlyCards);
  });
</script>

<Page width="analysis">
  <PageHeader
    title="Investment"
    description="Monthly and yearly investment timeline breakdowns"
  />

  <Section title="Monthly Investment Timeline">
    <LegendCard legends={monthlyInvestmentTimelineLegends} clazz="mb-3 paisa-overflow-x-auto" />
    <ChartFrame type="timeline">
      <svg id="d3-investment-timeline" width="100%" height="500" />
    </ChartFrame>
  </Section>

  <Section title="Financial Year Investment">
    <div class="paisa-investment-yearly-layout">
      <div class="paisa-investment-yearly-chart">
        <LegendCard legends={yearlyInvestmentTimelineLegends} clazz="mb-3 paisa-overflow-x-auto" />
        <ChartFrame type="timeline">
          <svg id="d3-yearly-investment-timeline" width="100%" />
        </ChartFrame>
      </div>
      <div id="d3-yearly-investment-cards" class="paisa-investment-yearly-cards"></div>
    </div>
  </Section>
</Page>

<style lang="scss">
  .paisa-investment-yearly-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--paisa-space-4);

    @media screen and (min-width: 1024px) {
      grid-template-columns: 1fr 1fr;
    }
  }

  .paisa-investment-yearly-chart,
  .paisa-investment-yearly-cards {
    min-width: 0;
  }
</style>
