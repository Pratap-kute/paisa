<script lang="ts">
  import { formatCurrency, type FYCapitalGain } from "$lib/core/utils";
  const DATE_FORMAT = "DD MMM YYYY";

  interface Props {
    fyCapitalGain: FYCapitalGain;
  }

  let { fyCapitalGain }: Props = $props();
</script>

<div class="border-t border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-muted)] p-3">
  <div class="w-full overflow-x-auto">
    <table class="w-full min-w-[720px] border-collapse text-xs">
      <thead>
        <tr class="border-b border-[var(--paisa-border-subtle)] text-left text-[var(--paisa-muted-foreground)]">
          <th class="px-2 py-1.5">Purchase Date</th>
          <th class="px-2 py-1.5 text-right">Purchase Price</th>
          <th class="px-2 py-1.5">Sell Date</th>
          <th class="px-2 py-1.5 text-right">Sell Price</th>
          <th class="px-2 py-1.5 text-right">Gain</th>
          <th class="px-2 py-1.5 text-right">Taxable Gain</th>
          <th class="px-2 py-1.5 text-right">Short Term Tax</th>
          <th class="px-2 py-1.5 text-right">Long Term Tax</th>
          <th class="px-2 py-1.5 text-right">Taxable at Slab Rate</th>
        </tr>
      </thead>
      <tbody>
        {#each fyCapitalGain.posting_pairs as pp}
          <tr class="border-b border-[var(--paisa-border-subtle)] last:border-b-0">
            <td class="px-2 py-1.5">{pp.purchase.date.format(DATE_FORMAT)}</td>
            <td class="px-2 py-1.5 text-right tabular-nums">{formatCurrency(pp.purchase.amount)}</td>
            <td class="px-2 py-1.5">{pp.sell.date.format(DATE_FORMAT)}</td>
            <td class="px-2 py-1.5 text-right tabular-nums">{formatCurrency(-pp.sell.amount)}</td>
            <td class="px-2 py-1.5 text-right font-semibold tabular-nums">{formatCurrency(pp.tax.gain)}</td>
            <td class="px-2 py-1.5 text-right font-semibold tabular-nums">{formatCurrency(pp.tax.taxable)}</td>
            <td class="px-2 py-1.5 text-right font-semibold tabular-nums">{formatCurrency(pp.tax.short_term)}</td>
            <td class="px-2 py-1.5 text-right font-semibold tabular-nums">{formatCurrency(pp.tax.long_term)}</td>
            <td class="px-2 py-1.5 text-right font-semibold tabular-nums">{formatCurrency(pp.tax.slab)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
