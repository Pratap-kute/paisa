<script lang="ts">
  import COLORS from "$lib/core/colors";
  import {
    ajax,
    formatCurrency,
    formatFloat,
    isMobile,
    type Forecast,
    type Point,
    type Posting,
    type AssetBreakdown
  } from "$lib/core/utils";
  import { onMount, tick, onDestroy } from "svelte";
  import ARIMAPromise from "arima/async";
  import {
    forecast,
    renderProgress,
    findBreakPoints,
    project,
    solvePMTOrNper,
    renderInvestmentTimeline
  } from "$lib/domain/goals";
  import _ from "lodash";
  import LevelItem from "$lib/components/ui/LevelItem.svelte";
  import type { PageData } from "./$types";
  import PostingCard from "$lib/components/transactions/PostingCard.svelte";
  import PostingGroup from "$lib/components/transactions/PostingGroup.svelte";
  import { iconGlyph } from "$lib/core/icon";
  import dayjs from "dayjs";
  import ProgressWithBreakpoints from "$lib/components/ui/ProgressWithBreakpoints.svelte";
  import AssetsBalance from "$lib/components/finance/AssetsBalance.svelte";
  import BoxLabel from "$lib/components/ui/BoxLabel.svelte";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  let svg: Element = $state();
  let investmentTimelineSvg: Element = $state();
  let targetDateObject: dayjs.Dayjs = $state();
  let savingsTotal = $state(0),
    investmentTotal = $state(0),
    gainTotal = $state(0),
    targetSavings = $state(0),
    pmt = $state(0),
    xirr = $state(0),
    rate = $state(0),
    paymentPerPeriod = 0,
    targetDate = "",
    name = $state(""),
    icon = $state(""),
    progressPercent = $state(0),
    breakPoints: Point[] = $state([]),
    savingsTimeline: Point[] = [],
    postings: Posting[] = [],
    latestPostings: Posting[] = $state([]),
    balances: Record<string, AssetBreakdown> = $state({}),
    destroyCallback = () => {};

  onDestroy(async () => {
    destroyCallback();
  });

  onMount(async () => {
    ({
      savingsTotal,
      investmentTotal,
      gainTotal,
      savingsTimeline,
      target: targetSavings,
      rate,
      targetDate,
      postings,
      icon,
      name,
      xirr,
      paymentPerPeriod,
      balances
    } = await ajax("/api/goals/savings/:name", null, data));

    savingsTimeline = savingsTimeline || [];
    postings = postings || [];
    balances = balances || {};

    latestPostings = _.chain(postings)
      .sortBy((p) => p.date)
      .reverse()
      .take(100)
      .value();

    if (targetSavings != 0) {
      progressPercent = (savingsTotal / targetSavings) * 100;
    }

    ({ pmt, targetDate } = solvePMTOrNper(
      targetSavings,
      rate,
      savingsTotal,
      paymentPerPeriod,
      targetDate
    ));

    let predictionsTimeline: Forecast[] = [];
    targetDateObject = dayjs(targetDate, "YYYY-MM-DD", true);
    if (targetDateObject.isValid()) {
      predictionsTimeline = project(targetSavings, rate, targetDateObject, pmt, savingsTotal);
    } else if (savingsTotal < targetSavings && !_.isEmpty(savingsTimeline)) {
      const ARIMA = await ARIMAPromise;
      predictionsTimeline = forecast(savingsTimeline, targetSavings, ARIMA);
    }

    await tick();
    breakPoints = findBreakPoints(savingsTimeline.concat(predictionsTimeline), targetSavings);
    destroyCallback = renderProgress(savingsTimeline, predictionsTimeline, breakPoints, svg, {
      targetSavings
    });

    renderInvestmentTimeline(postings, investmentTimelineSvg, pmt);
  });
</script>

<section class="section">
  <div class="container is-fluid">
    <nav class="level custom-icon {isMobile() && 'grid-2'}">
      <LevelItem title={name} value={iconGlyph(icon)} />
      <LevelItem
        title="Net Investment"
        value={formatCurrency(investmentTotal)}
        color={COLORS.secondary}
        subtitle={`<b>${formatCurrency(gainTotal)}</b> ${gainTotal >= 0 ? "gain" : "loss"}`}
      />

      <LevelItem
        title="Current Savings"
        value={formatCurrency(savingsTotal)}
        color={COLORS.gainText}
        subtitle={`<b>${formatFloat(xirr)}</b> XIRR`}
      />

      <LevelItem
        title="Target Savings"
        value={formatCurrency(targetSavings)}
        color={COLORS.primary}
        subtitle={targetDateObject?.isValid() ? targetDateObject.format("DD MMM YYYY") : null}
      />

      {#if pmt > 0}
        <LevelItem
          title="Monthly Investment needed"
          value={formatCurrency(pmt)}
          color={COLORS.secondary}
          subtitle={rate > 0 ? `Expected <b>${formatFloat(rate, 2)}</b> rate of return` : null}
        />
      {/if}
    </nav>
  </div>
</section>

<section class="section">
  <div class="container is-fluid">
    <ProgressWithBreakpoints {progressPercent} {breakPoints} />
  </div>
</section>

<section class="section tab-retirement-progress">
  <div class="container is-fluid">
    <div class="columns">
      <div class="column is-9">
        <div class="columns is-flex-wrap-wrap">
          <div class="column is-12">
            <div class="box paisa-overflow-x-auto">
              <svg height="400" bind:this={svg} />
            </div>
          </div>
        </div>
        <BoxLabel text="{iconGlyph(icon)} {name} progress" />
        <div class="columns">
          <div class="column is-12">
            <div class="box paisa-overflow-x-auto">
              <svg height="300" width="100%" bind:this={investmentTimelineSvg} />
            </div>
          </div>
        </div>
        <BoxLabel text="Monthly Investment" />
        <div class="columns">
          <div class="column is-12 has-text-grey">
            <AssetsBalance breakdowns={balances} indent={false} />
          </div>
        </div>
        <BoxLabel text="Current Balance" />
      </div>
      <div class="column is-3">
        <PostingGroup postings={latestPostings} groupFormat="MMM YYYY" >
          {#snippet children({ groupedPostings })}
                    <div>
              {#each groupedPostings as posting}
                <PostingCard
                  {posting}
                  color={posting.amount >= 0
                    ? posting.account.startsWith("Income:CapitalGains")
                      ? COLORS.tertiary
                      : COLORS.secondary
                    : posting.account.startsWith("Income:CapitalGains")
                      ? COLORS.secondary
                      : COLORS.tertiary}
                />
              {/each}
            </div>
                            {/snippet}
                </PostingGroup>
      </div>
    </div>
  </div>
</section>
