<script lang="ts">
  import * as d3 from "d3";
  import { onDestroy, onMount } from "svelte";
  import _ from "lodash";
  import { ajax, formatCurrency, formatPercentage, type Legend, type Posting } from "$lib/core/utils";
  import {
    renderYearlyExpensesTimeline,
    createCurrentExpensesBreakdown,
    renderCalendar
  } from "$lib/charts/expense/yearly";
  import type { ChartHandle } from "$lib/charts/resize";
  import { dateMin, dateMax, year } from "../../../../store";
  import { writable } from "svelte/store";
  import LevelItem from "$lib/components/ui/LevelItem.svelte";
  import { financialColors } from "$lib/theme/chartPalette";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import MetricStrip from "$lib/components/layout/MetricStrip.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";

  let groups = writable([]);
  let z: d3.ScaleOrdinal<string, string, never> = $state(),
    renderer: (ps: Posting[]) => void = $state(),
    expenseBreakdown: ChartHandle<Posting[]> | null = $state(null),
    expenses: Posting[] = $state(),
    grouped_expenses: Record<string, Posting[]> = $state(),
    grouped_incomes: Record<string, Posting[]> = $state(),
    grouped_investments: Record<string, Posting[]> = $state(),
    grouped_taxes: Record<string, Posting[]> = $state();
  let resizeTimeline: ((dim: { width: number; height: number }) => void) | undefined;

  let legends: Legend[] = $state([]);

  let income = $state(""),
    netIncome = $state(""),
    taxRate = $state(""),
    tax = $state(""),
    expenseRate = $state(""),
    expense = $state(""),
    investment = $state(""),
    savingRate = $state("");

  let currentYearExpenses: Posting[] = $derived(
    grouped_expenses ? (grouped_expenses[$year] || []) : []
  );
  let hasCurrentYearExpenses = $derived(currentYearExpenses.length > 0);
  let hasExpenses = $derived((expenses?.length ?? 0) > 0);

  onMount(async () => {
    ({
      expenses: expenses,
      year_wise: {
        expenses: grouped_expenses,
        incomes: grouped_incomes,
        investments: grouped_investments,
        taxes: grouped_taxes
      }
    } = await ajax("/api/expense"));

    const [start, end] = d3.extent(_.map(expenses, (e) => e.date));
    if (start) {
      dateMin.set(start);
      dateMax.set(end);
    }

    ({ z, legends, resize: resizeTimeline } = renderYearlyExpensesTimeline(expenses, groups, year));

    if (z) {
      expenseBreakdown = createCurrentExpensesBreakdown(z);
      renderer = expenseBreakdown.update;
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

  $effect(() => {
    if (grouped_expenses && renderer) {
      renderCalendar(currentYearExpenses, z, $groups);

      const expenses = grouped_expenses[$year] || [];
      const incomes = grouped_incomes[$year] || [];
      const taxes = grouped_taxes[$year] || [];
      const investments = grouped_investments[$year] || [];

      income = sumCurrency(incomes, -1);

      tax = sumCurrency(taxes);
      expense = sumCurrency(expenses);
      investment = sumCurrency(investments);

      if (_.isEmpty(incomes)) {
        expenseRate = "";
        taxRate = "";
        savingRate = "";
        netIncome = "";
      } else {
        const grossIncome = sum(incomes, -1);
        const netIncomeAmount = grossIncome - sum(taxes);
        netIncome = formatCurrency(netIncomeAmount) + " net income";
        taxRate = grossIncome === 0
          ? ""
          : formatPercentage(sum(taxes) / grossIncome) + " of income";
        expenseRate = netIncomeAmount === 0
          ? ""
          : formatPercentage(sum(expenses) / netIncomeAmount) + " of net income";
        savingRate = netIncomeAmount === 0
          ? ""
          : formatPercentage(sum(investments) / netIncomeAmount) + " of net income";
      }

      renderer(expenses);
    }
  });
</script>

<Page width="fluid">
  <PageHeader
    title="Yearly Expenses"
    description="Yearly expense breakdown, calendar activity, and timeline"
  />

  <div class="paisa-yearly-expense-layout">
    <!-- Side Context Panel: Summary KPIs -->
    <div class="paisa-yearly-expense-side">
      <Section title="Summary">
        <MetricStrip cols={2}>
          <LevelItem
            narrow
            title="Gross Income"
            value={income}
            subtitle={netIncome}
          />
          <LevelItem
            narrow
            title="Tax"
            value={tax}
            color={financialColors.lossText}
            subtitle={taxRate}
          />
          <LevelItem
            narrow
            title="Net Investment"
            value={investment}
            subtitle={savingRate}
          />
          <LevelItem
            narrow
            title="Expenses"
            value={expense}
            color={financialColors.lossText}
            subtitle={expenseRate}
          />
        </MetricStrip>
      </Section>
    </div>

    <!-- Main Analysis Panel: Calendar, Category Breakdown, Timeline -->
    <div class="paisa-yearly-expense-main">
      <div class="paisa-yearly-top-row">
        <!-- Calendar -->
        <Section title="Activity Calendar">
          <div class="p-3">
            <div id="d3-current-year-expense-calendar" class="d3-calendar">
              <div class="months"></div>
            </div>
          </div>
        </Section>

        <!-- Category Breakdown -->
        <Section title="Category Breakdown">
          <ChartFrame
            type="category"
            rows={Math.min(8, currentYearExpenses.length || 4)}
            empty={!hasCurrentYearExpenses}
            emptyMessage="No expenses this year"
            preserveChildren
            onresize={(dim) => expenseBreakdown?.resize(dim)}
          >
            <svg id="d3-current-year-breakdown" width="100%" />
          </ChartFrame>
        </Section>
      </div>

      <!-- Yearly Expense Timeline -->
      <Section title="Expense Timeline">
        {#if hasExpenses}
          <LegendCard {legends} clazz="mb-3 paisa-overflow-x-auto" />
        {/if}
        <ChartFrame
          type="timeline"
          empty={!hasExpenses}
          emptyMessage="No expense activity in this period"
          preserveChildren
          onresize={(dim) => resizeTimeline?.(dim)}
        >
          <svg id="d3-yearly-expense-timeline" width="100%" height="500" />
        </ChartFrame>
      </Section>
    </div>
  </div>
</Page>

<style lang="scss">
  .paisa-yearly-expense-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--paisa-space-5);
    width: 100%;

    @media screen and (min-width: 1024px) {
      grid-template-columns: minmax(0, 1fr) minmax(0, 3fr);
    }
  }

  .paisa-yearly-expense-side,
  .paisa-yearly-expense-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--paisa-space-4);
  }

  .paisa-yearly-top-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--paisa-space-4);

    @media screen and (min-width: 1024px) {
      grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    }
  }
</style>
