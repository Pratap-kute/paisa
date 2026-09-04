<script lang="ts">
import { api } from "$lib/api";
import { formatCurrency } from "$lib/shared/formatters/currency";
import { formatFloat } from "$lib/shared/formatters/currency";
import type { Forecast, SavingsGoalProgress } from "$lib/domain/goals_models";
import type { Point } from "$lib/domain/goals_models";
import type { Posting } from "$lib/domain/ledger";
import type { AssetBreakdown } from "$lib/domain/assets";
import { onMount } from "svelte";
import ARIMAPromise from "arima/async";
import {
  findBreakPoints,
  forecast,
  project,
  solvePMTOrNper,
} from "$lib/domain/goals";
import type { PageData } from "./$types";
import dayjs from "dayjs";
import ProgressWithBreakpoints from "$lib/shared/ui/ProgressWithBreakpoints.svelte";
import AssetsBalance from "$lib/features/assets/components/AssetsBalance.svelte";
import Page from "$lib/shared/layout/Page.svelte";
import PageHeader from "$lib/shared/layout/PageHeader.svelte";
import Section from "$lib/shared/layout/Section.svelte";
import MetricStrip from "$lib/shared/layout/MetricStrip.svelte";
import Metric from "$lib/shared/layout/Metric.svelte";
import ChartFrame from "$lib/shared/ui/ChartFrame.svelte";
import GoalProgressChart from "$lib/features/goals/components/GoalProgressChart.svelte";
import GoalInvestmentChart from "$lib/features/goals/components/GoalInvestmentChart.svelte";
import GoalRecentPostings from "$lib/features/goals/components/GoalRecentPostings.svelte";
import { isEmpty, sortBy } from "$lib/shared/utils/collection";

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
  } = await api.goals.getGoalDetails(
    "savings",
    data.name,
  ) as unknown as SavingsGoalProgress);

  savingsTimeline = savingsTimeline || [];
  postings = postings || [];
  balances = balances || {};

  latestPostings = sortBy(postings, (p: Posting) => p.date)
    .reverse()
    .slice(0, 12);

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
  } else if (savingsTotal < targetSavings && !isEmpty(savingsTimeline)) {
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
    title={name}
    titleIcon={icon}
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
    class="paisa-goal-detail-layout grid w-full grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)] xl:grid-cols-[minmax(0,5fr)_minmax(20rem,2fr)]"
  >
    <div class="paisa-goal-detail-main flex min-w-0 flex-col gap-4">
      <Section title="{name} Progress" titleIcon={icon}>
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

    <div class="paisa-goal-detail-side min-w-0 lg:sticky lg:top-20">
      <GoalRecentPostings postings={latestPostings} totalCount={postings.length} />
    </div>
  </div>
</Page>
