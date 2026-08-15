<script lang="ts">
  import * as cashFlow from "$lib/charts/cash_flow";
  import COLORS from "$lib/core/colors";
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
  import MasonryGrid from "$lib/components/ui/MasonryGrid.svelte";
  import { refresh } from "../../store";
  import UpcomingCard from "$lib/components/finance/UpcomingCard.svelte";
  import GoalSummaryCard from "$lib/components/finance/GoalSummaryCard.svelte";
  import LegendCard from "$lib/components/ui/LegendCard.svelte";
  import BalanceCard from "$lib/components/finance/BalanceCard.svelte";

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

<section class="section" class:is-hidden={!isEmpty}>
  <div class="container is-fluid">
    <div class="columns">
      <div class="column is-12">
        <ZeroState item={!isEmpty}>
          <div class="has-text-left paisa-max-width-640">
            <p class="mb-2">
              Looks like you are new here, you can either get started or look at a demo setup
            </p>
            <div>
              <p class="is-size-4">I want to get started</p>
              <ol class="ml-5 mt-2 mb-4">
                <li>
                  Go to <a href="/more/config">configuration</a> page and set your default currency and
                  locale.
                </li>
                <li>
                  Go to <a href="/ledger/editor">editor</a> page and start adding transactions to your
                  journal.
                </li>
              </ol>
              <p class="is-size-4">I want to view a Demo</p>
              <p class="ml-3"></p>
              <ol class="ml-5 mt-2 mb-4">
                <li>
                  Click the button below to load a demo setup. This will load a demo journal with
                  relevant config.
                </li>
                <li>
                  Once you are done playing around, you can go to <a href="/ledger/editor">editor</a
                  > page and select all the content and delete them.
                </li>
                <li>
                  Go to <a href="/more/config">configuration</a> page and click the reset to defaults
                  button.
                </li>
              </ol>

              <button type="button" onclick={(_e) => initDemo()} class="button is-link">Setup Demo</button>
            </div>
          </div>
        </ZeroState>
      </div>
    </div>
  </div>
</section>

<section class="section tab-networth" class:is-hidden={isEmpty}>
  <div class="container is-fluid">
    <div class="columns is-desktop is-align-items-start">
      <div class="column is-4-desktop is-12-tablet">
        <div class="mb-5">
          <div class="content">
            <p class="subtitle">
              <a class="secondary-link has-text-grey" href="/assets/networth">Assets</a>
            </p>
            <div class="content">
              <div>
                {#if networth}
                  <nav class="level grid-2">
                    <LevelItem
                      narrow
                      title="Net worth"
                      color={COLORS.primary}
                      value={formatCurrency(networth.balanceAmount)}
                    />

                    <LevelItem
                      narrow
                      title="Net Investment"
                      color={COLORS.secondary}
                      value={formatCurrency(networth.netInvestmentAmount)}
                    />
                  </nav>
                  <nav class="level grid-2">
                    <LevelItem
                      narrow
                      title="Gain / Loss"
                      color={networth.gainAmount >= 0 ? COLORS.gainText : COLORS.lossText}
                      value={formatCurrency(networth.gainAmount)}
                    />

                    <LevelItem narrow title="XIRR" value={formatFloat(xirr)} />
                  </nav>
                {/if}
              </div>
            </div>
          </div>
        </div>

        {#if !_.isEmpty(checkingBalances)}
          <div class="mb-5">
            <article>
              <div class="content">
                <p class="subtitle">
                  <a class="secondary-link has-text-grey" href="/assets/balance">Checking Balance</a>
                </p>
                <div class="content">
                  <MasonryGrid gap={10} maxStretchColumnSize={400} align="stretch">
                    {#each _.values(checkingBalances) as assetBreakdown}
                      <div class="is-flex-grow-1">
                        <BalanceCard {assetBreakdown} />
                      </div>
                    {/each}
                  </MasonryGrid>
                </div>
              </div>
            </article>
          </div>
        {/if}

        <div class="mb-5">
          <article class="paisa-min-width-0">
            <p class="subtitle">
              <a class="secondary-link has-text-grey" href="/cash_flow/monthly">Cash Flow</a>
            </p>
            <div class="content box px-2 pb-0">
              <ZeroState item={cashFlows}>
                <strong>Oops!</strong> You have not made any transactions in the last 3 months.
              </ZeroState>

              <LegendCard legends={cashflowLegends} clazz="mb-2 paisa-overflow-x-auto" />

              <svg
                class:is-not-visible={_.isEmpty(cashFlows)}
                id="d3-current-cash-flow"
                height="250"
                width="100%"
              />
            </div>
          </article>
        </div>
        {#if currentBudget}
          <div class="mb-5">
            <div class="content">
              <p class="subtitle">
                <a class="secondary-link has-text-grey" href="/expense/budget">Budget</a>
              </p>
              <div class="content">
                <div>
                  {#each currentBudget.accounts as accountBudget (accountBudget)}
                    <BudgetCard compact {accountBudget} />
                  {/each}
                </div>
              </div>
            </div>
          </div>
        {/if}
        {#if !_.isEmpty(goalSummaries)}
          <div class="mb-5">
            <article>
              <div class="content">
                <p class="subtitle">
                  <a class="secondary-link has-text-grey" href="/more/goals">Goals</a>
                </p>
                <div class="content">
                  {#each goalSummaries as goal}
                    <GoalSummaryCard {goal} small />
                  {/each}
                </div>
              </div>
            </article>
          </div>
        {/if}
      </div>
      <div class="column is-8-desktop is-12-tablet">
        <div class="mb-5">
          <article>
            <p class="subtitle is-flex is-justify-content-space-between is-align-items-end">
              <span
                ><a class="secondary-link has-text-grey" href="/expense/monthly">Expenses</a>
                <span class="is-size-5 has-text-weight-bold px-2" style="color: {COLORS.expenses}"
                  >{formatCurrency(totalExpense)}</span
                ></span
              >
              <LastNMonths n={3} bind:value={month} />
            </p>
            <div class="content box px-3">
              <ZeroState item={selectedExpenses}>
                <strong>Hurray!</strong> You have no expenses this month.
              </ZeroState>
              <svg id="d3-current-month-breakdown" width="100%" />
            </div>
          </article>
        </div>
        {#if !_.isEmpty(transactionSequences)}
          <div class="mb-5">
            <article>
              <div class="content">
                <p class="subtitle">
                  <a class="secondary-link has-text-grey" href="/cash_flow/recurring">Recurring</a>
                </p>
                <div class="content box">
                  <div
                    class="paisa-grid dashboard-recurring-grid paisa-overflow-hidden"
                    style="grid-auto-rows: 0px; grid-template-columns: repeat(auto-fit, minmax(130px, 150px));"
                  >
                    {#each transactionSequences as ts (ts)}
                      <UpcomingCard transactionSequece={ts} />
                    {/each}
                  </div>
                </div>
              </div>
            </article>
          </div>
        {/if}
        {#if !_.isEmpty(transactions)}
          <div class="mb-5">
            <article>
              <div class="content">
                <p class="subtitle">
                  <a class="secondary-link has-text-grey" href="/ledger/transaction"
                    >Recent Transactions</a
                  >
                </p>
                <div>
                  <MasonryGrid gap={10} maxStretchColumnSize={500} align="stretch">
                    {#each _.take(transactions, 20) as t}
                      <div class="mr-3 is-flex-grow-1">
                        <TransactionCard {t} />
                      </div>
                    {/each}
                  </MasonryGrid>
                </div>
              </div>
            </article>
          </div>
        {/if}
      </div>
    </div>
  </div>
</section>

<style lang="scss">
  p.subtitle {
    margin-bottom: 0.5rem !important;
  }

  p.subtitle a.secondary-link {
    text-transform: uppercase;
    font-size: 1rem;
  }
</style>
