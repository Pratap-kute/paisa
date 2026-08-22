<script lang="ts">
  import { generateColorScheme, genericBarColor } from "$lib/core/colors";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import { filterCommodityBreakdowns, renderPortfolioBreakdown } from "$lib/charts/portfolio";
  import { ajax, type PortfolioAggregate } from "$lib/core/utils";
  import _ from "lodash";
  import { onMount, tick } from "svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";
  import ResponsiveGrid from "$lib/components/layout/ResponsiveGrid.svelte";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";

  let commodities: string[] = $state([]);
  let selectedCommodities: string[] = $state([]);
  let security_type: PortfolioAggregate[] = $state([]);
  let name_and_security_type: PortfolioAggregate[] = $state([]);
  let rating: PortfolioAggregate[] = $state([]);
  let industry: PortfolioAggregate[] = $state([]);
  let isEmpty = $state(false);
  let isLoading = $state(true);
  let color: d3.ScaleOrdinal<string, string> | undefined = $state();

  let securityTypeR: ReturnType<typeof renderPortfolioBreakdown> | null = $state(null);
  let portfolioR: ReturnType<typeof renderPortfolioBreakdown> | null = $state(null);
  let industryR: ReturnType<typeof renderPortfolioBreakdown> | null = $state(null);
  let ratingR: ReturnType<typeof renderPortfolioBreakdown> | null = $state(null);

  let hasFilteredData = $derived(
    !isEmpty &&
      selectedCommodities.length > 0 &&
      _.some(
        [
          ...filterCommodityBreakdowns(security_type, selectedCommodities),
          ...filterCommodityBreakdowns(rating, selectedCommodities),
          ...filterCommodityBreakdowns(industry, selectedCommodities),
          ...filterCommodityBreakdowns(name_and_security_type, selectedCommodities),
        ],
        (row) => row.amount > 0,
      ),
  );

  function initCharts() {
    securityTypeR = renderPortfolioBreakdown("#d3-portfolio-security-type", security_type, {
      small: true,
    });
    ratingR = renderPortfolioBreakdown("#d3-portfolio-security-rating", rating, { small: true });
    industryR = renderPortfolioBreakdown("#d3-portfolio-security-industry", industry, {
      z: [genericBarColor()],
    });
    portfolioR = renderPortfolioBreakdown("#d3-portfolio", name_and_security_type);
  }

  function refreshCharts() {
    if (!color || !securityTypeR || !ratingR || !industryR || !portfolioR) return;
    securityTypeR.renderer(filterCommodityBreakdowns(security_type, selectedCommodities), color);
    ratingR.renderer(filterCommodityBreakdowns(rating, selectedCommodities), color);
    industryR.renderer(filterCommodityBreakdowns(industry, selectedCommodities), color);
    portfolioR.renderer(
      filterCommodityBreakdowns(name_and_security_type, selectedCommodities),
      color,
    );
  }

  function resizeSecurityType() {
    document.getElementById("d3-portfolio-security-type")?.replaceChildren();
    securityTypeR = renderPortfolioBreakdown("#d3-portfolio-security-type", security_type, {
      small: true,
    });
    refreshCharts();
  }

  function resizeRating() {
    document.getElementById("d3-portfolio-security-rating")?.replaceChildren();
    ratingR = renderPortfolioBreakdown("#d3-portfolio-security-rating", rating, { small: true });
    refreshCharts();
  }

  function resizeIndustry() {
    document.getElementById("d3-portfolio-security-industry")?.replaceChildren();
    industryR = renderPortfolioBreakdown("#d3-portfolio-security-industry", industry, {
      z: [genericBarColor()],
    });
    refreshCharts();
  }

  function resizePortfolio() {
    document.getElementById("d3-portfolio")?.replaceChildren();
    portfolioR = renderPortfolioBreakdown("#d3-portfolio", name_and_security_type);
    refreshCharts();
  }

  onMount(async () => {
    try {
      ({ name_and_security_type, security_type, rating, industry, commodities } = await ajax(
        "/api/portfolio_allocation",
      ));

      if (_.isEmpty(commodities)) {
        isEmpty = true;
        return;
      }

      selectedCommodities = [...commodities];
      color = generateColorScheme(commodities);
      isLoading = false;
      await tick();
      initCharts();
      refreshCharts();
    } catch {
      isEmpty = true;
    } finally {
      isLoading = false;
    }
  });

  $effect(() => {
    if (securityTypeR && ratingR && industryR && portfolioR && color) {
      refreshCharts();
    }
  });
</script>

<svelte:head>
  <title>Portfolio Analysis - Paisa</title>
</svelte:head>

<Page width="analysis">
  <PageHeader
    title="Portfolio Analysis"
    description="Breakdown by security type, rating, industry, and individual holdings"
  >
    {#snippet actions()}
      {#if !isEmpty && commodities.length > 0}
        <div class="flex max-w-[min(100vw-2rem,520px)] flex-wrap gap-[var(--paisa-space-2)]">
          {#each commodities as commodity}
            {@const name = `switch-${commodity}`}
            <label
              class="inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full border border-[var(--paisa-border-subtle)] px-2 py-0.5 text-xs text-[var(--paisa-muted-foreground)] has-[:checked]:border-[var(--commodity-color,var(--paisa-primary))] has-[:checked]:bg-[var(--paisa-surface-hover)] has-[:checked]:text-[var(--paisa-foreground)]"
              style="--commodity-color: {color ? color(commodity) : ''}"
            >
              <input
                id={name}
                type="checkbox"
                bind:group={selectedCommodities}
                name="commodities"
                value={commodity}
              />
              <span>{commodity}</span>
            </label>
          {/each}
        </div>
      {/if}
    {/snippet}
  </PageHeader>

  {#if isLoading}
    <Section title="Loading portfolio data">
      <ChartFrame type="dynamic" />
    </Section>
  {:else if isEmpty}
    <ZeroState item={[]}>
      <p class="text-sm text-[var(--paisa-muted-foreground)]">
        Mutual fund portfolio data is not available. Use
        <strong>Update Mutual Fund Portfolios</strong> from the actions menu to refresh holdings.
      </p>
    </ZeroState>
  {:else if !hasFilteredData}
    <ZeroState item={[]}>
      <p class="text-sm text-[var(--paisa-muted-foreground)]">
        Select at least one commodity to view portfolio breakdown.
      </p>
    </ZeroState>
  {:else}
    <ResponsiveGrid variant="two-column">
      <Section title="Security Type" subtitle="Composition by fund category">
        <ChartFrame type="dynamic" onresize={resizeSecurityType}>
          <div id="d3-portfolio-security-type-treemap" style="width: 100%; position: relative"></div>
          <svg id="d3-portfolio-security-type" />
        </ChartFrame>
      </Section>

      <Section title="Security Rating" subtitle="Credit quality distribution">
        <ChartFrame type="dynamic" onresize={resizeRating}>
          <div id="d3-portfolio-security-rating-treemap" style="width: 100%; position: relative"></div>
          <svg id="d3-portfolio-security-rating" />
        </ChartFrame>
      </Section>
    </ResponsiveGrid>

    <Section title="Industry" subtitle="Sector exposure breakdown">
      <ChartFrame type="dynamic" onresize={resizeIndustry}>
        <div id="d3-portfolio-security-industry-treemap" style="width: 100%; position: relative"></div>
        <svg id="d3-portfolio-security-industry" />
      </ChartFrame>
    </Section>

    <Section title="Holdings" subtitle="Individual security composition">
      {#if portfolioR}
        <LegendCard legends={portfolioR.legends} clazz="mb-3 paisa-overflow-x-auto" />
      {/if}
      <ChartFrame type="dynamic" onresize={resizePortfolio}>
        <div id="d3-portfolio-treemap" style="width: 100%; position: relative"></div>
        <svg id="d3-portfolio" />
      </ChartFrame>
    </Section>
  {/if}
</Page>
