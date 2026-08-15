<script lang="ts">
  import * as cashFlow from "$lib/charts/cash_flow";
  import { financialColors } from "$lib/theme/chartPalette";
  import LastNMonths from "$lib/components/ui/LastNMonths.svelte";
  import TransactionCard from "$lib/components/transactions/TransactionCard.svelte";
  import * as expense from "$lib/charts/expense/monthly";
  import { enrichTrantionSequence, sortTrantionSequence } from "$lib/domain/transaction_sequence";
  import {
    ajax,
    formatCurrency,
    formatFloat,
    type Budget,
    type CashFlow,
    type Networth,
    type Posting,
    type Transaction,
    type TransactionSequence,
    type Legend,
    now,
    type GoalSummary,
    type AssetBreakdown
  } from "$lib/core/utils";
  import _ from "lodash";
  import { onMount } from "svelte";

  import BudgetCard from "$lib/components/finance/BudgetCard.svelte";
  import LevelItem from "$lib/components/ui/LevelItem.svelte";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";
  import { refresh } from "../../store";
  import UpcomingCard from "$lib/components/finance/UpcomingCard.svelte";
  import GoalSummaryCard from "$lib/components/finance/GoalSummaryCard.svelte";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import BalanceCard from "$lib/components/finance/BalanceCard.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import ResponsiveGrid from "$lib/components/layout/ResponsiveGrid.svelte";
  import MetricStrip from "$lib/components/layout/MetricStrip.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";

  let cashflowLegends: Legend[] = $state([]);
  let month = $state(now().format("YYYY-MM"));
  let goalSummaries: GoalSummary[] = $state([]);
  let transactionSequences: TransactionSequence[] = $state([]);
  let cashFlows: CashFlow[] = $state([]);
  let expenses: { [key: string]: Posting[] } = $state({});
  let xirr = $state(0);
  let networth: Networth = $state();
  let renderer: (data: Posting[]) => void = $state();
  let transactions: Transaction[] = $state([]);
  let budgetsByMonth: Record<string, Budget> = {};
  let currentBudget: Budget = $state();
  let isEmpty = $state(false);
  let checkingBalances: Record<string, AssetBreakdown> = $state({});

  let selectedExpenses: Posting[] = $derived(expenses[month] || []);
  let totalExpense = $derived(_.sumBy(selectedExpenses, (p) => p.amount));

  $effect(() => {
    if (renderer) {
      renderer(selectedExpenses);
    }
  });

  async function initDemo() {
    await ajax("/api/init", { method: "POST" });
    refresh();
  }

  onMount(async () => {
    ({
      expenses,
      cashFlows,
      goalSummaries,
      budget: { budgetsByMonth },
      transactionSequences,
      networth: { networth, xirr },
      checkingBalances: { asset_breakdowns: checkingBalances },
      transactions
    } = await ajax("/api/dashboard"));

    goalSummaries = _.sortBy(goalSummaries, (g) => -g.priority);

    if (_.isEmpty(transactions)) {
      isEmpty = true;
    } else {
      isEmpty = false;
    }

    const postings = _.chain(expenses).values().flatten().value();
    const z = expense.colorScale(postings);
    renderer = expense.renderCurrentExpensesBreakdown(z);
    currentBudget = budgetsByMonth[month];

    const { renderer: cashflowRenderer, legends } = cashFlow.renderMonthlyFlow(
      "#d3-current-cash-flow",
      {
        rotate: false,
        balance: _.last(cashFlows)?.balance || 0
      }
    );
    cashflowRenderer(cashFlows);
    cashflowLegends = legends;
    transactionSequences = _.take(
      sortTrantionSequence(enrichTrantionSequence(transactionSequences)),
      16
    );
  });
</script>

{#if isEmpty}
  <Page width="standard">
    <Card padding="lg">
      <ZeroState item={false}>
        <div class="has-text-left">
          <p class="mb-3">
            Looks like you are new here, you can either get started or look at a demo setup
          </p>
          <div class="mb-4">
            <h2 class="is-size-5 has-text-weight-bold mb-2">I want to get started</h2>
            <ol class="ml-5 mb-4">
              <li>
                Go to <a href="/more/config">configuration</a> page and set your default currency and locale.
              </li>
              <li>
                Go to <a href="/ledger/editor">editor</a> page and start adding transactions to your journal.
              </li>
            </ol>
            <h2 class="is-size-5 has-text-weight-bold mb-2">I want to view a Demo</h2>
            <ol class="ml-5 mb-4">
              <li>
                Click the button below to load a demo setup. This will load a demo journal with relevant config.
              </li>
              <li>
                Once you are done playing around, you can go to <a href="/ledger/editor">editor</a> page and select all the content and delete them.
              </li>
              <li>
                Go to <a href="/more/config">configuration</a> page and click the reset to defaults button.
              </li>
            </ol>

            <Button variant="primary" size="md" onclick={() => initDemo()}>Setup Demo</Button>
          </div>
        </div>
      </ZeroState>
    </Card>
  </Page>
{:else}
  <Page width="fluid">
    <!-- Row 1: Primary Financial KPIs -->
    {#if networth}
      <Section title="Assets" titleHref="/assets/networth">
        <MetricStrip cols={4}>
          <LevelItem
            narrow
            title="Net worth"
            value={formatCurrency(networth.balanceAmount)}
          />
          <LevelItem
            narrow
            title="Net Investment"
            value={formatCurrency(networth.netInvestmentAmount)}
          />
          <LevelItem
            narrow
            title="Gain / Loss"
            color={networth.gainAmount >= 0 ? financialColors.gainText : financialColors.lossText}
            value={formatCurrency(networth.gainAmount)}
          />
          <LevelItem narrow title="XIRR" value={formatFloat(xirr)} />
        </MetricStrip>
      </Section>
    {/if}

    <!-- Row 1B: Checking Balance Snapshot -->
    {#if !_.isEmpty(checkingBalances)}
      <Section title="Checking Balance" titleHref="/assets/balance">
        <ResponsiveGrid cols="auto-fit" minColWidth="160px" gap={2}>
          {#each _.values(checkingBalances) as assetBreakdown}
            <BalanceCard {assetBreakdown} />
          {/each}
        </ResponsiveGrid>
      </Section>
    {/if}

    <!-- Row 2: Primary Visualizations (Cash Flow ~60% + Expenses ~40%) -->
    <div class="paisa-dashboard-row paisa-dashboard-visualizations">
      <Section title="Cash Flow" titleHref="/cash_flow/monthly" class="paisa-dashboard-cell">
        <ZeroState item={cashFlows}>
          <strong>Oops!</strong> You have not made any transactions in the last 3 months.
        </ZeroState>

        <LegendCard legends={cashflowLegends} clazz="mb-2 paisa-overflow-x-auto" />

        <ChartFrame type="dashboard-timeline">
          <svg
            class:is-not-visible={_.isEmpty(cashFlows)}
            id="d3-current-cash-flow"
            height="250"
            width="100%"
          />
        </ChartFrame>
      </Section>

      <Section title="Expenses" titleHref="/expense/monthly">
        {#snippet action()}
          <LastNMonths n={3} bind:value={month} />
        {/snippet}

        <div class="mb-3 is-flex is-align-items-center">
          <span class="has-text-grey is-size-7 mr-2">Total Monthly:</span>
          <span class="is-size-5 has-text-weight-bold" style="color: {financialColors.expenses}">
            {formatCurrency(totalExpense)}
          </span>
        </div>
        <ZeroState item={selectedExpenses}>
          <strong>Hurray!</strong> You have no expenses this month.
        </ZeroState>
        <ChartFrame type="category" rows={Math.min(8, selectedExpenses.length || 4)}>
          <svg id="d3-current-month-breakdown" width="100%" />
        </ChartFrame>
      </Section>
    </div>

    <!-- Row 3: Operational Data (Budget ~35% + Recent Transactions ~65%) -->
    <div class="paisa-dashboard-row paisa-dashboard-operations">
      {#if currentBudget}
        <Section title="Budget" titleHref="/expense/budget">
          <div class="paisa-dashboard-budget-list">
            {#each currentBudget.accounts as accountBudget (accountBudget)}
              <BudgetCard compact {accountBudget} />
            {/each}
          </div>
        </Section>
      {/if}

      {#if !_.isEmpty(transactions)}
        <Section title="Recent Transactions" titleHref="/ledger/transaction">
          <ResponsiveGrid variant="transactions" gap={2}>
            {#each _.take(transactions, 12) as t}
              <TransactionCard {t} />
            {/each}
          </ResponsiveGrid>
        </Section>
      {/if}
    </div>

    <!-- Row 4: Long-Term & Recurring (Goals ~50% + Recurring ~50%) -->
    <div class="paisa-dashboard-row paisa-dashboard-longterm">
      {#if !_.isEmpty(goalSummaries)}
        <Section title="Goals" titleHref="/more/goals">
          <div class="paisa-dashboard-goals-list">
            {#each goalSummaries as goal}
              <GoalSummaryCard {goal} small />
            {/each}
          </div>
        </Section>
      {/if}

      {#if !_.isEmpty(transactionSequences)}
        <Section title="Recurring" titleHref="/cash_flow/recurring">
          <div class="paisa-dashboard-recurring-grid paisa-overflow-hidden">
            {#each transactionSequences as ts (ts)}
              <UpcomingCard transactionSequece={ts} />
            {/each}
          </div>
        </Section>
      {/if}
    </div>
  </Page>
{/if}

<style lang="scss">
  .paisa-dashboard-row {
    display: grid;
    gap: var(--paisa-space-4);
    width: 100%;
    margin-bottom: var(--paisa-space-5);

    > :global(*) {
      min-width: 0;
      margin-bottom: 0;
    }
  }

  .paisa-dashboard-visualizations {
    grid-template-columns: 1fr;
    @media screen and (min-width: 1024px) {
      grid-template-columns: minmax(0, 3fr) minmax(280px, 2fr);
    }
  }

  .paisa-dashboard-operations {
    grid-template-columns: 1fr;
    @media screen and (min-width: 1024px) {
      grid-template-columns: minmax(260px, 1fr) minmax(0, 2fr);
    }
  }

  .paisa-dashboard-longterm {
    grid-template-columns: 1fr;
    @media screen and (min-width: 1024px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
