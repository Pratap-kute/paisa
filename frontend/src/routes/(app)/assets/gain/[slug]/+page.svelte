<script lang="ts">
  import { run } from 'svelte/legacy';

  import COLORS, { generateColorScheme, genericBarColor } from "$lib/core/colors";
  import { renderAccountOverview, buildLegends } from "$lib/charts/gain";
  import { filterCommodityBreakdowns, renderPortfolioBreakdown } from "$lib/charts/portfolio";
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
    formatFloatUptoPrecision
  } from "$lib/core/utils";
  import _ from "lodash";
  import { onMount, onDestroy } from "svelte";
  import type { PageData } from "./$types";
  import PostingCard from "$lib/components/transactions/PostingCard.svelte";
  import LevelItem from "$lib/components/ui/LevelItem.svelte";
  import { iconify } from "$lib/core/icon";
  import BoxLabel from "$lib/components/ui/BoxLabel.svelte";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";

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
      portfolio_allocation: { name_and_security_type, security_type, rating, industry, commodities }
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
      "d3-account-timeline-breakdown"
    );

    selectedCommodities = [...commodities];
    ({ renderer: securityTypeR } = renderPortfolioBreakdown(
      "#d3-portfolio-security-type",
      security_type,
      {
        small: true
      }
    ));
    ({ renderer: ratingR } = renderPortfolioBreakdown("#d3-portfolio-security-rating", rating, {
      small: true
    }));
    ({ renderer: industryR } = renderPortfolioBreakdown(
      "#d3-portfolio-security-industry",
      industry,
      {
        small: true,
        z: [genericBarColor()]
      }
    ));
    ({ renderer: portfolioR } = renderPortfolioBreakdown("#d3-portfolio", name_and_security_type, {
      small: true
    }));

    if (commodities.length !== 0) {
      color = generateColorScheme(commodities);
    }

    securityTypeEmpty = security_type.length === 0;
    nameAndSecurityTypeEmpty = name_and_security_type.length === 0;
    ratingEmpty = rating.length === 0;
    industryEmpty = industry.length === 0;
  });

  run(() => {
    if (securityTypeR && ratingR && industryR && portfolioR) {
      securityTypeR(filterCommodityBreakdowns(security_type, selectedCommodities), color);
      ratingR(filterCommodityBreakdowns(rating, selectedCommodities), color);
      industryR(filterCommodityBreakdowns(industry, selectedCommodities), color);
      portfolioR(filterCommodityBreakdowns(name_and_security_type, selectedCommodities), color);
    }
  });
</script>

<section class="section">
  <div class="container is-fluid">
    <div class="columns is-flex-wrap-wrap">
      <div class="column is-3">
        <div class="columns is-flex-wrap-wrap">
          {#if overview}
            <div class="column is-full">
              <div>
                <nav class="level grid-2">
                  <LevelItem
                    narrow
                    title="Balance"
                    color={COLORS.primary}
                    value={formatCurrency(overview.balanceAmount)}
                  />
                  <LevelItem
                    narrow
                    title="Net Investment"
                    color={COLORS.secondary}
                    value={formatCurrency(overview.netInvestmentAmount)}
                  />
                </nav>
              </div>
            </div>
            <div class="column is-full">
              <div>
                <nav class="level grid-2">
                  <LevelItem
                    narrow
                    title="Gain / Loss"
                    color={overview.gainAmount >= 0 ? COLORS.gainText : COLORS.lossText}
                    value={formatCurrency(overview.gainAmount)}
                  />

                  <LevelItem
                    narrow
                    title="XIRR"
                    value={formatFloat(gain.xirr)}
                    subtitle="{formatPercentage(assetBreakdown.absoluteReturn, 2)} absolute return"
                  />
                </nav>
              </div>
            </div>
          {/if}

          <div class="column is-full">
            Postings
            {#each postings as posting}
              <PostingCard
                {posting}
                color={posting.amount >= 0
                  ? posting.account.startsWith("Income:CapitalGains")
                    ? COLORS.loss
                    : COLORS.secondary
                  : posting.account.startsWith("Income:CapitalGains")
                    ? COLORS.gain
                    : COLORS.tertiary}
              />
            {/each}
          </div>
        </div>
      </div>
      <div class="column is-9">
        {#if overview}
          <div class="box py-2 mb-4 mt-0">
            <div class="is-flex mr-2 is-align-items-baseline" style="min-width: fit-content">
              <div class="ml-3 custom-icon is-size-5">
                <span>{iconify(data.name)}</span>
              </div>
              <div class="ml-3">
                <span class="mr-1 is-size-7 has-text-grey">Investment</span>
                <span class="has-text-weight-bold">{formatCurrency(overview.investmentAmount)}</span
                >
              </div>
              <div class="ml-3">
                <span class="mr-1 is-size-7 has-text-grey">Withdrawal</span>
                <span class="has-text-weight-bold">{formatCurrency(overview.withdrawalAmount)}</span
                >
              </div>
              {#if overview.balanceUnits > 0}
                <div class="ml-3">
                  <span class="mr-1 is-size-7 has-text-grey">Balance Units</span>
                  <span class="has-text-weight-bold"
                    >{formatFloatUptoPrecision(overview.balanceUnits, 4)}</span
                  >
                </div>
              {/if}
            </div>
          </div>
        {/if}
        <LegendCard {legends} clazz="mb-2" />
        <div class="box">
          <svg id="d3-account-timeline-breakdown" width="100%" height="450" />
        </div>
        <BoxLabel text="Timeline" />

        <div class="columns">
          <div class="column is-6">
            <div class="mt-5" class:is-hidden={securityTypeEmpty}>
              <div class="box paisa-overflow-x-auto">
                <div
                  id="d3-portfolio-security-type-treemap"
                  style="width: 100%; position: relative"></div>
                <svg id="d3-portfolio-security-type" width="100%" />
              </div>
              <BoxLabel text="Security Type" />
            </div>

            <div class="mt-5" class:is-hidden={ratingEmpty}>
              <div class="box paisa-overflow-x-auto">
                <div
                  id="d3-portfolio-security-rating-treemap"
                  style="width: 100%; position: relative"></div>
                <svg id="d3-portfolio-security-rating" width="100%" />
              </div>
              <BoxLabel text="Security Rating" />
            </div>

            <div class="mt-5" class:is-hidden={industryEmpty}>
              <div class="box paisa-overflow-x-auto">
                <div
                  id="d3-portfolio-security-industry-treemap"
                  style="width: 100%; position: relative"></div>
                <svg id="d3-portfolio-security-industry" width="100%" />
              </div>
              <BoxLabel text="Industry" />
            </div>
          </div>
          <div class="column is-6 mt-5">
            <div class:is-hidden={nameAndSecurityTypeEmpty}>
              <div class="box paisa-overflow-x-auto">
                <div id="d3-portfolio-treemap" style="width: 100%; position: relative"></div>
                <svg id="d3-portfolio" width="100%" />
              </div>
              <BoxLabel text="Security" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
