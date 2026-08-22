<script lang="ts">
  import { renderBudget } from "$lib/charts/budget";
  import { iconify } from "$lib/core/icon";
  import type { Action } from "svelte/action";
  import { firstName, formatCurrency, restName, type AccountBudget, tooltip } from "$lib/core/utils";
  import _ from "lodash";
  import Card from "$lib/components/ui/Card.svelte";

  interface Props {
    compact?: boolean;
    accountBudget: AccountBudget;
  }

  let { compact = false, accountBudget }: Props = $props();

  function canShow(accountBudget: AccountBudget): boolean {
    return accountBudget.forecast !== 0 || accountBudget.actual !== 0;
  }

  function availableStatus(accountBudget: AccountBudget): "positive" | "negative" | "neutral" {
    if (accountBudget.available === 0) {
      return "neutral";
    }
    return accountBudget.available > 0 ? "positive" : "negative";
  }

  const statusClasses = {
    positive: "bg-[var(--paisa-success-light)] text-[var(--paisa-success)]",
    negative: "bg-[var(--paisa-danger-light)] text-[var(--paisa-danger)]",
    neutral: "bg-[var(--paisa-info-light)] text-[var(--paisa-info)]",
  } as const;

  const chart: Action<HTMLElement, { ab: AccountBudget }> = (element, props) => {
    renderBudget(element, props.ab);
    return {};
  };

  let tooltipContent = $derived(
    tooltip(
      accountBudget.expenses.map((e) => {
        return [
          e.date.format("DD MMM YYYY"),
          [e.payee, "is-clipped"],
          [formatCurrency(e.amount), "has-text-weight-bold has-text-right"],
        ];
      }),
    ),
  );

  let availableTone = $derived(availableStatus(accountBudget));
</script>

<Card
  padding="sm"
  variant="flat"
  class="budget-card m-0"
  data-tippy-content={_.isEmpty(accountBudget.expenses) ? null : tooltipContent}
>
  <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <div
      class="min-w-0 truncate pl-2 text-sm font-semibold text-[var(--paisa-muted-foreground)] custom-icon"
      title={accountBudget.account}
    >
      {iconify(restName(accountBudget.account), { group: firstName(accountBudget.account) })}
    </div>

    <div class="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 pr-2">
      {#if !compact}
        <div class="flex items-baseline gap-1.5 text-sm tabular-nums">
          <span class="text-[var(--paisa-muted-foreground)]">Budget</span>
          <span class="font-semibold text-[var(--paisa-foreground)]">
            {formatCurrency(accountBudget.forecast)}
          </span>
        </div>
        <div class="flex items-baseline gap-1.5 text-sm tabular-nums">
          <span class="text-[var(--paisa-muted-foreground)]">Spent</span>
          <span class="font-semibold text-[var(--paisa-foreground)]">
            {formatCurrency(accountBudget.actual)}
          </span>
        </div>
      {/if}
      {#if !compact && accountBudget.rollover !== 0}
        <div class="flex items-baseline gap-1.5 text-sm tabular-nums">
          <span class="text-[var(--paisa-muted-foreground)]">Rollover</span>
          <span
            class="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[var(--paisa-warning-light)] text-[var(--paisa-warning)]"
          >
            {formatCurrency(accountBudget.rollover)}
          </span>
        </div>
      {/if}
      <div class="flex items-baseline gap-1.5 text-sm tabular-nums">
        <span class="text-[var(--paisa-muted-foreground)]">
          {accountBudget.available >= 0 ? "Available" : "Overspent"}
        </span>
        <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold {statusClasses[availableTone]}">
          {formatCurrency(Math.abs(accountBudget.available))}
        </span>
      </div>
    </div>
  </div>

  {#if canShow(accountBudget)}
    <div class="mt-3" use:chart={{ ab: accountBudget }}>
      <svg height="10" width="100%"></svg>
    </div>
  {/if}
</Card>
