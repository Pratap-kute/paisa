<script lang="ts">
import { formatCurrency } from "$lib/shared/formatters/currency";
import { formatPercentage } from "$lib/shared/formatters/currency";
import { postingUrl } from "$lib/shared/browser/navigation";
import { restName } from "$lib/domain/account";
import type { Posting } from "$lib/domain/ledger";
import type { Legend } from "$lib/shared/charts/types";
import { onMount } from "svelte";
import { sumBy, uniq } from "es-toolkit";
import dayjs from "dayjs";
import { firstName } from "$lib/domain/account";
import { api } from "$lib/api";
import { buildMonthlyExpenseTimelineSeries } from "$lib/features/expense/chart_timeline_data";
import {
  categoryColor,
  categoryColorResolver,
  categoryLegends,
} from "$lib/shared/charts/category";
import { buildMonthlyExpenseHeatmapData } from "$lib/features/expense/expense_heatmap_data";
import { buildExpenseBreakdownComparison } from "$lib/features/expense/chart_comparison_data";
import { expenseGroup } from "$lib/features/expense/expense";
import { iconify } from "$lib/shared/ui/icon";
import {
  dateMax,
  dateMin,
  dateRange,
  month,
  setAllowedDateRange,
} from "../../../../store";
import { writable } from "svelte/store";
import LegendCard from "$lib/shared/ui/LegendCard.svelte";
import Page from "$lib/shared/layout/Page.svelte";
import PageHeader from "$lib/shared/layout/PageHeader.svelte";
import Section from "$lib/shared/layout/Section.svelte";
import MetricStrip from "$lib/shared/layout/MetricStrip.svelte";
import Metric from "$lib/shared/layout/Metric.svelte";
import ResponsiveGrid from "$lib/shared/layout/ResponsiveGrid.svelte";
import ChartFrame from "$lib/shared/ui/ChartFrame.svelte";
import MonthPicker from "$lib/shared/ui/MonthPicker.svelte";
import IncomeContextStrip from "$lib/shared/layout/IncomeContextStrip.svelte";
import Badge from "$lib/shared/ui/Badge.svelte";
import ZeroState from "$lib/shared/ui/ZeroState.svelte";
import ComparisonBarChart from "$lib/shared/charts/ComparisonBarChart.svelte";
import DailyExpenseCalendar from "$lib/features/expense/components/DailyExpenseCalendar.svelte";
import TimeSeriesChart from "$lib/shared/charts/TimeSeriesChart.svelte";
import { isEmpty, map, sortBy } from "$lib/shared/utils/collection";
import { get } from "svelte/store";
import { page } from "$app/state";
import { validPeriod } from "$lib/shared/browser/period";

let groups = writable<string[]>([]);
let expenses: Posting[] | undefined = $state(),
  grouped_expenses: Record<string, Posting[]> | undefined = $state(),
  grouped_incomes: Record<string, Posting[]> | undefined = $state(),
  grouped_investments: Record<string, Posting[]> | undefined = $state(),
  grouped_taxes: Record<string, Posting[]> | undefined = $state();

let legends: Legend[] = $state([]);
let expenseColor = $state(categoryColor);
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

let requestedPeriod = $derived(
  validPeriod(page.url.searchParams.get("period")),
);
const fallbackMonth = get(month);

$effect(() => {
  month.set(requestedPeriod ?? fallbackMonth);
});

onMount(async () => {
  try {
    const res = await api.expense.getExpense();
    expenses = res.expenses as unknown as Posting[];
    grouped_expenses = res.month_wise?.expenses as unknown as Record<
      string,
      Posting[]
    >;
    grouped_incomes = res.month_wise?.incomes as unknown as Record<
      string,
      Posting[]
    >;
    grouped_investments = res.month_wise?.investments as unknown as Record<
      string,
      Posting[]
    >;
    grouped_taxes = res.month_wise?.taxes as unknown as Record<
      string,
      Posting[]
    >;

    setAllowedDateRange(map(expenses, (e: Posting) => e.date));
    const allGroups = uniq(expenses.map(expenseGroup)).sort();
    expenseColor = categoryColorResolver(allGroups);
    groups.set(allGroups);
    const requestedAccount = page.url.searchParams.get("account");
    if (requestedAccount) {
      const requestedGroup = restName(requestedAccount);
      if (allGroups.includes(requestedGroup)) groups.set([requestedGroup]);
    }
    legends = categoryLegends(allGroups, (group) => {
      groups.update((selected) =>
        selected.length === 1 && selected[0] === group ? allGroups : [group]
      );
    });
  } finally {
    isLoading = false;
  }
});

function sum(postings: Posting[], sign = 1) {
  return sign * sumBy(postings, (p: Posting) => p.amount);
}

function sumCurrency(postings: Posting[], sign = 1) {
  return formatCurrency(sign * sumBy(postings, (p: Posting) => p.amount));
}

let current_month_expenses: Posting[] = $derived(
  sortBy(
    ((grouped_expenses && grouped_expenses[$month]) || []).filter(
      (e: Posting) => isEmpty($groups) || $groups.includes(expenseGroup(e)),
    ),
    (e: Posting) => e.date,
  ).reverse(),
);
let selectedMonthExpenses: Posting[] = $derived(
  grouped_expenses?.[$month] || [],
);
let selectedMonthHeatmapData = $derived(
  buildMonthlyExpenseHeatmapData($month, selectedMonthExpenses, $groups),
);
let selectedMonthBreakdownData = $derived(
  buildExpenseBreakdownComparison(selectedMonthExpenses),
);
let expenseTimelineData = $derived(
  buildMonthlyExpenseTimelineSeries(expenses ?? [], $groups, $dateRange),
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
let formattedCurrentMonth = $derived(
  dayjs($month, "YYYY-MM").format("MMMM YYYY"),
);
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
  if (grouped_expenses) {
    const expenses = grouped_expenses[$month] || [];
    const incomes = grouped_incomes?.[$month] || [];
    const taxes = grouped_taxes?.[$month] || [];
    const investments = grouped_investments?.[$month] || [];

    income = sumCurrency(incomes, -1);
    tax = sumCurrency(taxes);
    expense = sumCurrency(expenses);
    saving = sumCurrency(investments);

    if (isEmpty(incomes)) {
      taxRate = "";
      expenseRate = "";
      expenseRateValue = "";
      savingRate = "";
      netIncome = "";
    } else {
      const grossIncome = sum(incomes, -1);
      const netIncomeAmount = grossIncome - sum(taxes);
      netIncome = formatCurrency(netIncomeAmount) + " net income";
      taxRate = grossIncome === 0
        ? ""
        : formatPercentage(sum(taxes) / grossIncome) + " on income";
      expenseRateValue = netIncomeAmount === 0
        ? ""
        : formatPercentage(sum(expenses) / netIncomeAmount);
      expenseRate = netIncomeAmount === 0
        ? ""
        : expenseRateValue + " of net income";
      savingRate = netIncomeAmount === 0
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
        value={expenseRateValue || "—"}
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
        height="compact"
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
      <ChartFrame height="content" empty={!hasSelectedMonthExpenses}>
        <DailyExpenseCalendar
          data={selectedMonthHeatmapData}
          colorFor={expenseColor}
          ariaLabel="Daily expenses for {formattedCurrentMonth}"
          testId="monthly-expense-calendar"
        />
      </ChartFrame>
    </Section>
  </ResponsiveGrid>

  <Section
    title="Expense Trend"
    subtitle="Historical monthly expenses by category"
  >
    {#if hasTrendInRange}
      <LegendCard {legends} clazz="mb-3 paisa-overflow-x-auto" />
      <ChartFrame
        height="tall"
        empty={false}
      >
        <TimeSeriesChart
          data={expenseTimelineData}
          ariaLabel="Historical monthly expenses by category and cumulative total"
          testId="monthly-expense-timeline-echart"
        />
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

    {#if isEmpty(current_month_expenses)}
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
            style="--paisa-category-color: {expenseColor(expenseGroup(exp))}"
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
