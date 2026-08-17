<script lang="ts">
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import {
    renderMonthlyInvestmentTimeline,
    renderYearlyInvestmentTimeline
  } from "$lib/charts/investment";
  import { createClientWidthChart, type ChartHandle } from "$lib/charts/resize";
  import { ajax, type InvestmentYearlyCard as InvestmentYearlyCardType, type Legend } from "$lib/core/utils";
  import _ from "lodash";
  import { onDestroy, onMount } from "svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";
  import ResponsiveGrid from "$lib/components/layout/ResponsiveGrid.svelte";
  import InvestmentYearlyCard from "$lib/components/finance/InvestmentYearlyCard.svelte";

  let monthlyInvestmentTimelineLegends: Legend[] = $state([]);
  let yearlyInvestmentTimelineLegends: Legend[] = $state([]);
  let yearlyCards: InvestmentYearlyCardType[] = $state([]);
  let monthlyChart: ChartHandle<null> | null = $state(null);
  let yearlyChart: ChartHandle<null> | null = $state(null);

  let sortedYearlyCards = $derived(
    _.orderBy(yearlyCards, (c) => c.start_date.valueOf(), "desc")
  );

  onMount(async () => {
    const { assets: assets, yearly_cards: fetchedYearlyCards } = await ajax("/api/investment");
    yearlyCards = fetchedYearlyCards || [];
    monthlyChart = createClientWidthChart("#d3-investment-timeline", () => {
      monthlyInvestmentTimelineLegends = renderMonthlyInvestmentTimeline(assets);
    });
    yearlyChart = createClientWidthChart("#d3-yearly-investment-timeline", () => {
      yearlyInvestmentTimelineLegends = renderYearlyInvestmentTimeline(yearlyCards);
    });
    monthlyChart.update(null);
    yearlyChart.update(null);
  });

  onDestroy(() => {
    monthlyChart?.destroy();
    yearlyChart?.destroy();
  });
</script>

<Page width="analysis">
  <PageHeader
    title="Investment"
    description="Monthly and yearly investment timeline & breakdowns"
  />

  <Section title="Monthly Investment Timeline">
    <LegendCard legends={monthlyInvestmentTimelineLegends} clazz="mb-3 paisa-overflow-x-auto" />
    <ChartFrame type="timeline" onresize={(dim) => monthlyChart?.resize(dim)}>
      <svg id="d3-investment-timeline" width="100%" height="450" />
    </ChartFrame>
  </Section>

  <Section title="Financial Year Investment Timeline">
    <LegendCard legends={yearlyInvestmentTimelineLegends} clazz="mb-3 paisa-overflow-x-auto" />
    <ChartFrame type="timeline" onresize={(dim) => yearlyChart?.resize(dim)}>
      <svg id="d3-yearly-investment-timeline" width="100%" />
    </ChartFrame>
  </Section>

  {#if sortedYearlyCards.length > 0}
    <Section title="Annual Breakdown">
      <ResponsiveGrid variant="cards">
        {#each sortedYearlyCards as card (card.start_date.valueOf())}
          <InvestmentYearlyCard {card} />
        {/each}
      </ResponsiveGrid>
    </Section>
  {/if}
</Page>
