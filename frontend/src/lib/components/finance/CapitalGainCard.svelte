<script lang="ts">
  import { formatCurrency, formatFloat, type CapitalGain, type FYCapitalGain } from "$lib/core/utils";
  import _ from "lodash";
  import CapitalGainDetailCard from "./CapitalGainDetailCard.svelte";
  import Toggleable from "$lib/components/ui/Toggleable.svelte";
  import Card from "$lib/components/ui/Card.svelte";

  interface Props {
    financialYear: string;
    capitalGains: CapitalGain[];
  }

  let { financialYear, capitalGains }: Props = $props();

  let fyGains: FYCapitalGain[] = $derived(
    _.flatMap(capitalGains, (cg) => cg.fy[financialYear] || [])
  );

  let total = $derived({
    withdrawn: _.sumBy(fyGains, (fy) => fy.sell_price),
    gain: _.sumBy(fyGains, (fy) => fy.tax.gain),
    taxableGain: _.sumBy(fyGains, (fy) => fy.tax.taxable),
    shortTermTax: _.sumBy(fyGains, (fy) => fy.tax.short_term),
    longTermTax: _.sumBy(fyGains, (fy) => fy.tax.long_term),
    slab: _.sumBy(fyGains, (fy) => fy.tax.slab)
  });

  const summaryRows = $derived([
    { label: "Withdrawn", value: formatCurrency(total.withdrawn) },
    { label: "Gain", value: formatCurrency(total.gain) },
    { label: "Taxable Gain", value: formatCurrency(total.taxableGain) },
    { label: "Short Term Tax", value: formatCurrency(total.shortTermTax) },
    { label: "Long Term Tax", value: formatCurrency(total.longTermTax) },
    { label: "Taxable at Slab Rate", value: formatCurrency(total.slab) },
  ]);
</script>

<Card padding="none" class="w-full">
  {#snippet header()}
    <span class="text-base font-semibold text-[var(--paisa-foreground)]">{financialYear}</span>
  {/snippet}

  <div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
    <div class="w-full">
      <table class="w-full border-collapse text-sm">
        <tbody>
          {#each summaryRows as row}
            <tr class="border-b border-[var(--paisa-border-subtle)] last:border-b-0">
              <td class="whitespace-nowrap px-2 py-1.5 text-[var(--paisa-muted-foreground)]">
                {row.label}
              </td>
              <td class="whitespace-nowrap px-2 py-1.5 text-right font-semibold tabular-nums">
                {row.value}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="w-full overflow-x-auto">
      <table class="w-full min-w-[960px] border-collapse text-sm">
        <thead>
          <tr class="border-b border-[var(--paisa-border-subtle)] text-left text-[var(--paisa-muted-foreground)]">
            <th class="px-2 py-1.5"></th>
            <th class="px-2 py-1.5">Account</th>
            <th class="px-2 py-1.5">Tax Category</th>
            <th class="px-2 py-1.5 text-right">Sold Units</th>
            <th class="px-2 py-1.5 text-right">Purchase Price</th>
            <th class="px-2 py-1.5 text-right">Average Purchase Unit Price</th>
            <th class="px-2 py-1.5 text-right">Sell Price</th>
            <th class="px-2 py-1.5 text-right">Average Sell Unit Price</th>
            <th class="px-2 py-1.5 text-right">Gain</th>
            <th class="px-2 py-1.5 text-right">Taxable Gain</th>
            <th class="px-2 py-1.5 text-right">Short Term Tax</th>
            <th class="px-2 py-1.5 text-right">Long Term Tax</th>
            <th class="px-2 py-1.5 text-right">Taxable at Slat Rate</th>
          </tr>
        </thead>
        <tbody>
          {#each capitalGains as cg}
            {#if cg.fy[financialYear]}
              {@const fy = cg.fy[financialYear]}
              <Toggleable>
                {#snippet toggle({ active, onclick })}
                  <tr
                    class="cursor-pointer border-b border-[var(--paisa-border-subtle)] hover:bg-[var(--paisa-surface-hover)] {active
                      ? 'bg-[var(--paisa-surface-hover)]'
                      : ''}"
                    onclick={(e) => onclick(e)}
                  >
                    <td class="px-2 py-1.5">
                      <span class="text-[var(--paisa-primary)]">
                        <i
                          class="fas {active ? 'fa-chevron-up' : 'fa-chevron-down'}"
                          aria-hidden="true"
                        ></i>
                      </span>
                    </td>
                    <td class="px-2 py-1.5">{cg.account}</td>
                    <td class="px-2 py-1.5">{cg.tax_category}</td>
                    <td class="px-2 py-1.5 text-right tabular-nums">{formatFloat(fy.units)}</td>
                    <td class="px-2 py-1.5 text-right tabular-nums">{formatCurrency(fy.purchase_price)}</td>
                    <td class="px-2 py-1.5 text-right tabular-nums">
                      {formatCurrency(fy.purchase_price / fy.units, 4)}
                    </td>
                    <td class="px-2 py-1.5 text-right tabular-nums">{formatCurrency(fy.sell_price)}</td>
                    <td class="px-2 py-1.5 text-right tabular-nums">
                      {formatCurrency(fy.sell_price / fy.units, 4)}
                    </td>
                    <td class="px-2 py-1.5 text-right font-semibold tabular-nums">
                      {formatCurrency(fy.tax.gain)}
                    </td>
                    <td class="px-2 py-1.5 text-right font-semibold tabular-nums">
                      {formatCurrency(fy.tax.taxable)}
                    </td>
                    <td class="px-2 py-1.5 text-right font-semibold tabular-nums">
                      {formatCurrency(fy.tax.short_term)}
                    </td>
                    <td class="px-2 py-1.5 text-right font-semibold tabular-nums">
                      {formatCurrency(fy.tax.long_term)}
                    </td>
                    <td class="px-2 py-1.5 text-right font-semibold tabular-nums">
                      {formatCurrency(fy.tax.slab)}
                    </td>
                  </tr>
                {/snippet}
                {#snippet content()}
                  <tr>
                    <td colspan="13" class="p-0">
                      <CapitalGainDetailCard fyCapitalGain={fy} />
                    </td>
                  </tr>
                {/snippet}
              </Toggleable>
            {/if}
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</Card>
