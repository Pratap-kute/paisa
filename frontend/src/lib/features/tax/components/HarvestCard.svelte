<script lang="ts">
import dayjs from "dayjs";
import { formatFloat } from "$lib/shared/formatters/currency";
import { restName } from "$lib/domain/account";
import type { Harvestable } from "$lib/domain/tax";
import { round } from "es-toolkit";
import {
  harvestablePercentage,
  unitsRequiredFromAmount,
  unitsRequiredFromGain,
} from "$lib/features/tax/harvest_data";
import { formatCurrency } from "$lib/shared/formatters/currency";
import Card from "$lib/shared/ui/Card.svelte";

interface Props {
  harvestable: Harvestable;
  hideHeader?: boolean;
}

let { harvestable, hideHeader = false }: Props = $props();
let units = $state(0);
let amount = $state(0);
let taxableGain = $state(0);
let initialized = false;
const percentage = $derived(harvestablePercentage(harvestable));
const barPercentage = $derived(Math.max(0, Math.min(100, percentage)));

$effect(() => {
  if (initialized) return;
  const initial = unitsRequiredFromGain(harvestable, 100000);
  units = initial[0];
  amount = round(initial[1]);
  taxableGain = round(initial[2]);
  initialized = true;
});

function updateFromAmount(value: number) {
  const result = unitsRequiredFromAmount(harvestable, value || 0);
  units = result[0];
  amount = round(result[1]);
  taxableGain = round(result[2]);
}

function updateFromGain(value: number) {
  const result = unitsRequiredFromGain(harvestable, value || 0);
  units = result[0];
  amount = round(result[1]);
  taxableGain = round(result[2]);
}

function gainClass(value: number) {
  if (value > 0) return "text-positive";
  if (value < 0) return "text-negative";
  return "text-muted-foreground";
}
</script>

<Card padding="none" class="w-full overflow-hidden" data-testid="harvest-card">
  {#if !hideHeader}
    {#snippet header()}
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <span class="text-base font-semibold text-foreground">
            {restName(harvestable.account)}
          </span>
          <span class="inline-flex items-center rounded-[var(--paisa-radius-sm)] border border-border-subtle bg-surface-raised px-2 py-0.5 text-xs font-mono text-muted-foreground">
            {harvestable.tax_category}
          </span>
        </div>
        <span class="text-xs text-muted-foreground">
          Price as of {dayjs(harvestable.current_unit_date).format("DD MMM YYYY")}
        </span>
      </div>
    {/snippet}
  {/if}

  <div class="flex flex-col divide-y divide-[var(--paisa-border-subtle)]">
    <!-- Simulator & Progress Block -->
    <div class="grid grid-cols-1 gap-4 bg-surface p-4 lg:grid-cols-12">
      <!-- Interactive Redemption Simulator -->
      <div class="flex flex-col gap-3 rounded-[var(--paisa-radius-md)] border border-border-subtle bg-surface-raised p-3.5 lg:col-span-7">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Redemption Simulator
          </span>
          <span class="text-[0.6875rem] text-muted-foreground">
            NAV: {formatCurrency(harvestable.current_unit_price, 2)} / unit
          </span>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div class="flex flex-col gap-1">
            <label for="taxable-gain-input" class="text-xs font-medium text-muted-foreground">
              Target Taxable Gain
            </label>
            <div class="relative flex items-center">
              <span class="absolute left-2.5 text-xs font-semibold text-muted-foreground">₹</span>
              <input
                id="taxable-gain-input"
                type="number"
                step="5000"
                aria-label="Taxable gain"
                value={taxableGain}
                class="w-full rounded-[var(--paisa-radius-sm)] border border-border-subtle bg-surface py-1.5 pl-6 pr-2 text-sm font-semibold tabular-nums text-foreground shadow-sm focus:border-[var(--paisa-primary)] focus:outline-none"
                oninput={(event) => updateFromGain(event.currentTarget.valueAsNumber)}
              />
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label for="redemption-amount-input" class="text-xs font-medium text-muted-foreground">
              Redemption Proceeds
            </label>
            <div class="relative flex items-center">
              <span class="absolute left-2.5 text-xs font-semibold text-muted-foreground">₹</span>
              <input
                id="redemption-amount-input"
                type="number"
                step="5000"
                aria-label="Redemption amount"
                value={amount}
                class="w-full rounded-[var(--paisa-radius-sm)] border border-border-subtle bg-surface py-1.5 pl-6 pr-2 text-sm font-semibold tabular-nums text-foreground shadow-sm focus:border-[var(--paisa-primary)] focus:outline-none"
                oninput={(event) => updateFromAmount(event.currentTarget.valueAsNumber)}
              />
            </div>
          </div>
        </div>

        <div class="mt-1 rounded-[var(--paisa-radius-sm)] bg-surface p-2.5 text-xs">
          <span class="text-muted-foreground">Required Redemption:</span>
          <strong class="ml-1 text-sm font-bold text-primary">{formatFloat(units)}</strong> units
          <span class="text-muted-foreground">will realize</span>
          <strong class="text-foreground">{formatCurrency(amount)}</strong>
          <span class="text-muted-foreground">with</span>
          <strong class="text-positive">{formatCurrency(taxableGain)}</strong> taxable gain.
        </div>
      </div>

      <!-- Holding Stats & Progress Bar -->
      <div class="flex flex-col justify-between gap-3 rounded-[var(--paisa-radius-md)] border border-border-subtle bg-surface-raised p-3.5 lg:col-span-5">
        <div>
          <div class="mb-1.5 flex items-center justify-between text-xs font-semibold">
            <span class="text-positive">Harvestable ({formatFloat(percentage)}%)</span>
            <span class="text-muted-foreground">Remaining ({formatFloat(100 - percentage)}%)</span>
          </div>
          <div class="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-raised">
            <div class="bg-positive transition-all duration-300" style:width={`${barPercentage}%`}></div>
            <div class="flex-1 bg-[var(--paisa-chart-series-3)] opacity-60"></div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <div class="flex flex-col rounded bg-surface p-2">
            <span class="text-[0.6875rem] text-muted-foreground">Harvestable Units</span>
            <span class="font-bold tabular-nums text-positive">{formatFloat(harvestable.harvestable_units)}</span>
          </div>
          <div class="flex flex-col rounded bg-surface p-2">
            <span class="text-[0.6875rem] text-muted-foreground">Balance Units</span>
            <span class="font-bold tabular-nums text-foreground">{formatFloat(harvestable.total_units)}</span>
          </div>
          <div class="flex flex-col rounded bg-surface p-2">
            <span class="text-[0.6875rem] text-muted-foreground">Unrealized Gain</span>
            <span class="font-bold tabular-nums {gainClass(harvestable.unrealized_gain)}">{formatCurrency(harvestable.unrealized_gain)}</span>
          </div>
          <div class="flex flex-col rounded bg-surface p-2">
            <span class="text-[0.6875rem] text-muted-foreground">Taxable Gain</span>
            <span class="font-bold tabular-nums {gainClass(harvestable.taxable_unrealized_gain)}">{formatCurrency(harvestable.taxable_unrealized_gain)}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Full-Width Lot Breakdown Table -->
    <div class="w-full overflow-x-auto">
      <table class="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr class="border-b border-border-subtle bg-surface-raised text-left text-xs font-medium text-muted-foreground">
            <th class="px-3.5 py-2.5">Purchase Date</th>
            <th class="px-3.5 py-2.5 text-right">Units</th>
            <th class="px-3.5 py-2.5 text-right">Purchase Cost</th>
            <th class="px-3.5 py-2.5 text-right">Current Value</th>
            <th class="px-3.5 py-2.5 text-right">Unrealized Gain</th>
            <th class="px-3.5 py-2.5 text-right">Taxable Gain</th>
            <th class="px-3.5 py-2.5 text-right">STCG Tax</th>
            <th class="px-3.5 py-2.5 text-right">LTCG Tax</th>
            <th class="px-3.5 py-2.5 text-right">Slab Tax</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--paisa-border-subtle)]">
          {#each harvestable.harvest_breakdown as breakdown, index (`${breakdown.purchase_date}-${index}`)}
            <tr class="transition-colors hover:bg-surface-hover">
              <td class="whitespace-nowrap px-3.5 py-2.5 font-medium text-foreground">
                {dayjs(breakdown.purchase_date).format("DD MMM YYYY")}
              </td>
              <td class="whitespace-nowrap px-3.5 py-2.5 text-right tabular-nums text-foreground">
                {formatFloat(breakdown.units)}
              </td>
              <td class="whitespace-nowrap px-3.5 py-2.5 text-right tabular-nums">
                <div class="font-medium text-foreground">
                  {formatCurrency(breakdown.purchase_price)}
                </div>
                <div class="text-[0.6875rem] text-muted-foreground">
                  {formatCurrency(breakdown.purchase_unit_price, 2)} / unit
                </div>
              </td>
              <td class="whitespace-nowrap px-3.5 py-2.5 text-right tabular-nums">
                <div class="font-medium text-foreground">
                  {formatCurrency(breakdown.current_price)}
                </div>
                <div class="text-[0.6875rem] text-muted-foreground">
                  {formatCurrency(harvestable.current_unit_price, 2)} / unit
                </div>
              </td>
              <td class="whitespace-nowrap px-3.5 py-2.5 text-right font-semibold tabular-nums {gainClass(breakdown.tax.gain)}">
                {formatCurrency(breakdown.tax.gain)}
              </td>
              <td class="whitespace-nowrap px-3.5 py-2.5 text-right font-semibold tabular-nums {gainClass(breakdown.tax.taxable)}">
                {formatCurrency(breakdown.tax.taxable)}
              </td>
              <td class="whitespace-nowrap px-3.5 py-2.5 text-right tabular-nums {breakdown.tax.short_term !== 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}">
                {formatCurrency(breakdown.tax.short_term)}
              </td>
              <td class="whitespace-nowrap px-3.5 py-2.5 text-right tabular-nums {breakdown.tax.long_term !== 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}">
                {formatCurrency(breakdown.tax.long_term)}
              </td>
              <td class="whitespace-nowrap px-3.5 py-2.5 text-right tabular-nums {breakdown.tax.slab !== 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}">
                {formatCurrency(breakdown.tax.slab)}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</Card>
