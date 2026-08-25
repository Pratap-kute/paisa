<script lang="ts">
  import {
    buildFlattenedHoldings,
    buildPortfolioComparison,
    buildTopHoldingsComparison,
    filterCommodityBreakdowns,
  } from "$lib/features/charts/hierarchy_data";
  import COLORS from "$lib/shared/theme/colors";
  import { ajax, formatPercentage, type PortfolioAggregate } from "$lib/core/utils";
  import { nonZeroCurrency } from "$lib/shared/tables/formatters";
    import { onMount } from "svelte";
  import type { ColumnDefinition, ProgressBarParams } from "tabulator-tables";
  import Page from "$lib/shared/layout/Page.svelte";
  import PageHeader from "$lib/shared/layout/PageHeader.svelte";
  import Section from "$lib/shared/layout/Section.svelte";
  import ChartFrame from "$lib/shared/ui/ChartFrame.svelte";
  import ResponsiveGrid from "$lib/shared/layout/ResponsiveGrid.svelte";
  import ZeroState from "$lib/shared/ui/ZeroState.svelte";
  import ComparisonBarChart from "$lib/features/charts/components/ComparisonBarChart.svelte";
  import Table from "$lib/shared/ui/Table.svelte";
  import Input from "$lib/shared/ui/Input.svelte";
import { isEmpty as isEmptyValue, max, some } from "$lib/shared/utils/collection";

  let commodities: string[] = $state([]);
  let selectedCommodities: string[] = $state([]);
  let security_type: PortfolioAggregate[] = $state([]);
  let name_and_security_type: PortfolioAggregate[] = $state([]);
  let rating: PortfolioAggregate[] = $state([]);
  let industry: PortfolioAggregate[] = $state([]);
  let isEmpty = $state(false);
  let isLoading = $state(true);
  let searchHoldingQuery = $state("");

  let filteredSecurityType = $derived(filterCommodityBreakdowns(security_type, selectedCommodities));
  let filteredRating = $derived(filterCommodityBreakdowns(rating, selectedCommodities));
  let filteredIndustry = $derived(filterCommodityBreakdowns(industry, selectedCommodities));
  let filteredPortfolio = $derived(filterCommodityBreakdowns(name_and_security_type, selectedCommodities));

  let securityTypeData = $derived(buildPortfolioComparison(filteredSecurityType));
  let ratingData = $derived(buildPortfolioComparison(filteredRating));
  let industryData = $derived(buildPortfolioComparison(filteredIndustry));

  let flattenedHoldings = $derived(buildFlattenedHoldings(filteredPortfolio));
  let topHoldingsData = $derived(buildTopHoldingsComparison(flattenedHoldings, 10));

  let filteredHoldingRows = $derived.by(() => {
    if (!searchHoldingQuery.trim()) return flattenedHoldings;
    const q = searchHoldingQuery.toLowerCase();
    return flattenedHoldings.filter(
      (h) =>
        h.security_name.toLowerCase().includes(q) ||
        h.security_type.toLowerCase().includes(q) ||
        h.commodities.toLowerCase().includes(q),
    );
  });

  const holdingColumns = $derived.by((): ColumnDefinition[] => {
    const maxPercent = max(flattenedHoldings.map((h) => h.percentage)) || 100;
    return [
      {
        title: "#",
        field: "rank",
        width: 56,
        minWidth: 48,
        maxWidth: 64,
        hozAlign: "center",
        headerHozAlign: "center",
      },
      {
        title: "Security Name",
        field: "security_name",
        minWidth: 220,
        widthGrow: 2,
        headerHozAlign: "left",
      },
      {
        title: "Type",
        field: "security_type",
        width: 100,
        minWidth: 90,
        headerHozAlign: "left",
      },
      {
        title: "Funds",
        field: "commodities",
        minWidth: 140,
        widthGrow: 1,
        headerHozAlign: "left",
      },
      {
        title: "Market Value",
        field: "amount",
        width: 140,
        minWidth: 120,
        hozAlign: "right",
        headerHozAlign: "right",
        formatter: nonZeroCurrency,
      },
      {
        title: "Weight",
        field: "percentage",
        width: 90,
        minWidth: 80,
        hozAlign: "right",
        headerHozAlign: "right",
        formatter: (cell) => formatPercentage(cell.getValue() / 100, 2),
      },
      {
        title: "Share",
        field: "percentage",
        minWidth: 140,
        widthGrow: 2,
        hozAlign: "left",
        headerHozAlign: "left",
        headerSort: false,
        formatter: "progress",
        formatterParams: {
          color: COLORS.assets,
          min: 0,
          max: maxPercent,
        } as ProgressBarParams,
      },
    ];
  });

  let hasFilteredData = $derived(
    !isEmpty &&
      selectedCommodities.length > 0 &&
      some(
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

      if (isEmptyValue(commodities)) {
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
      <ChartFrame height="compact" rows={Math.max(4, industryData.points.length)}>
        <ComparisonBarChart data={industryData} ariaLabel="Portfolio by industry sector" testId="portfolio-industry-echart" />
      </ChartFrame>
    </Section>

    <Section title="Top Holdings" subtitle="Top 10 individual securities by market value">
      <ChartFrame height="compact" rows={Math.max(4, topHoldingsData.points.length)}>
        <ComparisonBarChart data={topHoldingsData} ariaLabel="Top portfolio holdings" testId="portfolio-top-holdings-echart" />
      </ChartFrame>
    </Section>

    <Section title="All Holdings" subtitle="Complete searchable security composition">
      {#snippet action()}
        <div class="w-64">
          <Input
            type="search"
            placeholder="Search securities or funds..."
            bind:value={searchHoldingQuery}
          />
        </div>
      {/snippet}
      <div class="max-w-full overflow-auto rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)]">
        <Table data={filteredHoldingRows} columns={holdingColumns} options={{ layout: "fitDataFill" }} />
      </div>
    </Section>
  {/if}
</Page>
