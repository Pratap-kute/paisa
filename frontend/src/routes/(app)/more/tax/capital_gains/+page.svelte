<script lang="ts">
import { api } from "$lib/api";
import type { CapitalGain } from "$lib/domain/tax";
import type { FYCapitalGain } from "$lib/domain/tax";
import { formatCurrency } from "$lib/shared/formatters/currency";
import CapitalGainCard from "$lib/features/assets/components/CapitalGainCard.svelte";
import Card from "$lib/shared/ui/Card.svelte";
import MetricStrip from "$lib/shared/layout/MetricStrip.svelte";
import Metric from "$lib/shared/layout/Metric.svelte";
import { sumBy, uniq } from "es-toolkit";
import { onMount } from "svelte";
import Page from "$lib/shared/layout/Page.svelte";
import PageHeader from "$lib/shared/layout/PageHeader.svelte";
import Section from "$lib/shared/layout/Section.svelte";
import ZeroState from "$lib/shared/ui/ZeroState.svelte";
import { values } from "$lib/shared/utils/collection";

let years: string[] = $state([]);
let selectedYear: string = $state("");
let capitalGains: CapitalGain[] = $state([]);
let isLoading = $state(true);

let hasYears = $derived(years.length > 0);

// Active gains for the selected year
let activeFyGains = $derived.by((): FYCapitalGain[] => {
  if (!selectedYear) return [];
  if (selectedYear === "all") {
    return capitalGains.flatMap((cg) => Object.values(cg.fy));
  }
  return capitalGains.flatMap((cg) =>
    cg.fy[selectedYear] ? [cg.fy[selectedYear]] : []
  );
});

// KPIs for the selected view
let metrics = $derived.by(() => {
  const withdrawn = sumBy(activeFyGains, (fy) => fy.sell_price);
  const purchase = sumBy(activeFyGains, (fy) => fy.purchase_price);
  const gain = sumBy(activeFyGains, (fy) => fy.tax.gain);
  const taxableGain = sumBy(activeFyGains, (fy) => fy.tax.taxable);
  const shortTermTax = sumBy(activeFyGains, (fy) => fy.tax.short_term);
  const longTermTax = sumBy(activeFyGains, (fy) => fy.tax.long_term);
  const slabTax = sumBy(activeFyGains, (fy) => fy.tax.slab);
  const totalTax = shortTermTax + longTermTax + slabTax;

  return {
    withdrawn,
    purchase,
    gain,
    taxableGain,
    shortTermTax,
    longTermTax,
    slabTax,
    totalTax,
  };
});

// Yearly summary rows for the "All Years" comparison table
let yearlySummaries = $derived.by(() => {
  return years.map((yr) => {
    const yrGains = capitalGains.flatMap((cg) => cg.fy[yr] ? [cg.fy[yr]] : []);
    const sold = sumBy(yrGains, (fy) => fy.sell_price);
    const gain = sumBy(yrGains, (fy) => fy.tax.gain);
    const taxable = sumBy(yrGains, (fy) => fy.tax.taxable);
    const stcg = sumBy(yrGains, (fy) => fy.tax.short_term);
    const ltcg = sumBy(yrGains, (fy) => fy.tax.long_term);
    const slab = sumBy(yrGains, (fy) => fy.tax.slab);
    return {
      year: yr,
      assetCount: yrGains.length,
      sold,
      gain,
      taxable,
      stcg,
      ltcg,
      slab,
      totalTax: stcg + ltcg + slab,
    };
  });
});

function gainStatus(value: number): "positive" | "negative" | "neutral" {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

function gainClass(value: number) {
  if (value > 0) return "text-[var(--paisa-positive)]";
  if (value < 0) return "text-[var(--paisa-negative)]";
  return "text-[var(--paisa-muted-foreground)]";
}

onMount(async () => {
  try {
    const { capital_gains } = await api.capitalGains
      .getCapitalGains() as unknown as {
        capital_gains: Record<string, CapitalGain>;
      };

    years = uniq(
      Object.values(capital_gains).flatMap((c: any) => Object.keys(c.fy)),
    )
      .sort()
      .reverse();

    capitalGains = values(capital_gains);
    if (years.length > 0) {
      selectedYear = years[0];
    }
  } finally {
    isLoading = false;
  }
});
</script>

<svelte:head>
  <title>Capital Gains - Paisa</title>
</svelte:head>

<Page width="analysis">
  <PageHeader
    title="Capital Gains"
    description="Financial year capital gains summary and asset realization"
  >
    {#snippet actions()}
      {#if hasYears}
        <div class="flex items-center gap-2">
          <label for="fy-select" class="text-xs font-medium text-[var(--paisa-muted-foreground)]">
            Period:
          </label>
          <select
            id="fy-select"
            bind:value={selectedYear}
            class="rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--paisa-text-primary)] shadow-sm transition-colors focus:border-[var(--paisa-brand-primary)] focus:outline-none"
          >
            {#each years as yr}
              <option value={yr}>{yr}</option>
            {/each}
            <option value="all">All Years (Summary)</option>
          </select>
        </div>
      {/if}
    {/snippet}
  </PageHeader>

  <Section>
    {#if isLoading}
      <div
        class="flex flex-col gap-[var(--paisa-space-4)]"
        aria-hidden="true"
      >
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {#each Array(4) as _}
            <div class="h-20 animate-pulse rounded-[var(--paisa-radius-md)] bg-[var(--paisa-surface-hover)]"></div>
          {/each}
        </div>
        <div class="h-64 animate-pulse rounded-[var(--paisa-radius-md)] bg-[var(--paisa-surface-hover)]"></div>
      </div>
    {:else if !hasYears}
      <ZeroState item={[]}>
        <p class="text-sm text-[var(--paisa-muted-foreground)]">
          No capital gains recorded.
        </p>
      </ZeroState>
    {:else}
      <!-- Top High-Level Metric Strip -->
      <MetricStrip cols="auto">
        <Metric
          label="Realized Gain"
          value={formatCurrency(metrics.gain)}
          status={gainStatus(metrics.gain)}
        />
        <Metric
          label="Taxable Gain"
          value={formatCurrency(metrics.taxableGain)}
          status={gainStatus(metrics.taxableGain)}
        />
        <Metric
          label="Total Tax Liability"
          value={formatCurrency(metrics.totalTax)}
          secondary={`LTCG: ${formatCurrency(metrics.longTermTax)} | STCG: ${formatCurrency(metrics.shortTermTax)}`}
        />
        <Metric
          label="Total Proceeds"
          value={formatCurrency(metrics.withdrawn)}
          secondary={`Cost: ${formatCurrency(metrics.purchase)}`}
        />
      </MetricStrip>

      <!-- Main Content Area -->
      {#if selectedYear !== "all"}
        <!-- Focused Single Year Detail View -->
        <div class="mt-4">
          <CapitalGainCard financialYear={selectedYear} {capitalGains} />
        </div>
      {:else}
        <!-- Multi-Year Overview Table -->
        <div class="mt-4 flex flex-col gap-[var(--paisa-space-6)]">
          <Card padding="none" class="w-full overflow-hidden">
            {#snippet header()}
              <div class="flex items-center justify-between">
                <span class="text-base font-semibold text-[var(--paisa-foreground)]">
                  Historical Financial Years Summary
                </span>
                <span class="text-xs font-medium text-[var(--paisa-muted-foreground)]">
                  {years.length} financial years
                </span>
              </div>
            {/snippet}

            <div class="w-full overflow-x-auto">
              <table class="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr class="border-b border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-raised)] text-left text-xs font-medium text-[var(--paisa-muted-foreground)]">
                    <th class="px-3 py-2.5">Financial Year</th>
                    <th class="px-3 py-2.5 text-right">Sold Amount</th>
                    <th class="px-3 py-2.5 text-right">Realized Gain</th>
                    <th class="px-3 py-2.5 text-right">Taxable Gain</th>
                    <th class="px-3 py-2.5 text-right">STCG Tax</th>
                    <th class="px-3 py-2.5 text-right">LTCG Tax</th>
                    <th class="px-3 py-2.5 text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--paisa-border-subtle)]">
                  {#each yearlySummaries as summary (summary.year)}
                    <tr
                      class="cursor-pointer transition-colors hover:bg-[var(--paisa-surface-hover)]"
                      onclick={() => (selectedYear = summary.year)}
                    >
                      <td class="whitespace-nowrap px-3 py-2.5 font-semibold text-[var(--paisa-brand-primary)]">
                        {summary.year}
                        <span class="ml-1 text-xs font-normal text-[var(--paisa-text-muted)]">
                          ({summary.assetCount} {summary.assetCount === 1 ? "asset" : "assets"})
                        </span>
                      </td>
                      <td class="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-[var(--paisa-text-primary)]">
                        {formatCurrency(summary.sold)}
                      </td>
                      <td class="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums {gainClass(summary.gain)}">
                        {formatCurrency(summary.gain)}
                      </td>
                      <td class="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums {gainClass(summary.taxable)}">
                        {formatCurrency(summary.taxable)}
                      </td>
                      <td class="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-[var(--paisa-text-secondary)]">
                        {formatCurrency(summary.stcg)}
                      </td>
                      <td class="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-[var(--paisa-text-secondary)]">
                        {formatCurrency(summary.ltcg)}
                      </td>
                      <td class="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-[var(--paisa-text-primary)]">
                        {formatCurrency(summary.totalTax)}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </Card>

          <div class="flex flex-col gap-[var(--paisa-space-4)]">
            <h3 class="text-sm font-semibold uppercase tracking-wider text-[var(--paisa-text-secondary)]">
              All Financial Year Realizations
            </h3>
            {#each years as yr}
              <CapitalGainCard financialYear={yr} {capitalGains} />
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </Section>
</Page>
