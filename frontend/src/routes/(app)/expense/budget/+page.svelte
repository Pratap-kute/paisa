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
let attentionAccounts: AccountBudget[] = $derived(
  currentMonthAccountBudgets.filter((accountBudget) =>
    needsAttention(accountBudget)
  ),
);

function needsAttention(accountBudget: AccountBudget): boolean {
  if (accountBudget.forecast === 0 && accountBudget.actual === 0) {
    return false;
  }
  if (accountBudget.available < 0) {
    return true;
  }
  const percent = accountBudget.forecast > 0
    ? (accountBudget.actual / accountBudget.forecast) * 100
    : 0;
  return percent > 85;
}

function budgetProgress(accountBudget: AccountBudget): number {
  if (accountBudget.forecast <= 0) {
    return 0;
  }
  return (accountBudget.actual / accountBudget.forecast) * 100;
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
            label="Projected Month End Balance"
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

  {#if !isLoading && attentionAccounts.length > 0}
    <Section
      title="Needs Attention"
      subtitle="Overspent categories and envelopes near their budget limit"
    >
      <div class="flex flex-col gap-3">
        {#each attentionAccounts as accountBudget (accountBudget.account)}
          {@const isOverspent = accountBudget.available < 0}
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
                {isOverspent ? "Over by " : "Available "}
                {formatCurrency(Math.abs(accountBudget.available))}
              </span>
            </div>
            <div class="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--paisa-border-subtle)]">
              <div
                class="h-full rounded-full transition-all {isOverspent
                  ? 'bg-negative'
                  : percent > 85
                    ? 'bg-warning'
                    : 'bg-positive'}"
                style="width: {Math.min(100, Math.max(0, percent))}%"
              ></div>
            </div>
            <div class="flex items-center justify-between text-xs tabular-nums text-muted-foreground">
              <span>Spent {formatCurrency(accountBudget.actual)}</span>
              <span>Budget {formatCurrency(accountBudget.forecast)}</span>
              {#if accountBudget.rollover !== 0}
                <span>Rollover {formatCurrency(accountBudget.rollover)}</span>
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
