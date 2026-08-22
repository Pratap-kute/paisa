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
    renderCalendar,
  } from "$lib/charts/expense/monthly";
  import { buildExpenseBreakdownComparison } from "$lib/charts/bar_comparison_data";
  import { expenseGroup } from "$lib/charts/expense";
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
  import ComparisonBarChart from "$lib/components/charts/ComparisonBarChart.svelte";

  let groups = writable<string[]>([]);
  let z: ScaleOrdinal<string, string, never> | undefined = $state(),
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

    ({ z, destroy, legends, resize: resizeTimeline } = renderMonthlyExpensesTimeline(
      expenses,
      groups,
      month,
      dateRange,
    ));
  }

  onDestroy(async () => {
    destroy?.();
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
  let selectedMonthBreakdownData = $derived(
    buildExpenseBreakdownComparison(selectedMonthExpenses, {
      color: (category) => z?.(category) || "var(--paisa-primary)",
    }),
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
    if (grouped_expenses && z) {
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
      <div class="inline-flex items-center sm:hidden">
        <MonthPicker bind:value={$month} min={$dateMin} max={$dateMax} />
      </div>
    {/snippet}
  </PageHeader>

  <div class="mb-[var(--paisa-space-5)]">
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
        class="[&_.paisa4-metric-meta]:whitespace-normal [&_.paisa4-metric-value]:overflow-visible [&_.paisa4-metric-value]:whitespace-normal [&_.paisa4-metric-value]:leading-[1.15]"
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
        class="overflow-visible [&_.paisa-chart-frame-body]:overflow-visible"
        rows={Math.min(8, selectedMonthExpenses.length || 4)}
        empty={!hasSelectedMonthExpenses}
        emptyMessage="No expenses recorded for {formattedCurrentMonth}"
      >
        <ComparisonBarChart
          data={selectedMonthBreakdownData}
          ariaLabel="Monthly expense category breakdown"
          testId="monthly-expense-breakdown-echart"
        />
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
      <div class="flex flex-col overflow-hidden rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)]">
        {#each current_month_expenses as exp}
          <a
            class="flex items-center gap-[var(--paisa-space-3)] border-b border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface)] px-[var(--paisa-space-3)] py-[var(--paisa-space-2)] no-underline transition-colors last:border-b-0 hover:bg-[var(--paisa-surface-hover)]"
            href={postingUrl(exp)}
            style="--paisa-category-color: {z?.(expenseGroup(exp)) || 'var(--paisa-border-strong)'}"
          >
            <div class="w-[3px] shrink-0 self-stretch rounded-[var(--paisa-radius-full)] bg-[var(--paisa-category-color)]"></div>
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <span class="truncate text-sm font-semibold text-[var(--paisa-foreground)]" title={exp.payee}>{exp.payee}</span>
              <span class="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-xs text-[var(--paisa-muted-foreground)]">
                <span class="shrink-0">{exp.date.format("DD MMM YYYY")}</span>
                <span class="shrink-0">·</span>
                <Badge variant="neutral" size="sm">
                  <span class="custom-icon">
                    {iconify(restName(exp.account), {
                      group: firstName(exp.account),
                    })}
                  </span>
                </Badge>
                <span class="truncate" title={exp.account}>{exp.account}</span>
              </span>
            </div>
            <span class="shrink-0 text-right text-sm font-semibold tabular-nums text-[var(--paisa-negative)]">{formatCurrency(exp.amount)}</span>
          </a>
        {/each}
      </div>
    {/if}
  </Section>
</Page>
