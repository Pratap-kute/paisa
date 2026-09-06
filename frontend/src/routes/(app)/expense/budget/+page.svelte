<script lang="ts">
import BudgetCard from "$lib/features/expense/components/BudgetCard.svelte";
import { restName } from "$lib/domain/account";
import { helpUrl } from "$lib/shared/browser/navigation";
import { now } from "$lib/domain/time";
import type { AccountBudget } from "$lib/domain/cash_flow";
import type { Budget } from "$lib/domain/cash_flow";
import { formatCurrency } from "$lib/shared/formatters/currency";
import { api } from "$lib/api";
import { onMount } from "svelte";
import { month, setAllowedDateRange } from "../../../../store";
import ZeroState from "$lib/shared/ui/ZeroState.svelte";
import Page from "$lib/shared/layout/Page.svelte";
import PageHeader from "$lib/shared/layout/PageHeader.svelte";
import Section from "$lib/shared/layout/Section.svelte";
import MetricStrip from "$lib/shared/layout/MetricStrip.svelte";
import Metric from "$lib/shared/layout/Metric.svelte";
import { isEmpty as isEmptyValue } from "$lib/shared/utils/collection";
import { page } from "$app/state";
import { isHistoricalPeriod, validPeriod } from "$lib/shared/browser/period";
import { get } from "svelte/store";

const monthStart = now().startOf("month");
const fallbackMonth = get(month);
let requestedPeriod = $derived(
  validPeriod(page.url.searchParams.get("period")),
);
let historicalPeriod = $derived(
  isHistoricalPeriod(requestedPeriod, now().format("YYYY-MM")),
);
let budgetsByMonth: Record<string, Budget> = $state({});
let checkingBalance = $state(0),
  availableForBudgeting = $state(0);
let isEmpty = $state(false);
let isLoading = $state(true);

let currentMonthBudget: Budget = $derived(budgetsByMonth[$month]);
let currentMonthAccountBudgets: AccountBudget[] = $derived(
  budgetsByMonth[$month]?.accounts || [],
);
let showCurrentMonthMetrics = $derived(
  currentMonthBudget?.date.isSameOrAfter(monthStart) ?? false,
);
const severityOrder: Record<string, number> = {
  "overspent": 3,
  "likely-over": 2,
  "at-risk": 1,
};

let attentionAccounts: AccountBudget[] = $derived(
  currentMonthAccountBudgets
    .filter(needsAttention)
    .sort((a, b) => {
      const rankA = severityOrder[
        a.projection?.status ?? (a.available < 0 ? "overspent" : "")
      ] ?? 0;
      const rankB = severityOrder[
        b.projection?.status ?? (b.available < 0 ? "overspent" : "")
      ] ?? 0;
      if (rankB !== rankA) return rankB - rankA;
      const overrunA = a.projection?.projectedOverrun ??
        (a.available < 0 ? Math.abs(a.available) : 0);
      const overrunB = b.projection?.projectedOverrun ??
        (b.available < 0 ? Math.abs(b.available) : 0);
      return overrunB - overrunA;
    }),
);

function needsAttention(accountBudget: AccountBudget): boolean {
  if (accountBudget.projection) {
    const s = accountBudget.projection.status;
    return s === "overspent" || s === "likely-over" || s === "at-risk";
  }
  if (accountBudget.forecast === 0 && accountBudget.actual === 0) {
    return false;
  }
  if (accountBudget.available < 0) {
    return true;
  }
  return false;
}

function budgetProgress(accountBudget: AccountBudget): number {
  if (accountBudget.forecast <= 0) {
    return 0;
  }
  const spent = accountBudget.projection
    ? accountBudget.projection.observedSpend
    : accountBudget.actual;
  return (spent / accountBudget.forecast) * 100;
}

onMount(async () => {
  try {
    const res = await api.budget.getBudget();
    budgetsByMonth =
      (res.budgetsByMonth as unknown as Record<string, Budget>) || {};
    checkingBalance = res.checkingBalance || 0;
    availableForBudgeting = res.availableForBudgeting || 0;
    setAllowedDateRange(
      Object.values(budgetsByMonth)
        .flat()
        .map((b) => b.date),
    );

    if (isEmptyValue(budgetsByMonth)) {
      isEmpty = true;
    }
  } finally {
    isLoading = false;
  }
});

$effect(() => {
  month.set(requestedPeriod ?? fallbackMonth);
});
</script>

<svelte:head>
  <title>Budget - Paisa</title>
</svelte:head>

<Page width="fluid">
  <PageHeader
    title="Budget"
    description="Monthly envelope budgeting and spending tracking"
  />

  {#if historicalPeriod && requestedPeriod}
    <div class="mb-3 text-sm text-muted-foreground">
      Showing {currentMonthBudget?.date.format("MMMM YYYY") || requestedPeriod} ·
      <a href="/expense/budget" class="text-primary">
        Clear period filter
      </a>
    </div>
  {/if}

  {#if !historicalPeriod && (currentMonthBudget || isLoading)}
    <div class="mb-[var(--paisa-space-5)]">
      <MetricStrip cols={showCurrentMonthMetrics ? 3 : 2}>
        <Metric
          label={availableForBudgeting >= 0 ? "Available for Budgeting" : "Budget Deficit"}
          value={formatCurrency(Math.abs(availableForBudgeting ?? 0))}
          status={availableForBudgeting >= 0 ? "positive" : "negative"}
          loading={isLoading}
        />

        {#if showCurrentMonthMetrics}
          <Metric
            label="Available for Spending"
            value={formatCurrency(currentMonthBudget.availableThisMonth)}
            secondary="out of {formatCurrency(currentMonthBudget.forecast)} budgeted"
            loading={isLoading}
          />
          <Metric
            label="Planned Month-End Balance"
            value={formatCurrency(currentMonthBudget.endOfMonthBalance)}
            loading={isLoading}
          />
        {/if}
      </MetricStrip>

      <div
        class="rounded-[var(--paisa-radius-md)] border border-border-subtle bg-surface px-[var(--paisa-space-4)] py-[var(--paisa-space-3)]"
        aria-label="Checking balance context"
      >
        <div class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Checking Balance
        </div>
        <div class="mt-1 text-sm font-semibold tabular-nums text-foreground">
          {#if isLoading}
            —
          {:else}
            {formatCurrency(checkingBalance)}
          {/if}
        </div>
      </div>
    </div>
  {/if}

  {#if !historicalPeriod && currentMonthBudget?.outlook}
    <div class="mb-[var(--paisa-space-5)]">
      <Section title="Budget Outlook" subtitle="Deterministic month-end spending health across active categories">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          <div class="rounded-lg border border-border-subtle bg-surface p-3 text-center">
            <div class="text-xs font-medium uppercase tracking-wider text-muted-foreground">On Track</div>
            <div class="mt-1 text-xl font-bold text-positive">{currentMonthBudget.outlook.onTrackCount}</div>
          </div>
          <div class="rounded-lg border border-border-subtle bg-surface p-3 text-center">
            <div class="text-xs font-medium uppercase tracking-wider text-muted-foreground">At Risk</div>
            <div class="mt-1 text-xl font-bold text-warning">{currentMonthBudget.outlook.atRiskCount}</div>
          </div>
          <div class="rounded-lg border border-border-subtle bg-surface p-3 text-center">
            <div class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Likely Over</div>
            <div class="mt-1 text-xl font-bold text-negative">{currentMonthBudget.outlook.likelyOverCount}</div>
          </div>
          <div class="rounded-lg border border-border-subtle bg-surface p-3 text-center">
            <div class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Overspent</div>
            <div class="mt-1 text-xl font-bold text-negative">{currentMonthBudget.outlook.overspentCount}</div>
          </div>
          {#if (currentMonthBudget.outlook.projectedOverrun ?? 0) > 0}
            <div class="col-span-2 rounded-lg border border-border-subtle bg-surface p-3 text-center sm:col-span-4 lg:col-span-1">
              <div class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Projected Overrun</div>
              <div class="mt-1 text-xl font-bold text-negative tabular-nums">
                +{formatCurrency(currentMonthBudget.outlook.projectedOverrun ?? 0)}
              </div>
            </div>
          {/if}
        </div>
        {#if currentMonthBudget.outlook.coverageCount < currentMonthBudget.outlook.totalBudgets}
          <div class="mt-2 text-xs text-muted-foreground">
            Projected spend available for {currentMonthBudget.outlook.coverageCount} of {currentMonthBudget.outlook.totalBudgets} active budgets
          </div>
        {/if}
      </Section>
    </div>
  {/if}

  {#if !isLoading && attentionAccounts.length > 0}
    <Section
      title="Needs Attention"
      subtitle="Overspent categories and envelopes projected to exceed or reach their budget"
    >
      <div class="flex flex-col gap-3">
        {#each attentionAccounts as accountBudget (accountBudget.account)}
          {@const isOverspent = accountBudget.projection ? accountBudget.projection.status === "overspent" : accountBudget.available < 0}
          {@const isLikelyOver = accountBudget.projection?.status === "likely-over"}
          {@const isAtRisk = accountBudget.projection?.status === "at-risk"}
          {@const spentAmount = accountBudget.projection ? accountBudget.projection.observedSpend : accountBudget.actual}
          {@const percent = budgetProgress(accountBudget)}
          <div
            id={accountBudget.account === page.url.searchParams.get("account") ? "insight-account" : undefined}
            class="rounded-lg border border-border-subtle bg-surface-raised p-3"
          >
            <div class="mb-1.5 flex items-center justify-between gap-2">
              <span
                class="truncate text-sm font-medium text-foreground"
                title={accountBudget.account}
              >
                {restName(accountBudget.account)}
              </span>
              <span
                class="whitespace-nowrap text-xs font-semibold tabular-nums {isOverspent
                  ? 'text-negative'
                  : 'text-warning'}"
              >
                {#if isOverspent}
                  Over by {formatCurrency(accountBudget.projection?.projectedOverrun ?? Math.abs(accountBudget.available))}
                {:else if isLikelyOver}
                  ⚠ Likely over · ~{formatCurrency(accountBudget.projection?.projectedOverrun ?? 0)} overrun
                {:else if isAtRisk}
                  At risk · {formatCurrency(accountBudget.projection?.projectedRemaining ?? 0)} remaining
                {:else}
                  Available {formatCurrency(Math.abs(accountBudget.available))}
                {/if}
              </span>
            </div>
            <div class="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--paisa-border-subtle)]">
              <div
                class="h-full rounded-full transition-all {isOverspent
                  ? 'bg-negative'
                  : isLikelyOver || isAtRisk
                    ? 'bg-warning'
                    : 'bg-positive'}"
                style="width: {Math.min(100, Math.max(0, percent))}%"
              ></div>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs tabular-nums text-muted-foreground">
              <span>
                Spent {formatCurrency(spentAmount)}
                {#if accountBudget.actual > spentAmount}
                  <span class="text-xs text-muted-foreground" title="Total known spend including future postings: {formatCurrency(accountBudget.actual)}">
                    ({formatCurrency(accountBudget.actual)} committed)
                  </span>
                {/if}
              </span>
              <span>Budget {formatCurrency(accountBudget.forecast)}</span>
              {#if accountBudget.rollover !== 0}
                <span>Rollover {formatCurrency(accountBudget.rollover)}</span>
              {/if}
              {#if accountBudget.projection?.projectedSpend !== undefined}
                <span class="font-medium text-foreground">
                  Projected {formatCurrency(accountBudget.projection.projectedSpend)}
                </span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </Section>
  {/if}

  <Section title="All Budgets" subtitle="Budgeted, spent, remaining, and progress by category">
    <ZeroState item={!isEmpty}>
      <strong>Oops!</strong> You haven't set a budget yet. Checkout the
      <a href={helpUrl("budget")}>docs</a> page to get started.
    </ZeroState>

    <div class="flex flex-col gap-3">
      {#each currentMonthAccountBudgets as accountBudget (accountBudget.account)}
        <div id={accountBudget.account === page.url.searchParams.get("account") ? "insight-account" : undefined}>
          <BudgetCard {accountBudget} />
        </div>
      {/each}
    </div>
  </Section>
</Page>
