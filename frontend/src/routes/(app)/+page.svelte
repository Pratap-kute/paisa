<script lang="ts">
import { onMount } from "svelte";
import dayjs from "dayjs";
import { sumBy, take } from "es-toolkit";
import { api } from "$lib/api";
import type { AssetBreakdown, Networth } from "$lib/domain/assets";
import type { Budget, CashFlow } from "$lib/domain/cash_flow";
import type { GoalSummary } from "$lib/domain/goals_models";
import type { InsightsResult } from "$lib/domain/insights";
import type { Posting, Transaction } from "$lib/domain/ledger";
import type { TransactionSequence } from "$lib/domain/recurring";
import { restName } from "$lib/domain/account";
import { now } from "$lib/domain/time";
import {
  enrichTrantionSequence,
  intervalText,
  nextUnpaidSchedule,
  sortTrantionSequence,
  totalRecurring,
} from "$lib/domain/transaction_sequence";
import { buildCashFlowSeries } from "$lib/features/cash_flow/chart_data";
import { buildExpenseBreakdownComparison } from "$lib/features/expense/chart_comparison_data";
import { mapInsightsResponseToDomain } from "$lib/features/insights/presentation";
import {
  buildDashboardAttention,
  buildExpensePace,
  buildExpenseTrend,
  buildNetWorthTrend,
  currentExpenses,
  summarizeBudget,
  summarizeCash,
  summarizeUpcomingRecurring,
} from "$lib/features/dashboard/summary";
import DashboardKpiStrip from "$lib/features/dashboard/components/DashboardKpiStrip.svelte";
import DashboardInsightGateway from "$lib/features/dashboard/components/DashboardInsightGateway.svelte";
import DashboardBudgetHealth from "$lib/features/dashboard/components/DashboardBudgetHealth.svelte";
import DashboardCashAccounts from "$lib/features/dashboard/components/DashboardCashAccounts.svelte";
import Page from "$lib/shared/layout/Page.svelte";
import PageHeader from "$lib/shared/layout/PageHeader.svelte";
import ChartFrame from "$lib/shared/ui/ChartFrame.svelte";
import LegendCard from "$lib/shared/ui/LegendCard.svelte";
import LastNMonths from "$lib/shared/ui/LastNMonths.svelte";
import ZeroState from "$lib/shared/ui/ZeroState.svelte";
import Button from "$lib/shared/ui/Button.svelte";
import Badge from "$lib/shared/ui/Badge.svelte";
import ComparisonBarChart from "$lib/shared/charts/ComparisonBarChart.svelte";
import TimeSeriesChart from "$lib/shared/charts/TimeSeriesChart.svelte";
import {
  formatCurrency,
  formatCurrencyCrude,
  formatPercentage,
} from "$lib/shared/formatters/currency";
import { postingUrl } from "$lib/shared/browser/navigation";
import { some, sortBy } from "$lib/shared/utils/collection";
import { refresh } from "../../store";

const period = now().format("YYYY-MM");
let expenseMonth = $state(period);
let allGoalSummaries: GoalSummary[] = $state([]);
let allTransactionSequences: TransactionSequence[] = $state([]);
let cashFlows: CashFlow[] = $state([]);
let expenses: Record<string, Posting[]> = $state({});
let networth: Networth | undefined = $state();
let transactions: Transaction[] = $state([]);
let budgetsByMonth: Record<string, Budget> = $state({});
let checkingBalances: Record<string, AssetBreakdown> = $state({});
let isEmpty = $state(false);
let dashboardLoading = $state(true);
let dashboardFailed = $state(false);
let insightsLoading = $state(true);
let insightsFailed = $state(false);
let insightsResponse: InsightsResult | null = $state(null);

let currentPeriodExpenses = $derived(currentExpenses(expenses, period));
let currentPeriodExpenseTotal = $derived(
  sumBy(currentPeriodExpenses, (posting) => posting.amount),
);
let selectedExpenses = $derived(currentExpenses(expenses, expenseMonth));
let selectedExpenseTotal = $derived(
  sumBy(selectedExpenses, (posting) => posting.amount),
);
let expenseBreakdown = $derived(
  buildExpenseBreakdownComparison(selectedExpenses),
);
let cashFlowData = $derived(buildCashFlowSeries(cashFlows));
let hasCashFlowData = $derived(hasCashFlowActivity(cashFlows));
let cashSummary = $derived(summarizeCash(checkingBalances));
let insightsAvailable = $derived(
  !insightsLoading && !insightsFailed && insightsResponse !== null,
);
let budgetSummary = $derived(
  summarizeBudget(
    budgetsByMonth[period],
    insightsResponse?.insights,
    insightsAvailable,
  ),
);
let netWorthTrend = $derived(
  buildNetWorthTrend(networth, insightsResponse?.insights),
);
let expenseTrend = $derived(
  buildExpenseTrend(
    insightsResponse?.insights,
    insightsResponse?.isPartial,
    insightsResponse?.comparisonPeriod,
  ),
);
let dashboardAsOf = $derived(
  insightsResponse?.period === period && insightsResponse.asOf.isValid()
    ? insightsResponse.asOf
    : now(),
);
let visibleGoalSummaries = $derived(
  take(
    sortBy(allGoalSummaries, (goal) => -goal.priority),
    3,
  ),
);
let visibleTransactionSequences = $derived(take(allTransactionSequences, 5));
let recurringSummary = $derived(
  summarizeUpcomingRecurring(
    allTransactionSequences,
    dashboardAsOf,
    cashSummary.available ? cashSummary.total : undefined,
  ),
);
let expensePace = $derived(
  buildExpensePace(
    currentPeriodExpenseTotal,
    period,
    dashboardAsOf,
    budgetSummary.configured ? budgetSummary.planned : undefined,
  ),
);
let attentionItems = $derived(
  buildDashboardAttention({
    insights: insightsResponse?.insights,
    recurring: recurringSummary,
    goals: allGoalSummaries,
    asOf: dashboardAsOf,
    isPartial: insightsResponse?.isPartial,
    comparisonPeriod: insightsResponse?.comparisonPeriod,
  }),
);
let periodContext = $derived(
  insightsResponse?.period === period && insightsResponse.asOf.isValid()
    ? `${
      dayjs(`${period}-01`).format("MMM YYYY").toUpperCase()
    } · MTD · As of ${insightsResponse.asOf.format("D MMM")}`
    : `${dayjs(`${period}-01`).format("MMM YYYY").toUpperCase()} · MTD`,
);

function hasCashFlowActivity(flows: CashFlow[]) {
  return some(
    flows,
    (flow) =>
      flow.income !== 0 || flow.expenses !== 0 || flow.liabilities !== 0 ||
      flow.tax !== 0 || flow.investment !== 0 || flow.checking !== 0 ||
      flow.balance !== 0,
  );
}

async function loadDashboard() {
  try {
    const res = await api.dashboard.getDashboard();
    expenses = (res.expenses as unknown as Record<string, Posting[]>) || {};
    cashFlows = (res.cashFlows as unknown as CashFlow[]) || [];
    allGoalSummaries = (res.goalSummaries as unknown as GoalSummary[]) || [];
    budgetsByMonth =
      (res.budget?.budgetsByMonth as unknown as Record<string, Budget>) || {};
    allTransactionSequences = sortTrantionSequence(
      enrichTrantionSequence(
        (res.transactionSequences as unknown as TransactionSequence[]) || [],
      ),
    );
    networth = (res.networth?.networth as unknown as Networth) || undefined;
    checkingBalances =
      (res.checkingBalances?.asset_breakdowns as unknown as Record<
        string,
        AssetBreakdown
      >) || {};
    transactions = (res.transactions as unknown as Transaction[]) || [];
    isEmpty = transactions.length === 0;
  } catch {
    dashboardFailed = true;
  } finally {
    dashboardLoading = false;
  }
}

async function loadInsights() {
  try {
    insightsResponse = mapInsightsResponseToDomain(
      await api.insights.getInsights(),
    );
  } catch {
    insightsFailed = true;
  } finally {
    insightsLoading = false;
  }
}

async function initDemo() {
  await api.init.initDemoData();
  refresh();
}

onMount(() => {
  void loadDashboard();
  void loadInsights();
});
</script>

<Page width="analysis">
  {#if dashboardFailed && !dashboardLoading}
    <div class="rounded-xl p-6 bg-surface border border-border-subtle shadow-xs" data-testid="dashboard-unavailable">
      <h2 class="text-base font-semibold text-foreground">Dashboard unavailable</h2>
      <p class="mt-1 text-sm text-muted-foreground">Your dashboard data could not be loaded. Please try again.</p>
    </div>
  {:else if isEmpty && !dashboardLoading}
    <div class="max-w-3xl mx-auto py-8">
      <div class="p-6 sm:p-8 rounded-xl bg-surface border border-border-subtle shadow-xs">
        <ZeroState item={false}>
          <div class="text-left space-y-4">
            <p class="text-sm text-muted-foreground">Looks like you are new here, you can either get started or look at a demo setup</p>
            <div>
              <h2 class="text-base font-semibold text-foreground mb-2">I want to get started</h2>
              <ol class="list-decimal list-inside text-sm text-foreground space-y-1 ml-2">
                <li>Go to <a href="/more/config" class="text-primary underline">configuration</a> and set your default currency and locale.</li>
                <li>Go to <a href="/ledger/editor" class="text-primary underline">editor</a> and start adding transactions.</li>
              </ol>
            </div>
            <div>
              <h2 class="text-base font-semibold text-foreground mb-2">I want to view a Demo</h2>
              <p class="text-sm text-foreground mb-4">Load a demo journal with relevant configuration.</p>
              <Button variant="primary" size="md" onclick={initDemo}>Setup Demo</Button>
            </div>
          </div>
        </ZeroState>
      </div>
    </div>
  {:else}
    <div class="w-full flex flex-col space-y-6 min-w-0">
      <PageHeader title="Dashboard" description="Your financial position at a glance">
        <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{periodContext}</p>
      </PageHeader>

      <DashboardKpiStrip
        netWorth={networth?.balanceAmount}
        {netWorthTrend}
        cash={cashSummary}
        expenses={currentPeriodExpenseTotal}
        {expenseTrend}
        {expensePace}
        expenseRecorded={currentPeriodExpenses.length > 0}
        budget={budgetSummary}
        {period}
        loading={dashboardLoading}
      />

      <DashboardInsightGateway
        items={attentionItems}
        {period}
        loading={insightsLoading}
        failed={insightsFailed}
      />

      <div class="grid w-full grid-cols-1 gap-[var(--paisa-space-5)] lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] [&>*]:mb-0 [&>*]:min-w-0">
        <section class="rounded-xl p-4 sm:p-6 bg-surface border border-border-subtle shadow-xs flex flex-col min-w-0">
          <div class="flex items-center justify-between mb-3">
            <a href="/cash_flow/monthly" class="text-sm font-semibold uppercase tracking-wider text-foreground hover:text-primary">Cash Flow</a>
            <span class="text-xs text-muted-foreground">Last 3 months</span>
          </div>
          {#if hasCashFlowData}<LegendCard legends={cashFlowData.legends ?? []} clazz="mb-2 paisa-overflow-x-auto" />{/if}
          <ChartFrame height="compact" empty={!hasCashFlowData} emptyMessage="No cash-flow activity in this period">
            <TimeSeriesChart data={cashFlowData} ariaLabel="Current cash flow and checking balance" testId="dashboard-cash-flow-echart" />
          </ChartFrame>
        </section>

        <section class="rounded-xl p-4 sm:p-6 bg-surface border border-border-subtle shadow-xs flex flex-col min-w-0">
          <div class="flex items-center justify-between mb-3 gap-2">
            <a href={`/expense/monthly?period=${expenseMonth}`} class="text-sm font-semibold uppercase tracking-wider text-foreground hover:text-primary">Expenses</a>
            <LastNMonths n={3} bind:value={expenseMonth} />
          </div>
          <div class="mb-3 flex items-baseline gap-2">
            <span class="text-xs text-muted-foreground">Total:</span>
            <span class="text-base font-semibold text-foreground tabular-nums">{formatCurrency(selectedExpenseTotal)}</span>
            <span class="text-xs text-muted-foreground">{expenseMonth === period ? "Month to date" : "Monthly total"}</span>
          </div>
          <ChartFrame height="compact" rows={Math.min(8, selectedExpenses.length || 4)} empty={selectedExpenses.length === 0} emptyMessage="No expenses this month">
            <ComparisonBarChart data={expenseBreakdown} ariaLabel={`Dashboard ${dayjs(`${expenseMonth}-01`).format("MMMM YYYY")} expense breakdown`} testId="dashboard-expense-breakdown-echart" />
          </ChartFrame>
        </section>
      </div>

      <div class="grid w-full grid-cols-1 gap-[var(--paisa-space-5)] lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] [&>*]:min-w-0">
        <DashboardBudgetHealth summary={budgetSummary} {period} isPartial={insightsResponse?.isPartial} comparisonPeriod={insightsResponse?.comparisonPeriod} />

        <section class="rounded-xl p-4 sm:p-6 bg-surface border border-border-subtle shadow-xs flex flex-col min-w-0">
          <div class="flex items-center justify-between mb-3">
            <a href="/ledger/transaction" class="text-sm font-semibold uppercase tracking-wider text-foreground hover:text-primary">Recent Activity</a>
            <a href="/ledger/transaction" class="text-xs font-semibold text-primary uppercase tracking-wider hover:underline">View All</a>
          </div>
          {#if transactions.length > 0}
            <div class="divide-y divide-[var(--paisa-border-subtle)]">
              {#each take(transactions, 5) as transaction}
                {@const posting = transaction.postings[0]}
                <div class="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 gap-3 min-w-0" data-testid="dashboard-recent-item">
                  <div class="min-w-0 flex-1">
                    <a href={postingUrl(posting)} class="text-sm font-medium text-foreground hover:text-primary truncate block">{posting.payee || "Unknown"}</a>
                    <p class="text-xs text-muted-foreground truncate">{restName(posting.account)} · {posting.date.format("DD MMM YYYY")}</p>
                  </div>
                  <span class="text-sm font-semibold text-foreground tabular-nums whitespace-nowrap">{formatCurrency(posting.amount)}</span>
                </div>
              {/each}
            </div>
          {:else if !dashboardLoading}
            <p class="text-sm text-muted-foreground">No recent activity</p>
          {/if}
        </section>
      </div>

      <DashboardCashAccounts accounts={cashSummary.accounts} />

      <div class="grid w-full grid-cols-1 gap-[var(--paisa-space-5)] lg:grid-cols-2 [&>*]:min-w-0">
        {#if visibleGoalSummaries.length > 0}
          <section class="rounded-xl p-4 sm:p-6 bg-surface border border-border-subtle shadow-xs min-w-0">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-semibold uppercase tracking-wider text-foreground">Goals</span>
              <a href="/more/goals" class="text-xs font-semibold text-primary uppercase tracking-wider hover:underline">View All</a>
            </div>
            <div class="space-y-3">
              {#each visibleGoalSummaries as goal (goal.name)}
                {@const completed = goal.target > 0 ? goal.current / goal.target : 0}
                <a href={`/more/goals/${goal.type}/${encodeURIComponent(goal.name)}`} class="block p-3 rounded-lg bg-surface-raised hover:bg-surface-hover border border-border-subtle min-w-0" data-testid="dashboard-goal-item">
                  <div class="flex items-center justify-between gap-3"><span class="text-sm font-medium text-foreground truncate">{goal.name}</span><span class="text-xs font-semibold tabular-nums whitespace-nowrap">{formatPercentage(completed, 1)}</span></div>
                  <div class="h-1.5 w-full overflow-hidden rounded-full bg-[var(--paisa-border-subtle)] my-1.5"><div class="h-full rounded-full bg-primary" style={`width: ${Math.min(100, Math.max(0, completed * 100))}%`}></div></div>
                  <div class="flex items-center justify-between gap-3 text-xs text-muted-foreground tabular-nums">
                    <span class="truncate">{formatCurrency(goal.current)} of {formatCurrency(goal.target)}</span>
                    {#if goal.targetDate && dayjs(goal.targetDate).isValid()}<span class="whitespace-nowrap">{dayjs(goal.targetDate).fromNow()}</span>{/if}
                  </div>
                </a>
              {/each}
            </div>
          </section>
        {/if}

        {#if visibleTransactionSequences.length > 0}
          <section class="rounded-xl p-4 sm:p-6 bg-surface border border-border-subtle shadow-xs min-w-0">
            <div class="flex items-center justify-between mb-3">
              <a href="/cash_flow/recurring" class="text-sm font-semibold uppercase tracking-wider text-foreground hover:text-primary">Upcoming / Recurring</a>
              <a href="/cash_flow/recurring" class="text-xs font-semibold text-primary uppercase tracking-wider hover:underline">View All</a>
            </div>
            {#if recurringSummary.pastDueCount > 0 || recurringSummary.upcomingCount > 0}
              <p class="mb-2 text-xs font-medium text-muted-foreground" data-testid="dashboard-recurring-summary">
                {#if recurringSummary.pastDueCount > 0}
                  <span class="text-negative">{recurringSummary.pastDueCount} {recurringSummary.pastDueCount === 1 ? "payment" : "payments"} past due</span>
                  {#if recurringSummary.upcomingCount > 0}<span> · </span>{/if}
                {/if}
                {#if recurringSummary.upcomingCount > 0}<span class="tabular-nums font-semibold text-foreground">{formatCurrency(recurringSummary.upcomingAmount)}</span><span> due in the next {recurringSummary.horizonDays} days</span>{/if}
              </p>
            {/if}
            <div class="divide-y divide-[var(--paisa-border-subtle)]">
              {#each visibleTransactionSequences as sequence (sequence.key)}
                {@const schedule = nextUnpaidSchedule(sequence)}
                {@const pastDue = schedule?.scheduled?.isBefore(now()) ?? false}
                <div class="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 gap-3 min-w-0" data-testid="dashboard-recurring-item">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2 min-w-0"><span class="text-sm font-medium text-foreground truncate">{sequence.key}</span><Badge variant="neutral" size="sm" rounded>{intervalText(sequence)}</Badge></div>
                    {#if schedule?.scheduled}<p class={`text-xs mt-0.5 ${pastDue ? "text-negative font-medium" : "text-muted-foreground"}`}>{schedule.scheduled.format("DD MMM YYYY")} · {pastDue ? "Past due" : `Due ${schedule.scheduled.fromNow()}`}</p>{/if}
                  </div>
                  <span class="text-sm font-semibold text-foreground tabular-nums whitespace-nowrap">{formatCurrencyCrude(totalRecurring(sequence))}</span>
                </div>
              {/each}
            </div>
          </section>
        {/if}
      </div>
    </div>
  {/if}
</Page>
