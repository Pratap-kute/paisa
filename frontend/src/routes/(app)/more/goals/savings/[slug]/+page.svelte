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
    type AssetBreakdown,
    firstName,
    restName,
    postingUrl,
  } from "$lib/core/utils";
  import { onMount, tick, onDestroy } from "svelte";
  import ARIMAPromise from "arima/async";
  import {
    forecast,
    renderProgress,
    findBreakPoints,
    project,
    solvePMTOrNper,
    renderInvestmentTimeline,
  } from "$lib/domain/goals";
  import _ from "lodash";
  import LevelItem from "$lib/components/ui/LevelItem.svelte";
  import type { PageData } from "./$types";
  import PostingGroup from "$lib/components/transactions/PostingGroup.svelte";
  import { iconGlyph, iconify } from "$lib/core/icon";
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

  let svg: Element | undefined = $state();
  let investmentTimelineSvg: Element | undefined = $state();
  let targetDateObject: dayjs.Dayjs | undefined = $state();
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
    destroyCallback = () => {},
    predictionsTimeline: Forecast[] = [];

  onDestroy(async () => {
    destroyCallback();
  });

  function repaintProgressChart() {
    if (!svg || _.isEmpty(savingsTimeline)) return;
    destroyCallback();
    svg.replaceChildren();
    destroyCallback = renderProgress(
      savingsTimeline,
      predictionsTimeline,
      breakPoints,
      svg,
      { targetSavings },
    );
  }

  function repaintInvestmentChart() {
    if (!investmentTimelineSvg || _.isEmpty(postings)) return;
    investmentTimelineSvg.replaceChildren();
    renderInvestmentTimeline(postings, investmentTimelineSvg, pmt);
  }

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
      balances,
    } = await ajax("/api/goals/savings/:name", null as any, data as Record<string, string>));

    savingsTimeline = savingsTimeline || [];
    postings = postings || [];
    balances = balances || {};

    latestPostings = _.chain(postings)
      .sortBy((p: Posting) => p.date)
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
      targetDate,
    ));

    predictionsTimeline = [];
    targetDateObject = dayjs(targetDate, "YYYY-MM-DD", true);
    if (targetDateObject.isValid()) {
      predictionsTimeline = project(
        targetSavings,
        rate,
        targetDateObject,
        pmt,
        savingsTotal,
      );
    } else if (savingsTotal < targetSavings && !_.isEmpty(savingsTimeline)) {
      const ARIMA = await ARIMAPromise;
      predictionsTimeline = forecast(savingsTimeline, targetSavings, ARIMA);
    }

    await tick();
    breakPoints = findBreakPoints(
      savingsTimeline.concat(predictionsTimeline),
      targetSavings,
    );
    repaintProgressChart();
    repaintInvestmentChart();
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
      subtitle={targetDateObject?.isValid()
        ? targetDateObject.format("DD MMM YYYY")
        : undefined}
    />

    {#if pmt > 0}
      <LevelItem
        title="Monthly Investment needed"
        value={formatCurrency(pmt)}
        color={COLORS.secondary}
        subtitle={rate > 0
          ? `Expected <b>${formatFloat(rate, 2)}</b> rate of return`
          : undefined}
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
        <ChartFrame type="timeline" onresize={repaintProgressChart}>
          <svg height="400" width="100%" bind:this={svg} />
        </ChartFrame>
      </Section>

      <Section title="Monthly Investment">
        <ChartFrame type="timeline" onresize={repaintInvestmentChart}>
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
                <a
                  class="paisa-posting-row"
                  href={postingUrl(posting)}
                  style="--paisa-row-accent: {posting.amount >= 0
                    ? posting.account.startsWith('Income:CapitalGains')
                      ? COLORS.tertiary
                      : COLORS.secondary
                    : posting.account.startsWith('Income:CapitalGains')
                      ? COLORS.secondary
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
    margin-bottom: var(--paisa-space-2);
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
</style>
