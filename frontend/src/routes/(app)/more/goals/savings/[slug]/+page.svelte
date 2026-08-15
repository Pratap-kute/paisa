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
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import MetricStrip from "$lib/components/layout/MetricStrip.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";

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

<Page width="fluid">
  <PageHeader
    title="{iconGlyph(icon)} {name}"
    description="Savings goal progress, monthly target, and investments"
  />

  <MetricStrip cols="auto">
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
  </MetricStrip>

  <Section>
    <ProgressWithBreakpoints {progressPercent} {breakPoints} />
  </Section>

  <div class="paisa-goal-detail-layout">
    <!-- Main Content Panel -->
    <div class="paisa-goal-detail-main">
      <Section title="{iconGlyph(icon)} {name} Progress">
        <ChartFrame type="timeline">
          <svg height="400" width="100%" bind:this={svg} />
        </ChartFrame>
      </Section>

      <Section title="Monthly Investment">
        <ChartFrame type="timeline">
          <svg height="300" width="100%" bind:this={investmentTimelineSvg} />
        </ChartFrame>
      </Section>

      <Section title="Current Balance">
        <div class="has-text-grey">
          <AssetsBalance breakdowns={balances} indent={false} />
        </div>
      </Section>
    </div>

    <!-- Side Postings Panel -->
    <div class="paisa-goal-detail-side">
      <Section title="Recent Postings">
        <PostingGroup postings={latestPostings} groupFormat="MMM YYYY">
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
      </Section>
    </div>
  </div>
</Page>

<style lang="scss">
  .paisa-goal-detail-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--paisa-space-5);
    width: 100%;

    @media screen and (min-width: 1024px) {
      grid-template-columns: minmax(0, 3fr) minmax(280px, 1fr);
    }
  }

  .paisa-goal-detail-main,
  .paisa-goal-detail-side {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--paisa-space-4);
  }
</style>
