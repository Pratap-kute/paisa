<script lang="ts">
  import COLORS, {
    generateColorScheme,
    genericBarColor,
  } from "$lib/core/colors";
  import { buildLegends } from "$lib/charts/gain";
  import {
    filterCommodityBreakdowns,
    renderPortfolioBreakdown,
  } from "$lib/charts/portfolio";
  import {
    ajax,
    type Posting,
    formatCurrency,
    formatFloat,
    type AccountGain,
    type Networth,
    type PortfolioAggregate,
    type AssetBreakdown,
    formatPercentage,
    formatFloatUptoPrecision,
    firstName,
    restName,
    postingUrl,
  } from "$lib/core/utils";
  import _ from "lodash";
  import { onMount } from "svelte";
  import type { PageData } from "./$types";

  import { iconify } from "$lib/core/icon";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import MetricStrip from "$lib/components/layout/MetricStrip.svelte";
  import Metric from "$lib/components/layout/Metric.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";
  import GainAccountTimelineChart from "$lib/components/charts/GainAccountTimelineChart.svelte";

  let commodities: string[] = [];
  let selectedCommodities: string[] = $state([]);
  let security_type: PortfolioAggregate[] = $state([]);
  let name_and_security_type: PortfolioAggregate[] = $state([]);
  let rating: PortfolioAggregate[] = $state([]);
  let industry: PortfolioAggregate[] = $state([]);
  let color: any = $state();

  let securityTypeEmpty: boolean = $state(false);
  let nameAndSecurityTypeEmpty: boolean = $state(false);
  let ratingEmpty: boolean = $state(false);
  let industryEmpty: boolean = $state(false);

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  let gain: AccountGain = $state();
  let overview: Networth = $state();
  let assetBreakdown: AssetBreakdown = $state();
  let legends = buildLegends();

  let postings: Posting[] = $state([]);

  let securityTypeR: any = $state(),
    portfolioR: any = $state(),
    industryR: any = $state(),
    ratingR: any = $state(null);

  onMount(async () => {
    ({
      gain_timeline_breakdown: gain,
      asset_breakdown: assetBreakdown,
      portfolio_allocation: {
        name_and_security_type,
        security_type,
        rating,
        industry,
        commodities,
      },
    } = await ajax("/api/gain/:name", null, data));

    overview = _.last(gain.networthTimeline);
    postings = _.chain(gain.postings)
      .sortBy((p) => p.date)
      .reverse()
      .take(100)
      .value();
    selectedCommodities = [...commodities];
    ({ renderer: securityTypeR } = renderPortfolioBreakdown(
      "#d3-portfolio-security-type",
      security_type,
      {
        small: true,
      },
    ));
    ({ renderer: ratingR } = renderPortfolioBreakdown(
      "#d3-portfolio-security-rating",
      rating,
      {
        small: true,
      },
    ));
    ({ renderer: industryR } = renderPortfolioBreakdown(
      "#d3-portfolio-security-industry",
      industry,
      {
        small: true,
        z: [genericBarColor()],
      },
    ));
    ({ renderer: portfolioR } = renderPortfolioBreakdown(
      "#d3-portfolio",
      name_and_security_type,
      {
        small: true,
      },
    ));

    if (commodities.length !== 0) {
      color = generateColorScheme(commodities);
    }

    securityTypeEmpty = security_type.length === 0;
    nameAndSecurityTypeEmpty = name_and_security_type.length === 0;
    ratingEmpty = rating.length === 0;
    industryEmpty = industry.length === 0;
  });

  $effect(() => {
    if (securityTypeR && ratingR && industryR && portfolioR) {
      securityTypeR(
        filterCommodityBreakdowns(security_type, selectedCommodities),
        color,
      );
      ratingR(filterCommodityBreakdowns(rating, selectedCommodities), color);
      industryR(
        filterCommodityBreakdowns(industry, selectedCommodities),
        color,
      );
      portfolioR(
        filterCommodityBreakdowns(name_and_security_type, selectedCommodities),
        color,
      );
    }
  });
</script>

<svelte:head>
  <title>{data.name || "Asset Gain"} - Paisa</title>
</svelte:head>

<Page width="fluid">
  <PageHeader
    title={data.name || "Asset Gain"}
    description="Lot-by-lot gain, performance timeline, and transaction history"
  >
    {#snippet leading()}
      <a
        href="/assets/gain"
        class="inline-flex items-center gap-1 text-sm text-[var(--paisa-muted-foreground)] transition-colors hover:text-[var(--paisa-foreground)]"
      >
        <i class="fas fa-chevron-left text-xs" aria-hidden="true"></i>
        <span>Gain</span>
      </a>
    {/snippet}
  </PageHeader>

  {#if overview}
    <MetricStrip cols={4}>
      <Metric label="Balance" value={formatCurrency(overview.balanceAmount)} />
      <Metric
        label="Net Investment"
        value={formatCurrency(overview.netInvestmentAmount)}
      />
      <Metric
        label="Gain / Loss"
        value={formatCurrency(overview.gainAmount)}
        status={overview.gainAmount >= 0 ? "positive" : "negative"}
      />
      <Metric
        label="XIRR"
        value={formatFloat(gain?.xirr)}
        secondary={assetBreakdown
          ? `${formatPercentage(assetBreakdown.absoluteReturn, 2)} absolute return`
          : undefined}
      />
    </MetricStrip>
  {/if}

  <div class="grid w-full grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
    <div class="flex min-w-0 flex-col gap-4">
      <Section title="Postings">
        <div
          class="flex max-h-[min(720px,calc(100vh-300px))] min-h-[280px] flex-col gap-2 overflow-y-auto pr-1 max-lg:max-h-[400px] max-lg:min-h-0"
        >
          {#each postings as posting}
            <a
              class="paisa-posting-row flex min-h-[54px] flex-col gap-1 rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-default)] bg-[var(--paisa-surface-card)] px-3 py-2 text-[var(--paisa-text-secondary)] no-underline transition-colors hover:border-[var(--paisa-border-strong)] hover:text-[var(--paisa-text-primary)]"
              href={postingUrl(posting)}
              style="border-left: 2px solid {posting.amount >= 0
                ? posting.account.startsWith('Income:CapitalGains')
                  ? COLORS.loss
                  : COLORS.secondary
                : posting.account.startsWith('Income:CapitalGains')
                  ? COLORS.gain
                  : COLORS.tertiary}"
            >
              <span class="flex min-w-0 items-center justify-between gap-2">
                <span
                  class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[var(--paisa-text-secondary)]"
                  >{posting.payee}</span
                >
                <span
                  class="shrink-0 text-xs text-[var(--paisa-text-muted)]"
                  >{posting.date.format("DD MMM YYYY")}</span
                >
              </span>
              <span class="flex min-w-0 items-center justify-between gap-2">
                <span
                  class="custom-icon min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[var(--paisa-text-muted)]"
                >
                  {iconify(restName(posting.account), {
                    group: firstName(posting.account),
                  })}
                </span>
                <span
                  class="shrink-0 font-semibold text-[var(--paisa-text-primary)]"
                  >{formatCurrency(posting.amount)}</span
                >
              </span>
            </a>
          {/each}
        </div>
      </Section>
    </div>

    <div class="flex min-w-0 flex-col gap-4">
      {#if overview}
        <Section>
          <div
            class="flex flex-wrap items-center gap-4 rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-card)] px-4 py-3"
          >
            <span class="custom-icon text-xl">{iconify(data.name)}</span>
            <div class="flex items-baseline gap-2">
              <span class="text-xs text-[var(--paisa-text-muted)]"
                >Investment</span
              >
              <span class="font-semibold text-[var(--paisa-foreground)]"
                >{formatCurrency(overview.investmentAmount)}</span
              >
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-xs text-[var(--paisa-text-muted)]"
                >Withdrawal</span
              >
              <span class="font-semibold text-[var(--paisa-foreground)]"
                >{formatCurrency(overview.withdrawalAmount)}</span
              >
            </div>
            {#if overview.balanceUnits > 0}
              <div class="flex items-baseline gap-2">
                <span class="text-xs text-[var(--paisa-text-muted)]"
                  >Balance Units</span
                >
                <span class="font-semibold text-[var(--paisa-foreground)]"
                  >{formatFloatUptoPrecision(overview.balanceUnits, 4)}</span
                >
              </div>
            {/if}
          </div>
        </Section>
      {/if}

      <Section title="Timeline">
        <LegendCard {legends} clazz="mb-3 paisa-overflow-x-auto" />
        <ChartFrame type="timeline">
          {#if gain}
            <GainAccountTimelineChart points={gain.networthTimeline} />
          {/if}
        </ChartFrame>
      </Section>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div class="flex min-w-0 flex-col gap-4">
          {#if !securityTypeEmpty}
            <Section title="Security Type">
              <ChartFrame type="distribution">
                <div
                  id="d3-portfolio-security-type-treemap"
                  style="width: 100%; position: relative"
                ></div>
                <svg id="d3-portfolio-security-type" width="100%" />
              </ChartFrame>
            </Section>
          {/if}

          {#if !ratingEmpty}
            <Section title="Security Rating">
              <ChartFrame type="distribution">
                <div
                  id="d3-portfolio-security-rating-treemap"
                  style="width: 100%; position: relative"
                ></div>
                <svg id="d3-portfolio-security-rating" width="100%" />
              </ChartFrame>
            </Section>
          {/if}

          {#if !industryEmpty}
            <Section title="Industry">
              <ChartFrame type="distribution">
                <div
                  id="d3-portfolio-security-industry-treemap"
                  style="width: 100%; position: relative"
                ></div>
                <svg id="d3-portfolio-security-industry" width="100%" />
              </ChartFrame>
            </Section>
          {/if}
        </div>

        {#if !nameAndSecurityTypeEmpty}
          <div class="min-w-0">
            <Section title="Security">
              <ChartFrame type="distribution">
                <div
                  id="d3-portfolio-treemap"
                  style="width: 100%; position: relative"
                ></div>
                <svg id="d3-portfolio" width="100%" />
              </ChartFrame>
            </Section>
          </div>
        {/if}
      </div>
    </div>
  </div>
</Page>
