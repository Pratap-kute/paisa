<script lang="ts">
  import COLORS, {
    generateColorScheme,
    genericBarColor,
  } from "$lib/core/colors";
  import { renderAccountOverview, buildLegends } from "$lib/charts/gain";
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
  import { onMount, onDestroy } from "svelte";
  import type { PageData } from "./$types";

  import LevelItem from "$lib/components/ui/LevelItem.svelte";
  import { iconify } from "$lib/core/icon";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import MetricStrip from "$lib/components/layout/MetricStrip.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";

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

  let destroyCallback = () => {};
  let postings: Posting[] = $state([]);

  let securityTypeR: any = $state(),
    portfolioR: any = $state(),
    industryR: any = $state(),
    ratingR: any = $state(null);

  onDestroy(async () => {
    destroyCallback();
  });

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
    destroyCallback = renderAccountOverview(
      gain.networthTimeline,
      gain.postings,
      "d3-account-timeline-breakdown",
    );

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

<Page width="fluid">
  <PageHeader
    title={data.name || "Asset Gain"}
    description="Account performance, asset allocation, and transaction history"
  />

  <div class="paisa-gain-slug-layout">
    <!-- Side Context Panel: Metrics + Postings -->
    <div class="paisa-gain-slug-side">
      {#if overview}
        <Section title="Overview">
          <MetricStrip cols={2}>
            <LevelItem
              narrow
              title="Balance"
              value={formatCurrency(overview.balanceAmount)}
            />
            <LevelItem
              narrow
              title="Net Investment"
              value={formatCurrency(overview.netInvestmentAmount)}
            />
            <LevelItem
              narrow
              title="Gain / Loss"
              color={overview.gainAmount >= 0
                ? COLORS.gainText
                : COLORS.lossText}
              value={formatCurrency(overview.gainAmount)}
            />
            <LevelItem
              narrow
              title="XIRR"
              value={formatFloat(gain.xirr)}
              subtitle={assetBreakdown
                ? `${formatPercentage(assetBreakdown.absoluteReturn, 2)} absolute return`
                : ""}
            />
          </MetricStrip>
        </Section>
      {/if}

      <Section title="Postings">
        <div class="paisa-postings-list">
          {#each postings as posting}
            <a
              class="paisa-posting-row"
              href={postingUrl(posting)}
              style="--paisa-row-accent: {posting.amount >= 0
                ? posting.account.startsWith('Income:CapitalGains')
                  ? COLORS.loss
                  : COLORS.secondary
                : posting.account.startsWith('Income:CapitalGains')
                  ? COLORS.gain
                  : COLORS.tertiary}"
            >
              <span class="paisa-posting-main">
                <span class="paisa-posting-payee">{posting.payee}</span>
                <span class="paisa-posting-date"
                  >{posting.date.format("DD MMM YYYY")}</span
                >
              </span>
              <span class="paisa-posting-meta">
                <span class="paisa-posting-account custom-icon">
                  {iconify(restName(posting.account), {
                    group: firstName(posting.account),
                  })}
                </span>
                <span class="paisa-posting-amount"
                  >{formatCurrency(posting.amount)}</span
                >
              </span>
            </a>
          {/each}
        </div>
      </Section>
    </div>

    <!-- Main Analysis Panel: Timeline + Portfolio breakdown -->
    <div class="paisa-gain-slug-main">
      {#if overview}
        <Section>
          <div class="paisa-gain-snapshot-bar">
            <span class="custom-icon is-size-5">{iconify(data.name)}</span>
            <div class="paisa-gain-meta-item">
              <span class="paisa-gain-meta-label">Investment</span>
              <span class="has-text-weight-bold"
                >{formatCurrency(overview.investmentAmount)}</span
              >
            </div>
            <div class="paisa-gain-meta-item">
              <span class="paisa-gain-meta-label">Withdrawal</span>
              <span class="has-text-weight-bold"
                >{formatCurrency(overview.withdrawalAmount)}</span
              >
            </div>
            {#if overview.balanceUnits > 0}
              <div class="paisa-gain-meta-item">
                <span class="paisa-gain-meta-label">Balance Units</span>
                <span class="has-text-weight-bold"
                  >{formatFloatUptoPrecision(overview.balanceUnits, 4)}</span
                >
              </div>
            {/if}
          </div>
        </Section>
      {/if}

      <Section title="Timeline">
        <LegendCard {legends} clazz="mb-3 paisa-overflow-x-auto" />
        <ChartFrame type="timeline" onresize={() => {
          document.getElementById("d3-account-timeline-breakdown")?.replaceChildren();
          if (gain) {
            destroyCallback = renderAccountOverview(
              gain.networthTimeline,
              gain.postings,
              "d3-account-timeline-breakdown",
            );
          }
        }}>
          <svg id="d3-account-timeline-breakdown" width="100%" height="450" />
        </ChartFrame>
      </Section>

      <div class="paisa-portfolio-breakdown-grid">
        <div class="paisa-portfolio-sub-charts">
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
          <div class="paisa-portfolio-security-chart">
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

<style lang="scss">
  .paisa-gain-slug-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--paisa-space-5);
    width: 100%;

    @media screen and (min-width: 1024px) {
      grid-template-columns: minmax(280px, 1fr) minmax(0, 3fr);
    }
  }

  .paisa-gain-slug-side,
  .paisa-gain-slug-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--paisa-space-4);
  }

  .paisa-postings-list {
    display: flex;
    flex-direction: column;
    gap: var(--paisa-space-2);
    max-height: min(720px, calc(100vh - 300px));
    min-height: 280px;
    overflow-y: auto;
    padding-right: var(--paisa-space-1);

    @media screen and (max-width: 1023px) {
      max-height: 400px;
      min-height: 0;
    }
  }

  .paisa-posting-row {
    display: flex;
    flex-direction: column;
    gap: var(--paisa-space-1);
    min-height: 54px;
    padding: var(--paisa-space-2) var(--paisa-space-3);
    border-left: 2px solid var(--paisa-row-accent);
    border-radius: var(--paisa-radius-md);
    border-top: 1px solid var(--paisa-border-default);
    border-right: 1px solid var(--paisa-border-default);
    border-bottom: 1px solid var(--paisa-border-default);
    background: var(--paisa-surface-card);
    color: var(--paisa-text-secondary);
    text-decoration: none;
  }

  .paisa-posting-row:hover {
    border-color: var(--paisa-border-strong);
    color: var(--paisa-text-primary);
  }

  .paisa-posting-main,
  .paisa-posting-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--paisa-space-2);
    min-width: 0;
  }

  .paisa-posting-payee,
  .paisa-posting-account {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .paisa-posting-payee {
    font-size: var(--paisa-font-size-xs);
    color: var(--paisa-text-secondary);
  }

  .paisa-posting-date,
  .paisa-posting-account {
    flex: 0 0 auto;
    font-size: var(--paisa-font-size-xs);
    color: var(--paisa-text-muted);
  }

  .paisa-posting-account {
    flex: 1 1 auto;
  }

  .paisa-posting-amount {
    flex: 0 0 auto;
    font-weight: var(--paisa-font-weight-semibold);
    color: var(--paisa-text-primary);
  }

  .paisa-gain-snapshot-bar {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-4);
    padding: var(--paisa-space-3) var(--paisa-space-4);
    background: var(--paisa-surface-card);
    border: 1px solid var(--paisa-border-subtle);
    border-radius: var(--paisa-radius-md);
    flex-wrap: wrap;
  }

  .paisa-gain-meta-item {
    display: flex;
    align-items: baseline;
    gap: var(--paisa-space-2);
  }

  .paisa-gain-meta-label {
    font-size: var(--paisa-font-size-xs);
    color: var(--paisa-text-muted);
  }

  .paisa-portfolio-breakdown-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--paisa-space-4);

    @media screen and (min-width: 1024px) {
      grid-template-columns: 1fr 1fr;
    }
  }

  .paisa-portfolio-sub-charts,
  .paisa-portfolio-security-chart {
    min-width: 0;
  }
</style>
