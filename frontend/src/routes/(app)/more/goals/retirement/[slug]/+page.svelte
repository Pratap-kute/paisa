<script lang="ts">
  import COLORS from "$lib/core/colors";
  import {
    ajax,
    formatCurrency,
    formatFloat,
    type AssetBreakdown,
    type Forecast,
    type Point,
    type Posting,
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
    renderInvestmentTimeline,
  } from "$lib/domain/goals";
  import type { PageData } from "./$types";
  import { iconGlyph } from "$lib/core/icon";
  import _ from "lodash";
  import PostingGroup from "$lib/components/transactions/PostingGroup.svelte";
  import { iconify } from "$lib/core/icon";
  import ProgressWithBreakpoints from "$lib/components/ui/ProgressWithBreakpoints.svelte";
  import AssetsBalance from "$lib/components/finance/AssetsBalance.svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import MetricStrip from "$lib/components/layout/MetricStrip.svelte";
  import Metric from "$lib/components/layout/Metric.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  let svg: Element | undefined = $state();
  let investmentTimelineSvg: Element | undefined = $state();
  let savingsTotal = $state(0),
    investmentTotal = $state(0),
    gainTotal = $state(0),
    icon = $state(""),
    name = $state(""),
    targetSavings = $state(0),
    swr = $state(0),
    xirr = $state(0),
    yearlyExpense = $state(0),
    progressPercent = $state(0),
    savingsX = $state(0),
    targetX = $state(0),
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
    renderInvestmentTimeline(postings, investmentTimelineSvg, 0);
  }

  onMount(async () => {
    ({
      savingsTotal,
      investmentTotal,
      gainTotal,
      savingsTimeline,
      yearlyExpense,
      swr,
      xirr,
      icon,
      name,
      postings,
      balances,
    } = await ajax("/api/goals/retirement/:name", null as any, data as Record<string, string>));
    targetSavings = yearlyExpense * (100 / swr);

    latestPostings = _.chain(postings)
      .sortBy((p: Posting) => p.date)
      .reverse()
      .take(100)
      .value();

    if (yearlyExpense > 0) {
      progressPercent = (savingsTotal / targetSavings) * 100;
      savingsX = savingsTotal / yearlyExpense;
      targetX = targetSavings / yearlyExpense;
    }

    if (targetX <= 0 || savingsX <= 0 || yearlyExpense <= 0) {
      return;
    }

    const ARIMA = await ARIMAPromise;
    predictionsTimeline = forecast(savingsTimeline, targetSavings, ARIMA);
    await tick();
    breakPoints = findBreakPoints(
      savingsTimeline.concat(predictionsTimeline),
      targetSavings,
    );
    repaintProgressChart();
    repaintInvestmentChart();
  });
</script>

<svelte:head>
  <title>{name || "Retirement Goal"} - Paisa</title>
</svelte:head>

<Page width="fluid">
  <PageHeader
    title="{iconGlyph(icon)} {name}"
    description="Retirement goal tracking, forecast, and portfolio health"
  >
    {#snippet leading()}
      <a
        href="/more/goals"
        class="inline-flex items-center gap-1 text-sm text-[var(--paisa-muted-foreground)] transition-colors hover:text-[var(--paisa-foreground)]"
      >
        <i class="fas fa-chevron-left text-xs" aria-hidden="true"></i>
        <span>Goals</span>
      </a>
    {/snippet}
  </PageHeader>

  <MetricStrip cols={4}>
    <Metric
      label="Net Investment"
      value={formatCurrency(investmentTotal)}
      secondary={`${formatCurrency(gainTotal)} ${gainTotal >= 0 ? "gain" : "loss"} at ${formatFloat(xirr)} XIRR`}
      status="primary"
    />
    <Metric
      label="Current Savings"
      value={formatCurrency(savingsTotal)}
      secondary="{formatFloat(savingsX, 0)}x times Yearly Expenses"
      status="positive"
    />
    <Metric
      label="Yearly Expenses"
      value={formatCurrency(yearlyExpense)}
      status="negative"
    />
    <Metric
      label="Target Savings"
      value={formatCurrency(targetSavings)}
      secondary="{formatFloat(targetX, 0)}x times Yearly Expenses (SWR {formatFloat(swr)})"
      status="primary"
    />
  </MetricStrip>

  <Section>
    <ProgressWithBreakpoints {progressPercent} {breakPoints} />
  </Section>

  <div
    class="paisa-goal-detail-layout grid w-full grid-cols-1 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]"
  >
    <div class="paisa-goal-detail-main flex min-w-0 flex-col gap-4">
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
        <div class="text-[var(--paisa-muted-foreground)]">
          <AssetsBalance breakdowns={balances} indent={false} />
        </div>
      </Section>
    </div>

    <div class="paisa-goal-detail-side flex min-w-0 flex-col gap-4">
      <Section title="Recent Postings">
        <PostingGroup postings={latestPostings} groupFormat="MMM YYYY">
          {#snippet children({ groupedPostings })}
            <div>
              {#each groupedPostings as posting}
                <a
                  class="paisa-posting-row mb-2 flex min-h-[54px] flex-col gap-1 rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-default)] bg-[var(--paisa-surface-card)] px-3 py-2 text-[var(--paisa-text-secondary)] no-underline transition-colors hover:border-[var(--paisa-border-strong)] hover:text-[var(--paisa-text-primary)]"
                  href={postingUrl(posting)}
                  style="border-left: 2px solid {posting.amount >= 0
                    ? posting.account.startsWith('Income:CapitalGains')
                      ? COLORS.tertiary
                      : COLORS.secondary
                    : posting.account.startsWith('Income:CapitalGains')
                      ? COLORS.secondary
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
          {/snippet}
        </PostingGroup>
      </Section>
    </div>
  </div>
</Page>
