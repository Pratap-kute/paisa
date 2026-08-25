<script lang="ts">
  import { formatCurrency } from "$lib/shared/formatters/currency";
import { formatPercentage } from "$lib/shared/formatters/currency";
import type { Legend } from "$lib/shared/charts/types";
import type { Posting } from "$lib/domain/ledger";
import { onMount } from "svelte";
  import { sumBy, uniq } from "es-toolkit";
  import { financialYear } from "$lib/domain/time";
  import { api } from "$lib/api";
  import { buildYearlyExpenseTimelineSeries } from "$lib/features/expense/chart_timeline_data";
  import { categoryColor, categoryColorResolver, categoryLegends } from "$lib/shared/charts/category";
  import { buildYearlyExpenseHeatmapData } from "$lib/features/expense/expense_heatmap_data";
  import { buildExpenseBreakdownComparison } from "$lib/features/expense/chart_comparison_data";
  import { expenseGroup } from "$lib/features/expense/expense";
  import { dateMin, dateMax, year } from "../../../../store";
  import { writable } from "svelte/store";
  import LegendCard from "$lib/shared/ui/LegendCard.svelte";
  import Page from "$lib/shared/layout/Page.svelte";
  import PageHeader from "$lib/shared/layout/PageHeader.svelte";
  import Section from "$lib/shared/layout/Section.svelte";
  import MetricStrip from "$lib/shared/layout/MetricStrip.svelte";
  import Metric from "$lib/shared/layout/Metric.svelte";
  import ResponsiveGrid from "$lib/shared/layout/ResponsiveGrid.svelte";
  import ChartFrame from "$lib/shared/ui/ChartFrame.svelte";
  import FinancialYearPicker from "$lib/shared/ui/FinancialYearPicker.svelte";
  import IncomeContextStrip from "$lib/shared/layout/IncomeContextStrip.svelte";
  import ZeroState from "$lib/shared/ui/ZeroState.svelte";
  import ComparisonBarChart from "$lib/shared/charts/ComparisonBarChart.svelte";
  import YearlyExpenseCalendar from "$lib/features/expense/components/YearlyExpenseCalendar.svelte";
  import TimeSeriesChart from "$lib/shared/charts/TimeSeriesChart.svelte";
import { isEmpty, map, maxBy, minBy } from "$lib/shared/utils/collection";

  let groups = writable<string[]>([]);
  let expenses: Posting[] = $state([]),
    grouped_expenses: Record<string, Posting[]> = $state({}),
    grouped_incomes: Record<string, Posting[]> = $state({}),
    grouped_investments: Record<string, Posting[]> = $state({}),
    grouped_taxes: Record<string, Posting[]> = $state({});

  let legends: Legend[] = $state([]);
  let expenseColor = $state(categoryColor);
  let isLoading = $state(true);

  let income = $state(""),
    netIncome = $state(""),
    taxRate = $state(""),
    tax = $state(""),
    expenseRate = $state(""),
    expenseRateValue = $state(""),
    expense = $state(""),
    investment = $state(""),
    savingRate = $state("");

  onMount(async () => {
    try {
      const res = await api.expense.getExpense();
      expenses = (res.expenses as unknown as Posting[]) || [];
      grouped_expenses = (res.year_wise?.expenses as unknown as Record<string, Posting[]>) || {};
      grouped_incomes = (res.year_wise?.incomes as unknown as Record<string, Posting[]>) || {};
      grouped_investments = (res.year_wise?.investments as unknown as Record<string, Posting[]>) || {};
      grouped_taxes = (res.year_wise?.taxes as unknown as Record<string, Posting[]>) || {};

      const dates = map(expenses, (e) => e.date);
      if (dates.length > 0) {
        const minimum = minBy(dates, (d) => d.valueOf())!;
        const maximum = maxBy(dates, (d) => d.valueOf())!;
        dateMin.set(minimum);
        dateMax.set(maximum);
        if (!$year) year.set(financialYear(maximum));
      }

      const allGroups = uniq(expenses.map(expenseGroup)).sort();
      groups.set(allGroups);
      expenseColor = categoryColorResolver(allGroups);
      legends = categoryLegends(allGroups, (group) => {
        groups.update((selected) => selected.length === 1 && selected[0] === group ? allGroups : [group]);
      });
    } finally {
      isLoading = false;
    }
  });

  function sum(postings: Posting[], sign = 1) {
    return sign * sumBy(postings, (p) => p.amount);
  }

  function sumCurrency(postings: Posting[], sign = 1) {
    return formatCurrency(sign * sumBy(postings, (p) => p.amount));
  }

  let currentYearExpenses: Posting[] = $derived(
    grouped_expenses[$year] || [],
  );
  let currentYearHeatmapData = $derived(
    buildYearlyExpenseHeatmapData($year, currentYearExpenses, $groups),
  );
  let currentYearBreakdownData = $derived(
    buildExpenseBreakdownComparison(currentYearExpenses),
  );
  let expenseTimelineData = $derived(buildYearlyExpenseTimelineSeries(expenses, $groups));
  let hasCurrentYearExpenses = $derived(currentYearExpenses.length > 0);
  let hasExpenses = $derived(expenses.length > 0);
  let postingCountSubtitle = $derived(
    hasCurrentYearExpenses
      ? `${currentYearExpenses.length} postings in ${$year}`
      : "No expenses recorded",
  );

  $effect(() => {
    if (grouped_expenses) {
      const yearExpenses = grouped_expenses[$year] || [];
      const incomes = grouped_incomes[$year] || [];
      const taxes = grouped_taxes[$year] || [];
      const investments = grouped_investments[$year] || [];

      income = sumCurrency(incomes, -1);
      tax = sumCurrency(taxes);
      expense = sumCurrency(yearExpenses);
      investment = sumCurrency(investments);

      if (isEmpty(incomes)) {
        expenseRate = "";
        expenseRateValue = "";
        taxRate = "";
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
          : formatPercentage(sum(yearExpenses) / netIncomeAmount);
        expenseRate = netIncomeAmount === 0
          ? ""
          : expenseRateValue + " of net income";
        savingRate = netIncomeAmount === 0
          ? ""
          : formatPercentage(sum(investments) / netIncomeAmount) + " of net income";
      }
    }
  });
</script>

<svelte:head>
  <title>Yearly Expenses - {$year} - Paisa</title>
</svelte:head>

<Page width="analysis">
  <PageHeader
    title="Yearly Expenses"
    description="Multi-year annual expense trends and category comparisons"
  >
    {#snippet actions()}
      <div class="inline-flex items-center sm:hidden">
        <FinancialYearPicker bind:value={$year} dateMin={$dateMin} dateMax={$dateMax} />
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
        class="[&_.paisa-chart-frame-body]:overflow-visible [&_.paisa4-metric-meta]:whitespace-normal [&_.paisa4-metric-value]:overflow-visible [&_.paisa4-metric-value]:whitespace-normal [&_.paisa4-metric-value]:leading-[1.15]"
      />
    </MetricStrip>

    <IncomeContextStrip
      {income}
      {tax}
      {taxRate}
      savings={investment}
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
        rows={Math.min(8, currentYearExpenses.length || 4)}
        empty={!isLoading && !hasCurrentYearExpenses}
        emptyMessage="No expenses recorded for {$year}"
      >
        <ComparisonBarChart
          data={currentYearBreakdownData}
          ariaLabel="Yearly expense category breakdown"
          testId="yearly-expense-breakdown-echart"
        />
      </ChartFrame>
    </Section>

    <Section
      title="Activity Calendar"
      subtitle="Monthly expense frequency and activity"
    >
      <ChartFrame height="content" empty={!hasCurrentYearExpenses}>
        <YearlyExpenseCalendar
          data={currentYearHeatmapData}
          ariaLabel="Monthly expense activity for {$year}"
          testId="yearly-expense-calendar"
          colorFor={expenseColor}
        />
      </ChartFrame>
    </Section>
  </ResponsiveGrid>

  <Section
    title="Expense Timeline"
    subtitle="Historical yearly expenses by category"
  >
    {#if hasExpenses}
      <LegendCard {legends} clazz="mb-3 paisa-overflow-x-auto" />
      <ChartFrame
        height="tall"
      >
        <TimeSeriesChart
          data={expenseTimelineData}
          ariaLabel="Historical yearly expenses by category"
          testId="yearly-expense-timeline-echart"
        />
      </ChartFrame>
    {:else}
      <ZeroState item={[]}>
        <p class="text-sm text-[var(--paisa-muted-foreground)]">
          No expense activity in this period.
        </p>
      </ZeroState>
    {/if}
  </Section>
</Page>
