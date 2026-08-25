<script lang="ts">
  import type { FYCapitalGain } from "$lib/domain/tax";
import { formatCurrency } from "$lib/shared/formatters/currency";
  const DATE_FORMAT = "DD MMM YYYY";

  interface Props {
    fyCapitalGain: FYCapitalGain;
  }

  let { fyCapitalGain }: Props = $props();

  function gainClass(value: number) {
    if (value > 0) return "text-[var(--paisa-positive)]";
    if (value < 0) return "text-[var(--paisa-negative)]";
    return "text-[var(--paisa-muted-foreground)]";
  }
</script>

<div class="border-t border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-2)] px-4 py-3">
  <div class="mb-2 flex items-center justify-between">
    <span class="text-xs font-semibold uppercase tracking-wider text-[var(--paisa-text-secondary)]">
      Realized Lots ({fyCapitalGain.posting_pairs.length})
    </span>
  </div>
  <div class="w-full overflow-x-auto rounded-[var(--paisa-radius-sm)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface)]">
    <table class="w-full min-w-[760px] border-collapse text-xs">
      <thead>
        <tr class="border-b border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-2)] text-left font-medium text-[var(--paisa-muted-foreground)]">
          <th class="px-3 py-2">Purchase Date</th>
          <th class="px-3 py-2 text-right">Purchase Price</th>
          <th class="px-3 py-2">Sell Date</th>
          <th class="px-3 py-2 text-right">Sell Price</th>
          <th class="px-3 py-2 text-right">Realized Gain</th>
          <th class="px-3 py-2 text-right">Taxable Gain</th>
          <th class="px-3 py-2 text-right">STCG Tax</th>
          <th class="px-3 py-2 text-right">LTCG Tax</th>
          <th class="px-3 py-2 text-right">Slab Tax</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[var(--paisa-border-subtle)]">
        {#each fyCapitalGain.posting_pairs as pp}
          <tr class="transition-colors hover:bg-[var(--paisa-surface-hover)]">
            <td class="whitespace-nowrap px-3 py-2 text-[var(--paisa-text-primary)]">
              {pp.purchase.date.format(DATE_FORMAT)}
            </td>
            <td class="whitespace-nowrap px-3 py-2 text-right tabular-nums text-[var(--paisa-text-secondary)]">
              {formatCurrency(pp.purchase.amount)}
            </td>
            <td class="whitespace-nowrap px-3 py-2 text-[var(--paisa-text-primary)]">
              {pp.sell.date.format(DATE_FORMAT)}
            </td>
            <td class="whitespace-nowrap px-3 py-2 text-right tabular-nums text-[var(--paisa-text-secondary)]">
              {formatCurrency(-pp.sell.amount)}
            </td>
            <td class="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums {gainClass(pp.tax.gain)}">
              {formatCurrency(pp.tax.gain)}
            </td>
            <td class="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums {gainClass(pp.tax.taxable)}">
              {formatCurrency(pp.tax.taxable)}
            </td>
            <td class="whitespace-nowrap px-3 py-2 text-right tabular-nums {pp.tax.short_term !== 0 ? 'font-semibold text-[var(--paisa-text-primary)]' : 'text-[var(--paisa-muted-foreground)]'}">
              {formatCurrency(pp.tax.short_term)}
            </td>
            <td class="whitespace-nowrap px-3 py-2 text-right tabular-nums {pp.tax.long_term !== 0 ? 'font-semibold text-[var(--paisa-text-primary)]' : 'text-[var(--paisa-muted-foreground)]'}">
              {formatCurrency(pp.tax.long_term)}
            </td>
            <td class="whitespace-nowrap px-3 py-2 text-right tabular-nums {pp.tax.slab !== 0 ? 'font-semibold text-[var(--paisa-text-primary)]' : 'text-[var(--paisa-muted-foreground)]'}">
              {formatCurrency(pp.tax.slab)}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
