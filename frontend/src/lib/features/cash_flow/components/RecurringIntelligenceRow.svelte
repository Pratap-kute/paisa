<script lang="ts">
import { obscure } from "$lib/shared/state/persisted";
import { formatCommodityAmount } from "$lib/shared/formatters/currency";
import type { RecurringAnalysis } from "$lib/domain/recurring_analysis";
import { formatPercentage } from "$lib/shared/formatters/currency";
import Button from "$lib/shared/ui/Button.svelte";
import { postingUrl } from "$lib/shared/browser/navigation";
interface Props {
  item: RecurringAnalysis;
  busy?: boolean;
  readonly?: boolean;
  onconfirm?: () => void;
  onreject?: () => void;
}
let { item, busy = false, readonly = false, onconfirm, onreject }: Props =
  $props();
let amountsById = $derived(
  new Map(item.occurrences.map((o) => [o.transaction.id, o.amount])),
);
function money(value: number | undefined) {
  return formatCommodityAmount(value, item.commodity, $obscure);
}
</script>

<div class="min-w-0 py-4" data-testid="recurring-intelligence-row">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div class="min-w-0 flex-1">
      <h3 class="break-words text-sm font-semibold text-foreground">{item.displayName}</h3>
      <p class="text-xs text-muted-foreground">{item.confirmed ? "" : "Likely "}{item.effectiveCadence} · {item.transactions.length} occurrences · {item.kind ?? "Mixed ledger transaction"}</p>
      {#if item.expectedDate}
        <p class="mt-1 text-sm">{#if item.windowStart?.isSame(item.windowEnd, "day")}Expected {item.expectedDate.format("D MMM YYYY")}{:else}Expected around {item.windowStart?.format("D MMM")}–{item.windowEnd?.format("D MMM YYYY")}{/if}</p>
      {:else}<p class="mt-1 text-sm text-muted-foreground">Not enough timing evidence to predict the next occurrence.</p>{/if}
    </div>
    <p class="shrink-0 text-sm font-semibold tabular-nums">{item.approximate ? "Typical: ~" : ""}{formatCommodityAmount(item.expectedCashOutflowAmount ?? item.expectedAmount, item.cashCommodity ?? item.commodity, $obscure)}</p>
  </div>
  {#if item.expectedCashOutflowAmount !== undefined && item.expectedExpenseAmount !== undefined && item.expectedCashOutflowAmount !== item.expectedExpenseAmount}<p class="mt-1 text-xs text-muted-foreground">Expense component: {money(item.expectedExpenseAmount)} · The upcoming amount includes account repayments or transfers.</p>{/if}
  {#if item.amountChange}
    <p class="mt-2 text-sm text-warning">Amount {item.amountChange.difference > 0 ? "increased" : "decreased"} from {money(item.amountChange.previous)} to {money(item.amountChange.latest)}{item.amountChange.percentage !== undefined ? ` (${formatPercentage($obscure ? 0 : item.amountChange.percentage / 100, 1)})` : ""}.</p>
  {/if}
  {#if item.lifecycle === "possibly-stopped"}<p class="mt-1 text-sm text-warning">Possibly stopped · No recent payment found</p>
  {:else if item.flags.laterThanUsual}<p class="mt-1 text-sm text-warning">Later than usual · Expected payment not found</p>
  {:else if item.lifecycle === "new" && item.confirmed}<p class="mt-1 text-sm">Newly established recurring pattern</p>{/if}
  {#if item.flags.cadenceChanged}<p class="mt-1 text-sm text-warning">Timing changed from the earlier pattern.</p>{/if}
  {#if item.scheduleError}<p class="mt-1 text-sm text-warning">{item.scheduleError}</p>{/if}
  <details class="mt-2 text-sm">
    <summary class="cursor-pointer text-primary">View history and pattern details</summary>
    <p class="mt-2 text-xs text-muted-foreground">Last seen {item.lastDate.format("D MMM YYYY")} · Timing evidence: {item.reliability}</p>
    <p class="text-xs">Typical {money(item.typicalAmount)} · Latest {money(item.latestAmount)}</p>
    {#if !item.confirmed}<p class="text-xs text-muted-foreground">{item.reasons.join(" · ")}</p>{/if}
    <ul class="mt-2 space-y-1">
      {#each item.transactions as transaction (transaction.id)}
        <li class="flex flex-wrap justify-between gap-2">
          <a class="break-words text-primary hover:underline" href={postingUrl(transaction.postings[0])}>{transaction.date.format("D MMM YYYY")} · {transaction.payee}</a>
          <span class="tabular-nums">{money(amountsById.get(transaction.id))}</span>
        </li>
      {/each}
    </ul>
  </details>
  {#if !item.confirmed}
    <div class="mt-3 flex flex-wrap gap-2">
      <Button variant="primary" disabled={busy || readonly} ariaLabel={`Confirm ${item.displayName} recurring`} onclick={onconfirm}>Confirm recurring</Button>
      <Button disabled={busy} ariaLabel={`Mark ${item.displayName} not recurring`} onclick={onreject}>Not recurring</Button>
    </div>
  {/if}
</div>
