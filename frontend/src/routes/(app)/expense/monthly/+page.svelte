<script lang="ts">
  import type { ScaleOrdinal } from "d3";
  import { onDestroy, onMount, tick } from "svelte";
  import _ from "lodash";
  import dayjs from "dayjs";
  import {
    ajax,
    firstName,
    type Posting,
    formatCurrency,
    formatPercentage,
    type Legend,
    postingUrl,
    restName,
  } from "$lib/core/utils";
  import {
    renderMonthlyExpensesTimeline,
    createCurrentExpensesBreakdown,
    renderCalendar,
  } from "$lib/charts/expense/monthly";
  import { expenseGroup } from "$lib/charts/expense";
  import type { ChartHandle } from "$lib/charts/resize";
  import { iconify } from "$lib/core/icon";
  import { dateRange, month, dateMin, dateMax, setAllowedDateRange } from "../../../../store";
  import { writable } from "svelte/store";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import MetricStrip from "$lib/components/layout/MetricStrip.svelte";
  import Metric from "$lib/components/layout/Metric.svelte";
  import ResponsiveGrid from "$lib/components/layout/ResponsiveGrid.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";
  import MonthPicker from "$lib/components/ui/MonthPicker.svelte";
  import IncomeContextStrip from "$lib/components/layout/IncomeContextStrip.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";

  let groups = writable<string[]>([]);
  let z: ScaleOrdinal<string, string, never> | undefined = $state(),
    renderer: ((ps: Posting[]) => void) | undefined = $state(),
    expenseBreakdown: ChartHandle<Posting[]> | null = $state(null),
    expenses: Posting[] | undefined = $state(),
    grouped_expenses: Record<string, Posting[]> | undefined = $state(),
    grouped_incomes: Record<string, Posting[]> | undefined = $state(),
    grouped_investments: Record<string, Posting[]> | undefined = $state(),
    grouped_taxes: Record<string, Posting[]> | undefined = $state(),
    destroy: (() => void) | undefined,
    resizeTimeline: ((dim: { width: number; height: number }) => void) | undefined;

  let legends: Legend[] = $state([]);
  let isLoading = $state(true);

  let taxRate = $state(""),
    netIncome = $state(""),
    tax = $state(""),
    expenseRate = $state(""),
    expenseRateValue = $state(""),
    expense = $state(""),
    saving = $state(""),
    savingRate = $state(""),
    income = $state("");

  function initializeCharts() {
    if (!expenses?.length) return;

    destroy?.();
    expenseBreakdown?.destroy();

    ({ z, destroy, legends, resize: resizeTimeline } = renderMonthlyExpensesTimeline(
      expenses,
      groups,
      month,
      dateRange,
    ));
    expenseBreakdown = createCurrentExpensesBreakdown(z);
    renderer = expenseBreakdown.update;
  }

  onDestroy(async () => {
    destroy?.();
    expenseBreakdown?.destroy();
  });

  onMount(async () => {
    try {
      ({
        expenses: expenses,
        month_wise: {
          expenses: grouped_expenses,
          incomes: grouped_incomes,
          investments: grouped_investments,
          taxes: grouped_taxes,
        },
      } = await ajax("/api/expense"));

      setAllowedDateRange(_.map(expenses, (e: Posting) => e.date));
      await tick();
      initializeCharts();
    } finally {
      isLoading = false;
    }
  });

  function sum(postings: Posting[], sign = 1) {
    return sign * _.sumBy(postings, (p: Posting) => p.amount);
  }

  function sumCurrency(postings: Posting[], sign = 1) {
    return formatCurrency(sign * _.sumBy(postings, (p: Posting) => p.amount));
  }

  let current_month_expenses: Posting[] = $derived(
    _.chain((grouped_expenses && grouped_expenses[$month]) || [])
      .filter((e: Posting) =>
        _.isEmpty($groups) || _.includes($groups, expenseGroup(e))
      )
      .sortBy((e: Posting) => e.date)
      .reverse()
      .value(),
  );
  let selectedMonthExpenses: Posting[] = $derived(
    grouped_expenses?.[$month] || [],
  );
  let hasSelectedMonthExpenses = $derived(selectedMonthExpenses.length > 0);
  let hasExpenses = $derived((expenses?.length ?? 0) > 0);
  let hasTrendInRange = $derived(
    (expenses ?? []).some(
      (e) =>
        e.date.isSameOrAfter($dateRange.from) &&
        e.date.isSameOrBefore($dateRange.to),
    ),
  );
  let formattedCurrentMonth = $derived(dayjs($month, "YYYY-MM").format("MMMM YYYY"));
  let postingCountSubtitle = $derived(
    hasSelectedMonthExpenses
      ? `${selectedMonthExpenses.length} postings in ${formattedCurrentMonth}`
      : "No expenses recorded",
  );
  let recentExpensesSubtitle = $derived.by(() => {
    if (!hasSelectedMonthExpenses) return undefined;
    if (
      current_month_expenses.length !== selectedMonthExpenses.length &&
      $groups.length > 0
    ) {
      return `${current_month_expenses.length} of ${selectedMonthExpenses.length} postings for ${formattedCurrentMonth}`;
    }
    return `${current_month_expenses.length} postings for ${formattedCurrentMonth}`;
  });
  let recentExpensesEmptyMessage = $derived(
    hasSelectedMonthExpenses && $groups.length > 0
      ? `No postings in the selected categories for ${formattedCurrentMonth}.`
      : `No expenses recorded for ${formattedCurrentMonth}.`,
  );

  $effect(() => {
    if (grouped_expenses && renderer && z) {
      renderCalendar($month, grouped_expenses[$month], z, $groups);

      const expenses = grouped_expenses[$month] || [];
      const incomes = grouped_incomes?.[$month] || [];
      const taxes = grouped_taxes?.[$month] || [];
      const investments = grouped_investments?.[$month] || [];

      income = sumCurrency(incomes, -1);
      tax = sumCurrency(taxes);
      expense = sumCurrency(expenses);
      saving = sumCurrency(investments);

      if (_.isEmpty(incomes)) {
        taxRate = "";
        expenseRate = "";
        expenseRateValue = "";
        savingRate = "";
        netIncome = "";
      } else {
        const grossIncome = sum(incomes, -1);
        const netIncomeAmount = grossIncome - sum(taxes);
        netIncome = formatCurrency(netIncomeAmount) + " net income";
        taxRate =
          grossIncome === 0
            ? ""
            : formatPercentage(sum(taxes) / grossIncome) + " on income";
        expenseRateValue =
          netIncomeAmount === 0
            ? ""
            : formatPercentage(sum(expenses) / netIncomeAmount);
        expenseRate =
          netIncomeAmount === 0
            ? ""
            : expenseRateValue + " of net income";
        savingRate =
          netIncomeAmount === 0
            ? ""
            : formatPercentage(sum(investments) / netIncomeAmount) +
              " of net income";
      }

      renderer(expenses);
    }
  });
</script>

<svelte:head>
  <title>Monthly Expenses - {formattedCurrentMonth} - Paisa</title>
</svelte:head>

<Page width="analysis">
  <PageHeader
    title="Monthly Expenses"
    description="Where your money went this month"
  >
    {#snippet actions()}
      <div class="paisa-month-picker-mobile">
        <MonthPicker bind:value={$month} min={$dateMin} max={$dateMax} />
      </div>
    {/snippet}
  </PageHeader>

  <div class="paisa-top-financial-context">
    <MetricStrip cols={2}>
      <Metric
        label="Total Expenses"
        value={expense || "—"}
        status="negative"
        secondary={postingCountSubtitle}
        loading={isLoading}
      />
      <Metric
        label="% of Net Income"
        value={expenseRateValue ? `${expenseRateValue}%` : "—"}
        secondary={expenseRateValue ? "of net income" : (netIncome || "No income recorded")}
        loading={isLoading}
        class="paisa-metric-rate"
      />
    </MetricStrip>

    <IncomeContextStrip
      {income}
      {tax}
      {taxRate}
      savings={saving}
      savingsRate={savingRate}
      {netIncome}
    />
  </div>

  <ResponsiveGrid variant="analysis">
    <Section
      title="Category Breakdown"
      subtitle="Distribution across spending categories"
    >
      <ChartFrame
        type="category"
        class="paisa-breakdown-chart"
        rows={Math.min(8, selectedMonthExpenses.length || 4)}
        empty={!hasSelectedMonthExpenses}
        emptyMessage="No expenses recorded for {formattedCurrentMonth}"
        preserveChildren
        onresize={(dim) => expenseBreakdown?.resize(dim)}
      >
        <svg id="d3-current-month-breakdown" width="100%" />
      </ChartFrame>
    </Section>

    <Section
      title="Expense Calendar"
      subtitle="Daily expense frequency and activity"
    >
      <div id="d3-current-month-expense-calendar" class="d3-calendar">
        <div class="weekdays">
          {#each dayjs.weekdaysShort(true) as day}
            <div>{day}</div>
          {/each}
        </div>
        <div class="days"></div>
      </div>
    </Section>
  </ResponsiveGrid>

  <Section
    title="Expense Trend"
    subtitle="Historical monthly expenses by category"
  >
    {#if hasTrendInRange}
      <LegendCard {legends} clazz="mb-3 paisa-overflow-x-auto" />
      <ChartFrame
        type="timeline"
        size="dynamic"
        empty={false}
        preserveChildren
        onresize={(dim) => resizeTimeline?.(dim)}
      >
        <svg id="d3-monthly-expense-timeline" width="100%" height="380" />
      </ChartFrame>
    {:else}
      <ZeroState item={[]}>
        <p class="text-sm text-[var(--paisa-muted-foreground)]">
          No historical expense activity in the selected date range.
        </p>
      </ZeroState>
    {/if}
  </Section>

  <Section
    title="Recent Expenses"
    subtitle={recentExpensesSubtitle}
  >
    {#snippet action()}
      {#if hasSelectedMonthExpenses}
        <a
          href="/ledger/transaction?query={encodeURIComponent(`date:${$month}`)}"
          class="text-xs font-semibold text-[var(--paisa-primary)] hover:underline"
        >
          View all in Transactions
        </a>
      {/if}
    {/snippet}

    {#if _.isEmpty(current_month_expenses)}
      <ZeroState item={[]}>
        <p class="text-sm text-[var(--paisa-muted-foreground)]">
          {recentExpensesEmptyMessage}
        </p>
      </ZeroState>
    {:else}
      <div class="paisa-expense-list">
        {#each current_month_expenses as exp}
          <a
            class="paisa-expense-row"
            href={postingUrl(exp)}
            style="--paisa-category-color: {z?.(expenseGroup(exp)) || 'var(--paisa-border-strong)'}"
          >
            <div class="paisa-expense-indicator"></div>
            <div class="paisa-expense-main">
              <span class="paisa-expense-payee" title={exp.payee}>{exp.payee}</span>
              <span class="paisa-expense-meta">
                <span class="paisa-expense-date">{exp.date.format("DD MMM YYYY")}</span>
                <span class="paisa-expense-dot">·</span>
                <Badge variant="neutral" size="sm">
                  <span class="custom-icon">
                    {iconify(restName(exp.account), {
                      group: firstName(exp.account),
                    })}
                  </span>
                </Badge>
                <span class="paisa-expense-account" title={exp.account}>{exp.account}</span>
              </span>
            </div>
            <span class="paisa-expense-amount">{formatCurrency(exp.amount)}</span>
          </a>
        {/each}
      </div>
    {/if}
  </Section>
</Page>

<style lang="scss">
  .paisa-month-picker-mobile {
    display: inline-flex;
    align-items: center;

    @media screen and (min-width: 640px) {
      display: none;
    }
  }

  .paisa-top-financial-context {
    margin-bottom: var(--paisa-space-5);
  }

  :global(.paisa-metric-rate .paisa4-metric-value) {
    white-space: normal;
    overflow: visible;
    text-overflow: unset;
    line-height: 1.15;
  }

  :global(.paisa-metric-rate .paisa4-metric-meta) {
    white-space: normal;
  }

  :global(.paisa-breakdown-chart.paisa-chart-frame) {
    overflow: visible;
  }

  :global(.paisa-breakdown-chart .paisa-chart-frame-body) {
    overflow: visible;
  }

  .paisa-expense-list {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--paisa-border-subtle);
    border-radius: var(--paisa-radius-md);
    overflow: hidden;
  }

  .paisa-expense-row {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-3);
    padding: var(--paisa-space-2) var(--paisa-space-3);
    text-decoration: none;
    background-color: var(--paisa-surface);
    border-bottom: 1px solid var(--paisa-border-subtle);
    transition: background-color var(--paisa-transition-fast);

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background-color: var(--paisa-surface-hover);
    }
  }

  .paisa-expense-indicator {
    width: 3px;
    align-self: stretch;
    flex-shrink: 0;
    border-radius: var(--paisa-radius-full);
    background-color: var(--paisa-category-color);
  }

  .paisa-expense-main {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    gap: 0.125rem;
  }

  .paisa-expense-payee {
    font-size: var(--paisa-font-size-sm);
    font-weight: var(--paisa-font-weight-semibold);
    color: var(--paisa-foreground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .paisa-expense-meta {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: var(--paisa-font-size-xs);
    color: var(--paisa-muted-foreground);
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
  }

  .paisa-expense-date,
  .paisa-expense-dot {
    flex-shrink: 0;
  }

  .paisa-expense-account {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .paisa-expense-amount {
    flex-shrink: 0;
    font-size: var(--paisa-font-size-sm);
    font-weight: var(--paisa-font-weight-semibold);
    font-variant-numeric: tabular-nums;
    color: var(--paisa-negative);
    text-align: right;
  }
</style>
