<script lang="ts">
  import type { ScaleOrdinal } from "d3";
  import { onDestroy, onMount, tick } from "svelte";
  import _ from "lodash";
  import { ajax, formatCurrency, formatPercentage, type Legend, type Posting } from "$lib/core/utils";
  import {
    renderYearlyExpensesTimeline,
    createCurrentExpensesBreakdown,
    renderCalendar,
  } from "$lib/charts/expense/yearly";
  import type { ChartHandle } from "$lib/charts/resize";
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

  let groups = writable<string[]>([]);
  let z: ScaleOrdinal<string, string, never> | undefined = $state(),
    renderer: ((ps: Posting[]) => void) | undefined = $state(),
    expenseBreakdown: ChartHandle<Posting[]> | null = $state(null),
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

    expenseBreakdown?.destroy();
    expenseBreakdown = createCurrentExpensesBreakdown(z);
    renderer = expenseBreakdown.update;
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
        dateMin.set(_.minBy(dates, (d) => d.valueOf())!);
        dateMax.set(_.maxBy(dates, (d) => d.valueOf())!);
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
    expenseBreakdown?.destroy();
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
  let hasCurrentYearExpenses = $derived(currentYearExpenses.length > 0);
  let hasExpenses = $derived(expenses.length > 0);
  let postingCountSubtitle = $derived(
    hasCurrentYearExpenses
      ? `${currentYearExpenses.length} postings in ${$year}`
      : "No expenses recorded",
  );

  $effect(() => {
    if (grouped_expenses && renderer && z) {
      renderCalendar(currentYearExpenses, z, $groups);

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

      renderer(yearExpenses);
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
        preserveChildren
        onresize={(dim) => expenseBreakdown?.resize(dim)}
      >
        <svg id="d3-current-year-breakdown" width="100%" />
      </ChartFrame>
    </Section>

    <Section
      title="Activity Calendar"
      subtitle="Monthly expense frequency and activity"
    >
      <div id="d3-current-year-expense-calendar" class="d3-calendar">
        <div class="months"></div>
      </div>
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
