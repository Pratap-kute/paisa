<script lang="ts">
  import { buildCashFlowSeries } from "$lib/features/charts/mixed_period_data";
  import { buildExpenseBreakdownComparison } from "$lib/features/charts/bar_comparison_data";
  import LastNMonths from "$lib/shared/ui/LastNMonths.svelte";
  import Page from "$lib/shared/layout/Page.svelte";
  import PageHeader from "$lib/shared/layout/PageHeader.svelte";
  import MetricStrip from "$lib/shared/layout/MetricStrip.svelte";
  import Metric from "$lib/shared/layout/Metric.svelte";
  import ChartFrame from "$lib/shared/ui/ChartFrame.svelte";
  import LegendCard from "$lib/shared/ui/LegendCard.svelte";
  import ZeroState from "$lib/shared/ui/ZeroState.svelte";
  import Button from "$lib/shared/ui/Button.svelte";
  import Badge from "$lib/shared/ui/Badge.svelte";
  import ComparisonBarChart from "$lib/features/charts/components/ComparisonBarChart.svelte";
  import TimeSeriesChart from "$lib/features/charts/components/TimeSeriesChart.svelte";
  import { refresh } from "../../store";
  import {
    enrichTrantionSequence,
    intervalText,
    nextUnpaidSchedule,
    sortTrantionSequence,
    totalRecurring
  } from "$lib/domain/transaction_sequence";
  import {
    formatCurrency,
    formatCurrencyCrude,
    formatFloat,
    formatPercentage,
    now,
    postingUrl,
    restName,
    type AssetBreakdown,
    type Budget,
    type CashFlow,
    type GoalSummary,
    type Legend,
    type Networth,
    type Posting,
    type Transaction,
    type TransactionSequence
  } from "$lib/core/utils";
  import { sumBy, take } from "es-toolkit";
  import dayjs from "dayjs";
  import { onMount } from "svelte";
import { isEmpty as isEmptyValue, some, sortBy, values } from "$lib/shared/utils/collection";

  let cashflowLegends: Legend[] = $state([]);
  let month = $state(now().format("YYYY-MM"));
  let goalSummaries: GoalSummary[] = $state([]);
  let transactionSequences: TransactionSequence[] = $state([]);
  let cashFlows: CashFlow[] = $state([]);
  let expenses: { [key: string]: Posting[] } = $state({});
  let xirr = $state(0);
  let networth: Networth | undefined = $state();
  let transactions: Transaction[] = $state([]);
  let budgetsByMonth: Record<string, Budget> = $state({});
  let isEmpty = $state(false);
  let isLoading = $state(true);
  let checkingBalances: Record<string, AssetBreakdown> = $state({});

  function hasCashFlowActivity(flows: CashFlow[]) {
    return some(flows, (c) =>
      c.income !== 0 ||
      c.expenses !== 0 ||
      c.liabilities !== 0 ||
      c.tax !== 0 ||
      c.investment !== 0 ||
      c.checking !== 0 ||
      c.balance !== 0
    );
  }

  let currentBudget = $derived(budgetsByMonth[month]);
  import { api } from "$lib/api";

  let selectedExpenses: Posting[] = $derived(expenses[month] || []);
  let totalExpense = $derived(sumBy(selectedExpenses, (p) => p.amount));
  let selectedExpenseBreakdownData = $derived(
    buildExpenseBreakdownComparison(selectedExpenses),
  );
  let hasCashFlowData = $derived(hasCashFlowActivity(cashFlows));
  let cashFlowData = $derived(buildCashFlowSeries(cashFlows));
  let hasSelectedExpenses = $derived(selectedExpenses.length > 0);

  async function initDemo() {
    await api.init.initDemoData();
    refresh();
  }

  onMount(async () => {
    try {
      const res = await api.dashboard.getDashboard();
      expenses = (res.expenses as unknown as Record<string, Posting[]>) || {};
      cashFlows = (res.cashFlows as unknown as CashFlow[]) || [];
      goalSummaries = (res.goalSummaries as unknown as GoalSummary[]) || [];
      budgetsByMonth = (res.budget?.budgetsByMonth as unknown as Record<string, Budget>) || {};
      transactionSequences = (res.transactionSequences as unknown as TransactionSequence[]) || [];
      networth = (res.networth?.networth as unknown as Networth) || null;
      xirr = res.networth?.xirr || 0;
      checkingBalances = (res.checkingBalances?.asset_breakdowns as unknown as Record<string, AssetBreakdown>) || {};
      transactions = (res.transactions as unknown as Transaction[]) || [];

      goalSummaries = sortBy(goalSummaries, (g) => -g.priority);

      if (isEmptyValue(transactions)) {
        isEmpty = true;
      } else {
        isEmpty = false;
      }

      cashflowLegends = cashFlowData.legends ?? [];
      transactionSequences = take(
        sortTrantionSequence(enrichTrantionSequence(transactionSequences)),
        8
      );
    } finally {
      isLoading = false;
    }
  });
</script>

<Page width="analysis">
  {#if isEmpty}
    <div class="max-w-3xl mx-auto py-8">
      <div class="p-6 sm:p-8 rounded-xl bg-[var(--paisa-surface)] border border-[var(--paisa-border-subtle)] shadow-xs">
        <ZeroState item={false}>
          <div class="text-left space-y-4">
            <p class="text-sm text-[var(--paisa-muted-foreground)]">
              Looks like you are new here, you can either get started or look at a demo setup
            </p>
            <div>
              <h2 class="text-base font-semibold text-[var(--paisa-foreground)] mb-2">I want to get started</h2>
              <ol class="list-decimal list-inside text-sm text-[var(--paisa-foreground)] space-y-1 ml-2">
                <li>
                  Go to <a href="/more/config" class="text-[var(--paisa-primary)] underline">configuration</a> page and set your default currency and locale.
                </li>
                <li>
                  Go to <a href="/ledger/editor" class="text-[var(--paisa-primary)] underline">editor</a> page and start adding transactions to your journal.
                </li>
              </ol>
            </div>
            <div>
              <h2 class="text-base font-semibold text-[var(--paisa-foreground)] mb-2">I want to view a Demo</h2>
              <ol class="list-decimal list-inside text-sm text-[var(--paisa-foreground)] space-y-1 ml-2 mb-4">
                <li>
                  Click the button below to load a demo setup. This will load a demo journal with relevant config.
                </li>
                <li>
                  Once you are done playing around, you can go to <a href="/ledger/editor" class="text-[var(--paisa-primary)] underline">editor</a> page and select all the content and delete them.
                </li>
                <li>
                  Go to <a href="/more/config" class="text-[var(--paisa-primary)] underline">configuration</a> page and click the reset to defaults button.
                </li>
              </ol>
              <Button variant="primary" size="md" onclick={() => initDemo()}>Setup Demo</Button>
            </div>
          </div>
        </ZeroState>
      </div>
    </div>
  {:else}
    <div class="w-full flex flex-col space-y-6">
      <!-- Header -->
      <PageHeader
        title="Dashboard"
        description="Your financial position at a glance"
      />

    <!-- Row 1: Primary Financial Metric Strip -->
    {#if networth || isLoading}
      <div class="py-2 mb-2">
        <MetricStrip cols={4}>
          <Metric
            label="Net worth"
            value={networth ? formatCurrency(networth.balanceAmount) : "₹0"}
            loading={isLoading}
          />
          <Metric
            label="Net Investment"
            value={networth ? formatCurrency(networth.netInvestmentAmount) : "₹0"}
            loading={isLoading}
          />
          <Metric
            label="Gain / Loss"
            value={networth ? (networth.gainAmount >= 0 ? `+${formatCurrency(networth.gainAmount)}` : formatCurrency(networth.gainAmount)) : "₹0"}
            status={networth ? (networth.gainAmount >= 0 ? "positive" : "negative") : "neutral"}
            loading={isLoading}
          />
          <Metric
            label="XIRR"
            value={networth ? `${formatFloat(xirr)}%` : "0%"}
            status={xirr > 0 ? "positive" : (xirr < 0 ? "negative" : "neutral")}
            loading={isLoading}
          />
        </MetricStrip>
      </div>
    {/if}

    <!-- Row 1B: Checking / Cash Accounts Summary -->
    {#if !isEmptyValue(checkingBalances)}
      <div class="rounded-xl p-4 sm:p-5 bg-[var(--paisa-surface)] border border-[var(--paisa-border-subtle)] shadow-xs">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-semibold uppercase tracking-wider text-[var(--paisa-foreground)]">Cash Accounts</span>
          <a href="/assets/balance" class="text-xs font-semibold text-[var(--paisa-primary)] uppercase tracking-wider hover:underline">
            View All
          </a>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {#each values(checkingBalances) as assetBreakdown}
            {@const name = restName(restName(assetBreakdown.group)) || restName(assetBreakdown.group) || assetBreakdown.group}
            <a
              href="/assets/gain/{encodeURIComponent(assetBreakdown.group)}"
              class="flex items-center justify-between p-3 rounded-lg bg-[var(--paisa-surface-raised)] hover:bg-[var(--paisa-surface-hover)] border border-[var(--paisa-border-subtle)] transition-colors"
            >
              <div class="flex items-center gap-2.5 min-w-0 pr-2">
                <i class="fa-solid fa-wallet text-xs text-[var(--paisa-muted-foreground)]"></i>
                <span class="text-sm font-medium text-[var(--paisa-foreground)] truncate" title={assetBreakdown.group}>
                  {name}
                </span>
              </div>
              <span class="text-sm font-semibold text-[var(--paisa-foreground)] tabular-nums whitespace-nowrap">
                {formatCurrency(assetBreakdown.marketAmount)}
              </span>
            </a>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Row 2: Primary Visualizations (Cash Flow ~60% + Expenses ~40%) -->
    <div class="grid w-full grid-cols-1 gap-[var(--paisa-space-5)] lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] [&>*]:mb-0 [&>*]:min-w-0">
      <div class="rounded-xl p-4 sm:p-6 bg-[var(--paisa-surface)] border border-[var(--paisa-border-subtle)] shadow-xs flex flex-col min-w-0">
        <div class="flex items-center justify-between mb-3">
          <a href="/cash_flow/monthly" class="text-sm font-semibold uppercase tracking-wider text-[var(--paisa-foreground)] hover:text-[var(--paisa-primary)]">
            Cash Flow
          </a>
        </div>
        {#if hasCashFlowData}
          <LegendCard legends={cashflowLegends} clazz="mb-2 paisa-overflow-x-auto" />
        {/if}

        <ChartFrame
          height="compact"
          empty={!hasCashFlowData}
          emptyMessage="No cash-flow activity in this period"
        >
          <TimeSeriesChart
            data={cashFlowData}
            ariaLabel="Current cash flow and checking balance"
            testId="dashboard-cash-flow-echart"
          />
        </ChartFrame>
      </div>

      <div class="rounded-xl p-4 sm:p-6 bg-[var(--paisa-surface)] border border-[var(--paisa-border-subtle)] shadow-xs flex flex-col min-w-0">
        <div class="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <a href="/expense/monthly" class="text-sm font-semibold uppercase tracking-wider text-[var(--paisa-foreground)] hover:text-[var(--paisa-primary)]">
            Expenses
          </a>
          <LastNMonths n={3} bind:value={month} />
        </div>

        <div class="mb-3 flex items-baseline gap-2">
          <span class="text-xs text-[var(--paisa-muted-foreground)]">Total Monthly:</span>
          <span class="text-base font-semibold text-[var(--paisa-foreground)] tabular-nums">
            {formatCurrency(totalExpense)}
          </span>
        </div>
        <ChartFrame
          height="compact"
          rows={Math.min(8, selectedExpenses.length || 4)}
          empty={!hasSelectedExpenses}
          emptyMessage="No expenses this month"
        >
          <ComparisonBarChart
            data={selectedExpenseBreakdownData}
            ariaLabel="Dashboard monthly expense breakdown"
            testId="dashboard-expense-breakdown-echart"
          />
        </ChartFrame>
      </div>
    </div>

    <!-- Row 3: Operational Data (Budget ~40% + Recent Transactions ~60%) -->
    <div class="grid w-full grid-cols-1 gap-[var(--paisa-space-5)] lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] [&>*]:mb-0 [&>*]:min-w-0 [&>:only-child]:col-span-full">
      {#if currentBudget && currentBudget.accounts && currentBudget.accounts.length > 0}
        <div class="rounded-xl p-4 sm:p-6 bg-[var(--paisa-surface)] border border-[var(--paisa-border-subtle)] shadow-xs flex flex-col min-w-0">
          <div class="flex items-center justify-between mb-3">
            <a href="/expense/budget" class="text-sm font-semibold uppercase tracking-wider text-[var(--paisa-foreground)] hover:text-[var(--paisa-primary)]">
              Needs Attention
            </a>
          </div>
          <div class="space-y-3">
            {#each currentBudget.accounts as accountBudget (accountBudget.account)}
              {@const isOverspent = accountBudget.available < 0}
              {@const percent = accountBudget.forecast > 0 ? (accountBudget.actual / accountBudget.forecast) * 100 : 0}
              <div class="p-3 rounded-lg bg-[var(--paisa-surface-raised)] border border-[var(--paisa-border-subtle)]">
                <div class="flex items-center justify-between mb-1.5 gap-2">
                  <span class="text-sm font-medium text-[var(--paisa-foreground)] truncate" title={accountBudget.account}>
                    {restName(accountBudget.account)}
                  </span>
                  <span class="text-xs font-semibold tabular-nums whitespace-nowrap {isOverspent ? 'text-[var(--paisa-negative)]' : 'text-[var(--paisa-positive)]'}">
                    {isOverspent ? 'Over by ' : 'Available '}{formatCurrency(Math.abs(accountBudget.available))}
                  </span>
                </div>
                <div class="h-1.5 w-full overflow-hidden rounded-full bg-[var(--paisa-border-subtle)] mb-1.5">
                  <div
                    class="h-full rounded-full transition-all {isOverspent ? 'bg-[var(--paisa-negative)]' : (percent > 85 ? 'bg-[var(--paisa-warning)]' : 'bg-[var(--paisa-positive)]')}"
                    style="width: {Math.min(100, Math.max(0, percent))}%"
                  ></div>
                </div>
                <div class="flex items-center justify-between text-xs text-[var(--paisa-muted-foreground)] tabular-nums">
                  <span>Spent {formatCurrency(accountBudget.actual)}</span>
                  <span>Budget {formatCurrency(accountBudget.forecast)}</span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      {#if !isEmptyValue(transactions)}
        <div class="rounded-xl p-4 sm:p-6 bg-[var(--paisa-surface)] border border-[var(--paisa-border-subtle)] shadow-xs flex flex-col min-w-0">
          <div class="flex items-center justify-between mb-3">
            <a href="/ledger/transaction" class="text-sm font-semibold uppercase tracking-wider text-[var(--paisa-foreground)] hover:text-[var(--paisa-primary)]">
              Recent Activity
            </a>
            <a href="/ledger/transaction" class="text-xs font-semibold text-[var(--paisa-primary)] uppercase tracking-wider hover:underline">
              View All
            </a>
          </div>
          <div class="divide-y divide-[var(--paisa-border-subtle)]">
            {#each take(transactions, 8) as t}
              {@const posting = t.postings[0]}
              <div class="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 hover:bg-[var(--paisa-surface-hover)] -mx-2 px-2 rounded-md transition-colors">
                <div class="min-w-0 flex-1 pr-3">
                  <a
                    href={postingUrl(posting)}
                    class="text-sm font-medium text-[var(--paisa-foreground)] hover:text-[var(--paisa-primary)] truncate block"
                  >
                    {posting.payee || "Unknown"}
                  </a>
                  <div class="text-xs text-[var(--paisa-muted-foreground)] flex items-center gap-2 mt-0.5">
                    <span>{restName(posting.account)}</span>
                    <span>·</span>
                    <span class="tabular-nums">{posting.date.format("DD MMM YYYY")}</span>
                  </div>
                </div>
                <div class="text-right">
                  <span class="text-sm font-semibold text-[var(--paisa-foreground)] tabular-nums whitespace-nowrap">
                    {formatCurrency(posting.amount)}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <!-- Row 4: Long-Term & Recurring (Goals ~50% + Recurring ~50%) -->
    <div class="grid w-full grid-cols-1 gap-[var(--paisa-space-5)] lg:grid-cols-2 [&>*]:mb-0 [&>*]:min-w-0 [&>:only-child]:col-span-full">
      {#if !isEmptyValue(goalSummaries)}
        <div class="rounded-xl p-4 sm:p-6 bg-[var(--paisa-surface)] border border-[var(--paisa-border-subtle)] shadow-xs flex flex-col min-w-0">
          <div class="flex items-center justify-between mb-3">
            <a href="/more/goals" class="text-sm font-semibold uppercase tracking-wider text-[var(--paisa-foreground)] hover:text-[var(--paisa-primary)]">
              Goals
            </a>
          </div>
          <div class="space-y-3">
            {#each goalSummaries as goal (goal.name)}
              {@const completed = goal.target > 0 ? (goal.current / goal.target) * 100 : 0}
              <a
                href="/more/goals/{goal.type}/{encodeURIComponent(goal.name)}"
                class="block p-3 rounded-lg bg-[var(--paisa-surface-raised)] hover:bg-[var(--paisa-surface-hover)] border border-[var(--paisa-border-subtle)] transition-colors"
              >
                <div class="flex items-center justify-between mb-1.5 gap-2">
                  <span class="text-sm font-medium text-[var(--paisa-foreground)] truncate">{goal.name}</span>
                  <span class="text-xs font-semibold text-[var(--paisa-foreground)] tabular-nums">
                    {formatPercentage(completed / 100, 1)}
                  </span>
                </div>
                <div class="h-1.5 w-full overflow-hidden rounded-full bg-[var(--paisa-border-subtle)] mb-1.5">
                  <div
                    class="h-full rounded-full bg-[var(--paisa-primary)] transition-all"
                    style="width: {Math.min(100, Math.max(0, completed))}%"
                  ></div>
                </div>
                <div class="flex items-center justify-between text-xs text-[var(--paisa-muted-foreground)] tabular-nums">
                  <span>{formatCurrency(goal.current)} of {formatCurrency(goal.target)}</span>
                  {#if goal.targetDate && dayjs(goal.targetDate).isValid()}
                    <span>{dayjs(goal.targetDate).fromNow()}</span>
                  {/if}
                </div>
              </a>
            {/each}
          </div>
        </div>
      {/if}

      {#if !isEmptyValue(transactionSequences)}
        <div class="rounded-xl p-4 sm:p-6 bg-[var(--paisa-surface)] border border-[var(--paisa-border-subtle)] shadow-xs flex flex-col min-w-0">
          <div class="flex items-center justify-between mb-3">
            <a href="/cash_flow/recurring" class="text-sm font-semibold uppercase tracking-wider text-[var(--paisa-foreground)] hover:text-[var(--paisa-primary)]">
              Upcoming / Recurring
            </a>
          </div>
          <div class="divide-y divide-[var(--paisa-border-subtle)]">
            {#each transactionSequences as ts (ts.key)}
              {@const schedule = nextUnpaidSchedule(ts)}
              {@const isPastDue = schedule?.scheduled ? schedule.scheduled.isBefore(now()) : false}
              <div class="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 hover:bg-[var(--paisa-surface-hover)] -mx-2 px-2 rounded-md transition-colors">
                <div class="min-w-0 flex-1 pr-3">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-[var(--paisa-foreground)] truncate">{ts.key}</span>
                    <Badge variant="neutral" size="sm" rounded>{intervalText(ts)}</Badge>
                  </div>
                  {#if schedule?.scheduled}
                    <div class="text-xs text-[var(--paisa-muted-foreground)] flex items-center gap-2 mt-0.5">
                      <span class="tabular-nums">{schedule.scheduled.format("DD MMM YYYY")}</span>
                      <span>·</span>
                      <span class={isPastDue ? 'text-[var(--paisa-negative)] font-medium' : ''}>
                        {isPastDue ? 'Past due' : `Due ${schedule.scheduled.fromNow()}`}
                      </span>
                    </div>
                  {/if}
                </div>
                <div class="text-right">
                  <span class="text-sm font-semibold text-[var(--paisa-foreground)] tabular-nums whitespace-nowrap">
                    {formatCurrencyCrude(totalRecurring(ts))}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
</Page>
