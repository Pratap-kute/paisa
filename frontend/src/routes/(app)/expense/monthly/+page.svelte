<script lang="ts">
  import type { ScaleOrdinal } from "d3";
  import { onDestroy, onMount } from "svelte";
  import _ from "lodash";
  import {
    ajax,
    secondName,
    type Posting,
    formatCurrency,
    formatPercentage,
    type Legend
  } from "$lib/core/utils";
  import {
    renderMonthlyExpensesTimeline,
    renderCurrentExpensesBreakdown,
    renderCalendar
  } from "$lib/charts/expense/monthly";
  import { financialColors } from "$lib/theme/chartPalette";
  import { dateRange, month, setAllowedDateRange } from "../../../../store";
  import { writable } from "svelte/store";
  import PostingCard from "$lib/components/transactions/PostingCard.svelte";
  import LevelItem from "$lib/components/ui/LevelItem.svelte";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";
  import dayjs from "dayjs";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import MetricStrip from "$lib/components/layout/MetricStrip.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";

  let groups = writable([]);
  let z: ScaleOrdinal<string, string, never> = $state(),
    renderer: (ps: Posting[]) => void = $state(),
    expenses: Posting[] = $state(),
    grouped_expenses: Record<string, Posting[]> = $state(),
    grouped_incomes: Record<string, Posting[]> = $state(),
    grouped_investments: Record<string, Posting[]> = $state(),
    grouped_taxes: Record<string, Posting[]> = $state(),
    destroy: () => void;

  let legends: Legend[] = $state([]);

  let taxRate = $state(""),
    netIncome = $state(""),
    tax = $state(""),
    expenseRate = $state(""),
    expense = $state(""),
    saving = $state(""),
    savingRate = $state(""),
    income = $state("");

  onDestroy(async () => {
    if (destroy) {
      destroy();
    }
  });

  onMount(async () => {
    ({
      expenses: expenses,
      month_wise: {
        expenses: grouped_expenses,
        incomes: grouped_incomes,
        investments: grouped_investments,
        taxes: grouped_taxes
      }
    } = await ajax("/api/expense"));

    setAllowedDateRange(_.map(expenses, (e) => e.date));
    ({ z, destroy, legends } = renderMonthlyExpensesTimeline(expenses, groups, month, dateRange));
    renderer = renderCurrentExpensesBreakdown(z);
  });

  function sum(postings: Posting[], sign = 1) {
    return sign * _.sumBy(postings, (p) => p.amount);
  }

  function sumCurrency(postings: Posting[], sign = 1) {
    return formatCurrency(sign * _.sumBy(postings, (p) => p.amount));
  }

  let current_month_expenses: Posting[] = $derived(
    _.chain((grouped_expenses && grouped_expenses[$month]) || [])
      .filter((e) => _.includes($groups, secondName(e.account)))
      .sortBy((e) => e.date)
      .reverse()
      .value()
  );

  $effect(() => {
    if (grouped_expenses && renderer) {
      renderCalendar($month, grouped_expenses[$month], z, $groups);

      const expenses = grouped_expenses[$month] || [];
      const incomes = grouped_incomes[$month] || [];
      const taxes = grouped_taxes[$month] || [];
      const investments = grouped_investments[$month] || [];

      income = sumCurrency(incomes, -1);
      tax = sumCurrency(taxes);
      expense = sumCurrency(expenses);
      saving = sumCurrency(investments);

      if (_.isEmpty(incomes)) {
        taxRate = "";
        expenseRate = "";
        savingRate = "";
        netIncome = "";
      } else {
        netIncome = formatCurrency(sum(incomes, -1) - sum(taxes)) + " net income";
        taxRate = formatPercentage(sum(taxes) / sum(incomes, -1)) + " on income";
        expenseRate =
          formatPercentage(sum(expenses) / (sum(incomes, -1) - sum(taxes))) + " of net income";
        savingRate =
          formatPercentage(sum(investments) / (sum(incomes, -1) - sum(taxes))) + " of net income";
      }

      renderer(expenses);
    }
  });
</script>

<Page width="fluid">
  <PageHeader
    title="Monthly Expenses"
    description="Monthly expense breakdown, calendar activity, and timeline"
  />

  <div class="paisa-split-layout">
    <!-- Side Context Panel: Summary KPIs & Recent Postings -->
    <div class="paisa-split-side">
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
            subtitle={taxRate}
            color={financialColors.lossText}
          />
          <LevelItem
            narrow
            title="Net Investment"
            value={saving}
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

      <Section title="Recent Expenses" class="paisa-split-postings-section">
        <div class="paisa-split-postings-list">
          {#each current_month_expenses as exp}
            <PostingCard posting={exp} color={z(secondName(exp.account))} icon={true} />
          {/each}
        </div>
      </Section>
    </div>

    <!-- Main Analysis Panel: Calendar, Category Breakdown, Timeline -->
    <div class="paisa-split-main">
      <div class="paisa-split-top-row">
        <!-- Calendar -->
        <Section title="Calendar" class="paisa-split-calendar-cell">
          <div id="d3-current-month-expense-calendar" class="d3-calendar">
            <div class="weekdays">
              {#each dayjs.weekdaysShort(true) as day}
                <div>{day}</div>
              {/each}
            </div>
            <div class="days"></div>
          </div>
        </Section>

        <!-- Category Breakdown -->
        <Section title="Category Breakdown" class="paisa-split-breakdown-cell">
          <ZeroState item={grouped_expenses?.[$month]}>
            <strong>Hurray!</strong> You have no expenses this month.
          </ZeroState>
          <ChartFrame type="category" rows={Math.min(8, (grouped_expenses?.[$month] || []).length || 4)}>
            <svg id="d3-current-month-breakdown" width="100%" />
          </ChartFrame>
        </Section>
      </div>

      <!-- Monthly Expense Timeline -->
      <Section title="Expense Timeline">
        <ZeroState item={expenses}>
          <strong>Oops!</strong> You have no expenses.
        </ZeroState>
        <LegendCard {legends} clazz="mb-3 paisa-overflow-x-auto" />
        <ChartFrame type="timeline">
          <svg id="d3-monthly-expense-timeline" width="100%" height="400" />
        </ChartFrame>
      </Section>
    </div>
  </div>
</Page>

<style lang="scss">
  .paisa-split-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--paisa-space-5);
    width: 100%;

    @media screen and (min-width: 1024px) {
      grid-template-columns: minmax(280px, 1fr) minmax(0, 3fr);
    }
  }

  .paisa-split-side {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--paisa-space-4);
  }

  .paisa-split-postings-list {
    display: flex;
    flex-direction: column;
    gap: var(--paisa-space-2);
    max-height: calc(100vh - 380px);
    overflow-y: auto;

    @media screen and (max-width: 1023px) {
      max-height: 400px;
    }
  }

  .paisa-split-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--paisa-space-4);
  }

  .paisa-split-top-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--paisa-space-4);

    @media screen and (min-width: 1024px) {
      grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    }
  }

  .paisa-split-calendar-cell,
  .paisa-split-breakdown-cell {
    min-width: 0;
    margin-bottom: 0;
  }
</style>
