<script lang="ts">
import { api } from "$lib/api";
import { formatCurrency } from "$lib/shared/formatters/currency";
import { formatFloat } from "$lib/shared/formatters/currency";
import type { AssetBreakdown } from "$lib/domain/assets";
import type {
  Forecast,
  Point,
  RetirementGoalProgress,
} from "$lib/domain/goals_models";
import type { Posting } from "$lib/domain/ledger";
import { onMount } from "svelte";
import ARIMAPromise from "arima/async";
import { findBreakPoints, forecast } from "$lib/domain/goals";
import type { PageData } from "./$types";
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
import { sortBy } from "$lib/shared/utils/collection";

interface Props {
  data: PageData;
}

let { data }: Props = $props();

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
  savingsTimeline: Point[] = $state([]),
  postings: Posting[] = $state([]),
  latestPostings: Posting[] = $state([]),
  balances: Record<string, AssetBreakdown> = $state({}),
  predictionsTimeline: Forecast[] = $state([]);

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
  } = await api.goals.getGoalDetails(
    "retirement",
    data.name,
  ) as unknown as RetirementGoalProgress);
  targetSavings = yearlyExpense * (100 / swr);

  latestPostings = sortBy(postings, (p: Posting) => p.date)
    .reverse()
    .slice(0, 12);

  if (yearlyExpense > 0) {
    progressPercent = (savingsTotal / targetSavings) * 100;
    savingsX = savingsTotal / yearlyExpense;
    targetX = targetSavings / yearlyExpense;
  }

  if (targetX <= 0 || savingsX <= 0 || yearlyExpense <= 0) {
    return;
  }

  const ARIMA = await ARIMAPromise;
  const nextPredictions = forecast(savingsTimeline, targetSavings, ARIMA);
  const nextBreakPoints = findBreakPoints(
    savingsTimeline.concat(nextPredictions),
    targetSavings,
  );
  predictionsTimeline = nextPredictions;
  breakPoints = nextBreakPoints;
});
</script>

<svelte:head>
  <title>{name || "Retirement Goal"} - Paisa</title>
</svelte:head>

<Page width="fluid">
  <PageHeader
    title={name}
    titleIcon={icon}
    description="Retirement goal tracking, forecast, and portfolio health"
  >
    {#snippet leading()}
      <a
        href="/more/goals"
        class="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
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
            ariaLabel="{name} retirement goal progress timeline"
            testId="retirement-goal-progress-echart"
          />
        </ChartFrame>
      </Section>

      <Section title="Monthly Investment">
        <ChartFrame height="tall">
          <GoalInvestmentChart
            {postings}
            pmt={0}
            testId="retirement-goal-investment-echart"
          />
        </ChartFrame>
      </Section>

      <Section title="Current Balance">
        <div class="text-muted-foreground">
          <AssetsBalance breakdowns={balances} indent={false} />
        </div>
      </Section>
    </div>

    <div class="paisa-goal-detail-side min-w-0 lg:sticky lg:top-20">
      <GoalRecentPostings postings={latestPostings}
        totalCount={postings.length} />
    </div>
  </div>
</Page>
