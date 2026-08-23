<script lang="ts">
  import {
    buildPortfolioComparison,
    buildPortfolioHierarchy,
    filterCommodityBreakdowns,
  } from "$lib/charts/hierarchy_data";
  import { ajax, type PortfolioAggregate } from "$lib/core/utils";
  import _ from "lodash";
  import { onMount } from "svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";
  import ResponsiveGrid from "$lib/components/layout/ResponsiveGrid.svelte";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";
  import ComparisonBarChart from "$lib/components/charts/ComparisonBarChart.svelte";
  import FinancialHierarchyChart from "$lib/components/charts/FinancialHierarchyChart.svelte";

  let commodities: string[] = $state([]);
  let selectedCommodities: string[] = $state([]);
  let security_type: PortfolioAggregate[] = $state([]);
  let name_and_security_type: PortfolioAggregate[] = $state([]);
  let rating: PortfolioAggregate[] = $state([]);
  let industry: PortfolioAggregate[] = $state([]);
  let isEmpty = $state(false);
  let isLoading = $state(true);
  let filteredSecurityType = $derived(filterCommodityBreakdowns(security_type, selectedCommodities));
  let filteredRating = $derived(filterCommodityBreakdowns(rating, selectedCommodities));
  let filteredIndustry = $derived(filterCommodityBreakdowns(industry, selectedCommodities));
  let filteredPortfolio = $derived(filterCommodityBreakdowns(name_and_security_type, selectedCommodities));
  let securityTypeData = $derived(buildPortfolioComparison(filteredSecurityType));
  let ratingData = $derived(buildPortfolioComparison(filteredRating));
  let industryData = $derived(buildPortfolioHierarchy(filteredIndustry));
  let portfolioData = $derived(buildPortfolioHierarchy(filteredPortfolio));

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
      isLoading = false;
    } catch {
      isEmpty = true;
    } finally {
      isLoading = false;
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
      <ChartFrame height="content" />
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
        <ChartFrame height="compact" rows={Math.max(4, securityTypeData.points.length)}>
          <ComparisonBarChart data={securityTypeData} ariaLabel="Portfolio by security type" testId="portfolio-security-type-echart" />
        </ChartFrame>
      </Section>

      <Section title="Security Rating" subtitle="Credit quality distribution">
        <ChartFrame height="compact" rows={Math.max(4, ratingData.points.length)}>
          <ComparisonBarChart data={ratingData} ariaLabel="Portfolio by security rating" testId="portfolio-security-rating-echart" />
        </ChartFrame>
      </Section>
    </ResponsiveGrid>

    <Section title="Industry" subtitle="Sector exposure breakdown">
      <ChartFrame height="tall">
        <FinancialHierarchyChart data={{ roots: industryData, mode: "treemap" }} ariaLabel="Portfolio industry and security hierarchy" testId="portfolio-industry-echart" />
      </ChartFrame>
    </Section>

    <Section title="Holdings" subtitle="Individual security composition">
      <ChartFrame height="tall">
        <FinancialHierarchyChart data={{ roots: portfolioData, mode: "treemap" }} ariaLabel="Portfolio holdings hierarchy" testId="portfolio-holdings-echart" />
      </ChartFrame>
    </Section>
  {/if}
</Page>
