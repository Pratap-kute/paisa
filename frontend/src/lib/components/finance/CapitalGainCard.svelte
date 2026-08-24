<script lang="ts">
  import {
    formatCurrency,
    formatFloat,
    type CapitalGain,
  } from "$lib/core/utils";
  import CapitalGainDetailCard from "./CapitalGainDetailCard.svelte";
  import Toggleable from "$lib/shared/ui/Toggleable.svelte";
  import Card from "$lib/shared/ui/Card.svelte";

  interface Props {
    financialYear: string;
    capitalGains: CapitalGain[];
    hideHeader?: boolean;
  }

  let { financialYear, capitalGains, hideHeader = false }: Props = $props();

  let activeGains = $derived(
    capitalGains.filter((cg) => Boolean(cg.fy[financialYear])),
  );

  function gainClass(value: number) {
    if (value > 0) return "text-[var(--paisa-positive)]";
    if (value < 0) return "text-[var(--paisa-negative)]";
    return "text-[var(--paisa-muted-foreground)]";
  }
</script>

<Card padding="none" class="w-full overflow-hidden">
  {#if !hideHeader}
    {#snippet header()}
      <div class="flex items-center justify-between">
        <span class="text-base font-semibold text-[var(--paisa-foreground)]">
          {financialYear}
        </span>
        <span class="text-xs font-medium text-[var(--paisa-muted-foreground)]">
          {activeGains.length} {activeGains.length === 1 ? "asset" : "assets"} realized
        </span>
      </div>
    {/snippet}
  {/if}

  <div class="w-full overflow-x-auto">
    <table class="w-full min-w-[980px] border-collapse text-sm">
      <thead>
        <tr class="border-b border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-2)] text-left text-xs font-medium text-[var(--paisa-muted-foreground)]">
          <th class="w-10 px-3 py-2.5 text-center"></th>
          <th class="px-3 py-2.5">Asset Account</th>
          <th class="px-3 py-2.5">Tax Category</th>
          <th class="px-3 py-2.5 text-right">Units Sold</th>
          <th class="px-3 py-2.5 text-right">Purchase Cost</th>
          <th class="px-3 py-2.5 text-right">Sell Amount</th>
          <th class="px-3 py-2.5 text-right">Realized Gain</th>
          <th class="px-3 py-2.5 text-right">Taxable Gain</th>
          <th class="px-3 py-2.5 text-right">STCG Tax</th>
          <th class="px-3 py-2.5 text-right">LTCG Tax</th>
          <th class="px-3 py-2.5 text-right">Slab Tax</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-[var(--paisa-border-subtle)]">
        {#each activeGains as cg (cg.account)}
          {@const fy = cg.fy[financialYear]}
          <Toggleable>
            {#snippet toggle({ active, onclick })}
              <tr
                class="cursor-pointer transition-colors hover:bg-[var(--paisa-surface-hover)] {active
                  ? 'bg-[var(--paisa-surface-hover)]'
                  : ''}"
                onclick={(e) => onclick(e)}
              >
                <td class="px-3 py-2.5 text-center">
                  <span class="inline-flex h-5 w-5 items-center justify-center rounded text-[var(--paisa-primary)] transition-transform">
                    <i
                      class="fas {active ? 'fa-chevron-up' : 'fa-chevron-down'} text-xs"
                      aria-hidden="true"
                    ></i>
                  </span>
                </td>
                <td class="px-3 py-2.5 font-medium text-[var(--paisa-text-primary)]">
                  {cg.account}
                </td>
                <td class="px-3 py-2.5">
                  <span class="inline-flex items-center rounded-[var(--paisa-radius-sm)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-2)] px-2 py-0.5 text-xs font-mono text-[var(--paisa-text-secondary)]">
                    {cg.tax_category}
                  </span>
                </td>
                <td class="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-[var(--paisa-text-primary)]">
                  {formatFloat(fy.units)}
                </td>
                <td class="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                  <div class="font-medium text-[var(--paisa-text-primary)]">
                    {formatCurrency(fy.purchase_price)}
                  </div>
                  <div class="text-[0.6875rem] text-[var(--paisa-text-muted)]">
                    {formatCurrency(fy.units > 0 ? fy.purchase_price / fy.units : 0, 2)} / unit
                  </div>
                </td>
                <td class="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                  <div class="font-medium text-[var(--paisa-text-primary)]">
                    {formatCurrency(fy.sell_price)}
                  </div>
                  <div class="text-[0.6875rem] text-[var(--paisa-text-muted)]">
                    {formatCurrency(fy.units > 0 ? fy.sell_price / fy.units : 0, 2)} / unit
                  </div>
                </td>
                <td class="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums {gainClass(fy.tax.gain)}">
                  {formatCurrency(fy.tax.gain)}
                </td>
                <td class="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums {gainClass(fy.tax.taxable)}">
                  {formatCurrency(fy.tax.taxable)}
                </td>
                <td class="whitespace-nowrap px-3 py-2.5 text-right tabular-nums {fy.tax.short_term !== 0 ? 'font-semibold text-[var(--paisa-text-primary)]' : 'text-[var(--paisa-muted-foreground)]'}">
                  {formatCurrency(fy.tax.short_term)}
                </td>
                <td class="whitespace-nowrap px-3 py-2.5 text-right tabular-nums {fy.tax.long_term !== 0 ? 'font-semibold text-[var(--paisa-text-primary)]' : 'text-[var(--paisa-muted-foreground)]'}">
                  {formatCurrency(fy.tax.long_term)}
                </td>
                <td class="whitespace-nowrap px-3 py-2.5 text-right tabular-nums {fy.tax.slab !== 0 ? 'font-semibold text-[var(--paisa-text-primary)]' : 'text-[var(--paisa-muted-foreground)]'}">
                  {formatCurrency(fy.tax.slab)}
                </td>
              </tr>
            {/snippet}
            {#snippet content()}
              <tr>
                <td colspan="11" class="p-0">
                  <CapitalGainDetailCard fyCapitalGain={fy} />
                </td>
              </tr>
            {/snippet}
          </Toggleable>
        {/each}
      </tbody>
    </table>
  </div>
</Card>
