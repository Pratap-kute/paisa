<script lang="ts">
  import BudgetCard from "$lib/components/finance/BudgetCard.svelte";
  import {
    ajax,
    formatCurrency,
    type AccountBudget,
    type Budget,
    helpUrl,
    now,
    isMobile
  } from "$lib/core/utils";
  import _ from "lodash";
  import { onMount } from "svelte";
  import { month, setAllowedDateRange } from "../../../../store";
  import COLORS from "$lib/core/colors";
  import LevelItem from "$lib/components/ui/LevelItem.svelte";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";

  const monthStart = now().startOf("month");
  let budgetsByMonth: Record<string, Budget> = $state({});
  let checkingBalance: number = $state(), availableForBudgeting: number = $state();
  let isEmpty = $state(false);

  let currentMonthBudget: Budget = $derived(budgetsByMonth[$month]);
  let currentMonthAccountBudgets: AccountBudget[] = $derived(
    budgetsByMonth[$month]?.accounts || []
  );

  onMount(async () => {
    ({ budgetsByMonth, checkingBalance, availableForBudgeting } = await ajax("/api/budget"));
    setAllowedDateRange(
      _.chain(budgetsByMonth)
        .values()
        .flatten()
        .map((b) => b.date)
        .value()
    );

    if (_.isEmpty(budgetsByMonth)) {
      isEmpty = true;
    }
  });
</script>

<section class="section">
  <div class="container is-fluid">
    <div class="columns is-multiline is-variable is-2-desktop">
      {#if currentMonthBudget}
        <div class="column is-12">
          <nav class="level {isMobile() && 'grid-2'}">
            <LevelItem title="Checking Current Balance" value={formatCurrency(checkingBalance)} />
            <LevelItem
              title={availableForBudgeting >= 0 ? "Available for Budgeting" : "Budget Deficit"}
              color={availableForBudgeting >= 0 ? COLORS.gainText : COLORS.lossText}
              value={formatCurrency(Math.abs(availableForBudgeting))}
            />

            {#if currentMonthBudget.date.isSameOrAfter(monthStart)}
              <LevelItem
                title="Available for Spending"
                value={formatCurrency(currentMonthBudget.availableThisMonth)}
                subtitle="out of {formatCurrency(currentMonthBudget.forecast)} budgeted"
              />

              <LevelItem
                title="Projected Month End Balance"
                value={formatCurrency(currentMonthBudget.endOfMonthBalance)}
              />
            {/if}
          </nav>
        </div>
      {/if}
      <div class="column is-12">
        <ZeroState item={!isEmpty}>
          <strong>Oops!</strong> You haven't set a budget yet. Checkout the
          <a href={helpUrl("budget")}>docs</a> page to get started.
        </ZeroState>

        {#each currentMonthAccountBudgets as accountBudget (accountBudget)}
          <BudgetCard {accountBudget} />
        {/each}
      </div>
    </div>
  </div>
</section>
