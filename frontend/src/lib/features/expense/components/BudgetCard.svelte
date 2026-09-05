<script lang="ts">
import { formatCurrency } from "$lib/shared/formatters/currency";
import { restName } from "$lib/domain/account";
import { tooltip } from "$lib/shared/charts/tooltip";
import type { AccountBudget } from "$lib/domain/cash_flow";
import { iconify } from "$lib/shared/ui/icon";
import { firstName } from "$lib/domain/account";
import Card from "$lib/shared/ui/Card.svelte";
import Tooltip from "$lib/shared/ui/Tooltip.svelte";

interface Props {
  compact?: boolean;
  accountBudget: AccountBudget;
}

let { compact = false, accountBudget }: Props = $props();

function canShow(accountBudget: AccountBudget): boolean {
  return accountBudget.forecast !== 0 || accountBudget.actual !== 0;
}

function availableStatus(
  accountBudget: AccountBudget,
): "positive" | "negative" | "neutral" {
  if (accountBudget.available === 0) {
    return "neutral";
  }
  return accountBudget.available > 0 ? "positive" : "negative";
}

const statusClasses = {
  positive: "bg-positive-subtle text-positive",
  negative: "bg-negative-subtle text-negative",
  neutral: "bg-primary-subtle text-primary",
} as const;

let tooltipContent = $derived(
  tooltip(
    accountBudget.expenses.map((e) => {
      return [
        e.date.format("DD MMM YYYY"),
        [e.payee, "truncate"],
        [formatCurrency(e.amount), "paisa-text-bold paisa-text-right"],
      ];
    }),
  ),
);

let availableTone = $derived(availableStatus(accountBudget));
let progressMax = $derived(
  Math.max(
    0,
    accountBudget.forecast,
    accountBudget.actual,
    accountBudget.actual - accountBudget.rollover,
  ),
);
let rolloverUsed = $derived(
  accountBudget.rollover > 0 && accountBudget.actual > accountBudget.forecast
    ? Math.min(
      accountBudget.actual - accountBudget.forecast,
      accountBudget.rollover,
    )
    : 0,
);
let overspent = $derived(
  accountBudget.actual > accountBudget.forecast
    ? Math.max(
      accountBudget.actual - accountBudget.forecast -
        Math.max(accountBudget.rollover, 0),
      0,
    )
    : 0,
);
let withinBudget = $derived(
  Math.min(accountBudget.forecast, accountBudget.actual),
);
let widthPercent = $derived((amount: number) =>
  progressMax > 0
    ? `${Math.min(100, Math.max(0, (amount / progressMax) * 100))}%`
    : "0%"
);
</script>

<Tooltip content={accountBudget.expenses.length === 0 ? null : tooltipContent}>
{#snippet children(tooltipProps)}
<Card {...tooltipProps} padding="sm" variant="flat" class="m-0">
  <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <div
      class="min-w-0 truncate pl-2 text-sm font-semibold text-muted-foreground custom-icon"
      title={accountBudget.account}
    >
      {iconify(restName(accountBudget.account), { group: firstName(accountBudget.account) })}
    </div>

    <div class="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 pr-2">
      {#if !compact}
        <div class="flex items-baseline gap-1.5 text-sm tabular-nums">
          <span class="text-muted-foreground">Budget</span>
          <span class="font-semibold text-foreground">
            {formatCurrency(accountBudget.forecast)}
          </span>
        </div>
        <div class="flex items-baseline gap-1.5 text-sm tabular-nums">
          <span class="text-muted-foreground">Spent</span>
          <span class="font-semibold text-foreground">
            {formatCurrency(accountBudget.actual)}
          </span>
        </div>
      {/if}
      {#if !compact && accountBudget.rollover !== 0}
        <div class="flex items-baseline gap-1.5 text-sm tabular-nums">
          <span class="text-muted-foreground">Rollover</span>
          <span
            class="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-warning-subtle text-warning"
          >
            {formatCurrency(accountBudget.rollover)}
          </span>
        </div>
      {/if}
      <div class="flex items-baseline gap-1.5 text-sm tabular-nums">
        <span class="text-muted-foreground">
          {accountBudget.available >= 0 ? "Available" : "Overspent"}
        </span>
        <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold {statusClasses[availableTone]}">
          {formatCurrency(Math.abs(accountBudget.available))}
        </span>
      </div>
    </div>
  </div>

  {#if canShow(accountBudget)}
    <div class="relative mt-3 h-2 overflow-hidden rounded-full bg-[var(--paisa-border-subtle)]">
      <div
        class="absolute inset-y-0 left-0 rounded-full bg-negative"
        style="width: {widthPercent(withinBudget + rolloverUsed + overspent)}"
      ></div>
      <div
        class="absolute inset-y-0 left-0 rounded-full bg-warning"
        style="width: {widthPercent(withinBudget + rolloverUsed)}"
      ></div>
      <div
        class="absolute inset-y-0 left-0 rounded-full bg-positive"
        style="width: {widthPercent(withinBudget)}"
      ></div>
      <div
        class="absolute inset-y-[-1px] w-px bg-[var(--paisa-foreground)] opacity-45"
        style="left: {widthPercent(accountBudget.forecast)}"
        aria-hidden="true"
      ></div>
    </div>
  {/if}
</Card>
{/snippet}
</Tooltip>
