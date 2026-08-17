<script lang="ts">
  import type { ScaleOrdinal } from "d3";
  import { onDestroy, onMount } from "svelte";
  import _ from "lodash";
  import {
    ajax,
    firstName,
    secondName,
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
  import type { ChartHandle } from "$lib/charts/resize";
  import { iconify } from "$lib/core/icon";
  import { financialColors } from "$lib/theme/chartPalette";
  import { dateRange, month, setAllowedDateRange } from "../../../../store";
  import { writable } from "svelte/store";
  import LevelItem from "$lib/components/ui/LevelItem.svelte";
  import dayjs from "dayjs";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import MetricStrip from "$lib/components/layout/MetricStrip.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";

  let groups = writable([]);
  let z: ScaleOrdinal<string, string, never> | undefined = $state(),
    renderer: ((ps: Posting[]) => void) | undefined = $state(),
    expenseBreakdown: ChartHandle<Posting[]> | null = $state(null),
    expenses: Posting[] | undefined = $state(),
    grouped_expenses: Record<string, Posting[]> | undefined = $state(),
    grouped_incomes: Record<string, Posting[]> | undefined = $state(),
    grouped_investments: Record<string, Posting[]> | undefined = $state(),
    grouped_taxes: Record<string, Posting[]> | undefined = $state(),
    destroy: () => void,
    resizeTimeline: ((dim: { width: number; height: number }) => void) | undefined;

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
    expenseBreakdown?.destroy();
  });

  onMount(async () => {
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
    ({ z, destroy, legends, resize: resizeTimeline } = renderMonthlyExpensesTimeline(
      expenses,
      groups,
      month,
      dateRange,
    ));
    expenseBreakdown = createCurrentExpensesBreakdown(z);
    renderer = expenseBreakdown.update;
  });

  function sum(postings: Posting[], sign = 1) {
    return sign * _.sumBy(postings, (p: Posting) => p.amount);
  }

  function sumCurrency(postings: Posting[], sign = 1) {
    return formatCurrency(sign * _.sumBy(postings, (p: Posting) => p.amount));
  }

  let current_month_expenses: Posting[] = $derived(
    _.chain((grouped_expenses && grouped_expenses[$month]) || [])
      .filter((e: Posting) => _.includes($groups, secondName(e.account)))
      .sortBy((e: Posting) => e.date)
      .reverse()
      .value(),
  );
  let selectedMonthExpenses: Posting[] = $derived(
    grouped_expenses?.[$month] || [],
  );
  let hasSelectedMonthExpenses = $derived(selectedMonthExpenses.length > 0);
  let hasExpenses = $derived((expenses?.length ?? 0) > 0);

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
        const grossIncome = sum(incomes, -1);
        const netIncomeAmount = grossIncome - sum(taxes);
        netIncome = formatCurrency(netIncomeAmount) + " net income";
        taxRate =
          grossIncome === 0
            ? ""
            : formatPercentage(sum(taxes) / grossIncome) + " on income";
        expenseRate =
          netIncomeAmount === 0
            ? ""
            : formatPercentage(sum(expenses) / netIncomeAmount) +
              " of net income";
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
          {#if _.isEmpty(current_month_expenses)}
            <div class="paisa-empty-list-message has-text-grey is-size-7 p-3">
              No recent expenses this month.
            </div>
          {:else}
            {#each current_month_expenses as exp}
              <a
                class="paisa-recent-expense-row"
                href={postingUrl(exp)}
                style="--paisa-row-accent: {z?.(secondName(exp.account)) ||
                  'var(--paisa-border-strong)'}"
              >
                <span class="paisa-recent-expense-main">
                  <span class="paisa-recent-expense-payee">{exp.payee}</span>
                  <span class="paisa-recent-expense-date"
                    >{exp.date.format("DD MMM YYYY")}</span
                  >
                </span>
                <span class="paisa-recent-expense-meta">
                  <span class="paisa-recent-expense-category custom-icon">
                    {iconify(restName(exp.account), {
                      group: firstName(exp.account),
                    })}
                  </span>
                  <span class="paisa-recent-expense-amount"
                    >{formatCurrency(exp.amount)}</span
                  >
                </span>
              </a>
            {/each}
          {/if}
        </div>
      </Section>
    </div>

    <!-- Main Analysis Panel: Calendar, Category Breakdown, Timeline -->
    <div class="paisa-split-main">
      <div class="paisa-split-top-row">
        <!-- Calendar -->
        <Section title="Calendar">
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
        <Section title="Category Breakdown">
          <ChartFrame
            type="category"
            rows={Math.min(8, selectedMonthExpenses.length || 4)}
            empty={!hasSelectedMonthExpenses}
            emptyMessage="No expenses this month"
            preserveChildren
            onresize={(dim) => expenseBreakdown?.resize(dim)}
          >
            <svg id="d3-current-month-breakdown" width="100%" />
          </ChartFrame>
        </Section>
      </div>

      <!-- Monthly Expense Timeline -->
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
    max-height: min(720px, calc(100vh - 300px));
    min-height: 280px;
    overflow-y: auto;
    padding-right: var(--paisa-space-1);

    @media screen and (max-width: 1023px) {
      max-height: 400px;
      min-height: 0;
    }
  }

  .paisa-recent-expense-row {
    display: flex;
    flex-direction: column;
    gap: var(--paisa-space-1);
    min-height: 54px;
    padding: var(--paisa-space-2) var(--paisa-space-3);
    border-left: 2px solid var(--paisa-row-accent);
    border-radius: var(--paisa-radius-md);
    border-top: 1px solid var(--paisa-border-default);
    border-right: 1px solid var(--paisa-border-default);
    border-bottom: 1px solid var(--paisa-border-default);
    background: var(--paisa-surface-card);
    color: var(--paisa-text-secondary);
    text-decoration: none;
  }

  .paisa-recent-expense-row:hover {
    border-color: var(--paisa-border-strong);
    color: var(--paisa-text-primary);
  }

  .paisa-recent-expense-main,
  .paisa-recent-expense-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--paisa-space-2);
    min-width: 0;
  }

  .paisa-recent-expense-payee,
  .paisa-recent-expense-category {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .paisa-recent-expense-payee {
    font-size: var(--paisa-font-size-xs);
    color: var(--paisa-text-secondary);
  }

  .paisa-recent-expense-date,
  .paisa-recent-expense-category {
    flex: 0 0 auto;
    font-size: var(--paisa-font-size-xs);
    color: var(--paisa-text-muted);
  }

  .paisa-recent-expense-category {
    flex: 1 1 auto;
  }

  .paisa-recent-expense-amount {
    flex: 0 0 auto;
    font-weight: var(--paisa-font-weight-semibold);
    color: var(--paisa-text-primary);
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

    > :global(*) {
      min-width: 0;
      margin-bottom: 0;
    }
  }
</style>
