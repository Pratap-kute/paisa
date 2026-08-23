<script lang="ts">
  import COLORS from "$lib/core/colors";
  import {
    ajax,
    formatCurrency,
    formatFloat,
    type Forecast,
    type Point,
    type Posting,
    type AssetBreakdown,
    firstName,
    restName,
    postingUrl,
  } from "$lib/core/utils";
  import { onMount } from "svelte";
  import ARIMAPromise from "arima/async";
  import {
    forecast,
    findBreakPoints,
    project,
    solvePMTOrNper,
  } from "$lib/domain/goals";
  import _ from "lodash";
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
  import Metric from "$lib/components/layout/Metric.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";
  import GoalProgressChart from "$lib/components/charts/GoalProgressChart.svelte";
  import GoalInvestmentChart from "$lib/components/charts/GoalInvestmentChart.svelte";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

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
    savingsTimeline: Point[] = $state([]),
    postings: Posting[] = $state([]),
    latestPostings: Posting[] = $state([]),
    balances: Record<string, AssetBreakdown> = $state({}),
    predictionsTimeline: Forecast[] = $state([]);

  let remainingAmount = $derived(Math.max(targetSavings - savingsTotal, 0));
  let projectedCompletion = $derived(
    targetDateObject?.isValid()
      ? targetDateObject.format("DD MMM YYYY")
      : pmt > 0
        ? "Based on monthly target"
        : "Not projected",
  );

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

    let nextPredictions: Forecast[] = [];
    targetDateObject = dayjs(targetDate, "YYYY-MM-DD", true);
    if (targetDateObject.isValid()) {
      nextPredictions = project(
        targetSavings,
        rate,
        targetDateObject,
        pmt,
        savingsTotal,
      );
    } else if (savingsTotal < targetSavings && !_.isEmpty(savingsTimeline)) {
      const ARIMA = await ARIMAPromise;
      nextPredictions = forecast(savingsTimeline, targetSavings, ARIMA);
    }

    const nextBreakPoints = findBreakPoints(
      savingsTimeline.concat(nextPredictions),
      targetSavings,
    );
    predictionsTimeline = nextPredictions;
    breakPoints = nextBreakPoints;
  });
</script>

<svelte:head>
  <title>{name || "Savings Goal"} - Paisa</title>
</svelte:head>

<Page width="fluid">
  <PageHeader
    title="{iconGlyph(icon)} {name}"
    description="Savings target tracking, timeline, and balance"
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
      label="Target Amount"
      value={formatCurrency(targetSavings)}
      secondary={targetDateObject?.isValid()
        ? targetDateObject.format("DD MMM YYYY")
        : undefined}
      status="primary"
    />
    <Metric
      label="Current Savings"
      value={formatCurrency(savingsTotal)}
      secondary="{formatFloat(xirr)} XIRR"
      status="positive"
    />
    <Metric
      label="Remaining Amount"
      value={formatCurrency(remainingAmount)}
      status={remainingAmount > 0 ? "warning" : "positive"}
    />
    <Metric
      label="Projected Completion"
      value={projectedCompletion}
      secondary={pmt > 0
        ? `${formatCurrency(pmt)} monthly target`
        : rate > 0
          ? `${formatFloat(rate, 2)} expected return`
          : undefined}
    />
  </MetricStrip>

  {#if pmt > 0}
    <MetricStrip cols={2}>
      <Metric
        label="Net Investment"
        value={formatCurrency(investmentTotal)}
        secondary={`${formatCurrency(gainTotal)} ${gainTotal >= 0 ? "gain" : "loss"}`}
      />
      <Metric
        label="Monthly Investment Needed"
        value={formatCurrency(pmt)}
        secondary={rate > 0
          ? `${formatFloat(rate, 2)} expected rate of return`
          : undefined}
        status="primary"
      />
    </MetricStrip>
  {/if}

  <Section>
    <ProgressWithBreakpoints {progressPercent} {breakPoints} />
  </Section>

  <div
    class="paisa-goal-detail-layout grid w-full grid-cols-1 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]"
  >
    <div class="paisa-goal-detail-main flex min-w-0 flex-col gap-4">
      <Section title="{iconGlyph(icon)} {name} Progress">
        <ChartFrame height="tall">
          <GoalProgressChart
            points={savingsTimeline}
            predictions={predictionsTimeline}
            {breakPoints}
            {targetSavings}
            ariaLabel="{name} savings goal progress timeline"
            testId="savings-goal-progress-echart"
          />
        </ChartFrame>
      </Section>

      <Section title="Monthly Investment">
        <ChartFrame height="tall">
          <GoalInvestmentChart
            {postings}
            {pmt}
            testId="savings-goal-investment-echart"
          />
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
