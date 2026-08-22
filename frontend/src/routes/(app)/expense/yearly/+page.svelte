<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import _ from "lodash";
  import { ajax, financialYear, formatCurrency, formatPercentage, type Legend, type Posting } from "$lib/core/utils";
  import {
    renderYearlyExpensesTimeline,
  } from "$lib/charts/expense/yearly";
  import { buildYearlyExpenseHeatmapData } from "$lib/charts/expense_heatmap_data";
  import { buildExpenseBreakdownComparison } from "$lib/charts/bar_comparison_data";
  import { dateMin, dateMax, year } from "../../../../store";
  import { writable } from "svelte/store";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import MetricStrip from "$lib/components/layout/MetricStrip.svelte";
  import Metric from "$lib/components/layout/Metric.svelte";
  import ResponsiveGrid from "$lib/components/layout/ResponsiveGrid.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";
  import FinancialYearPicker from "$lib/components/ui/FinancialYearPicker.svelte";
  import IncomeContextStrip from "$lib/components/layout/IncomeContextStrip.svelte";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";
  import ComparisonBarChart from "$lib/components/charts/ComparisonBarChart.svelte";
  import ExpenseHeatmapChart from "$lib/components/charts/ExpenseHeatmapChart.svelte";

  let groups = writable<string[]>([]);
  let z: ((category: string) => string) | undefined = $state(),
    expenses: Posting[] = $state([]),
    grouped_expenses: Record<string, Posting[]> = $state({}),
    grouped_incomes: Record<string, Posting[]> = $state({}),
    grouped_investments: Record<string, Posting[]> = $state({}),
    grouped_taxes: Record<string, Posting[]> = $state({});
  let resizeTimeline: ((dim: { width: number; height: number }) => void) | undefined;

  let legends: Legend[] = $state([]);
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

  function initializeCharts() {
    if (!expenses?.length || !z) return;
  }

  onMount(async () => {
    try {
      ({
        expenses: expenses,
        year_wise: {
          expenses: grouped_expenses,
          incomes: grouped_incomes,
          investments: grouped_investments,
          taxes: grouped_taxes,
        },
      } = await ajax("/api/expense"));

      const dates = _.map(expenses, (e) => e.date);
      if (dates.length > 0) {
        const minimum = _.minBy(dates, (d) => d.valueOf())!;
        const maximum = _.maxBy(dates, (d) => d.valueOf())!;
        dateMin.set(minimum);
        dateMax.set(maximum);
        if (!$year) year.set(financialYear(maximum));
      }

      await tick();
      ({ z, legends, resize: resizeTimeline } = renderYearlyExpensesTimeline(
        expenses,
        groups,
        year,
      ));
      initializeCharts();
    } finally {
      isLoading = false;
    }
  });

  onDestroy(() => {
  });

  function sum(postings: Posting[], sign = 1) {
    return sign * _.sumBy(postings, (p) => p.amount);
  }

  function sumCurrency(postings: Posting[], sign = 1) {
    return formatCurrency(sign * _.sumBy(postings, (p) => p.amount));
  }

  let currentYearExpenses: Posting[] = $derived(
    grouped_expenses[$year] || [],
  );
  let currentYearHeatmapData = $derived(
    buildYearlyExpenseHeatmapData($year, currentYearExpenses, $groups),
  );
  let currentYearBreakdownData = $derived(
    buildExpenseBreakdownComparison(currentYearExpenses, {
      color: (category) => z?.(category) || "var(--paisa-primary)",
    }),
  );
  let hasCurrentYearExpenses = $derived(currentYearExpenses.length > 0);
  let hasExpenses = $derived(expenses.length > 0);
  let postingCountSubtitle = $derived(
    hasCurrentYearExpenses
      ? `${currentYearExpenses.length} postings in ${$year}`
      : "No expenses recorded",
  );

  $effect(() => {
    if (grouped_expenses && z) {
      const yearExpenses = grouped_expenses[$year] || [];
      const incomes = grouped_incomes[$year] || [];
      const taxes = grouped_taxes[$year] || [];
      const investments = grouped_investments[$year] || [];

      income = sumCurrency(incomes, -1);
      tax = sumCurrency(taxes);
      expense = sumCurrency(yearExpenses);
      investment = sumCurrency(investments);

      if (_.isEmpty(incomes)) {
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
        type="category"
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
      <ChartFrame type="distribution" empty={!hasCurrentYearExpenses}>
        <ExpenseHeatmapChart
          data={currentYearHeatmapData}
          ariaLabel="Monthly expense activity for {$year}"
          testId="yearly-expense-calendar-echart"
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
        type="timeline"
        size="dynamic"
        preserveChildren
        onresize={(dim) => resizeTimeline?.(dim)}
      >
        <svg id="d3-yearly-expense-timeline" width="100%" height="500" />
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
