<script lang="ts">
  import {
    filterHarvestables,
    harvestablePercentage,
  } from "$lib/charts/harvest_data";
  import {
    ajax,
    formatCurrency,
    formatFloat,
    formatPercentage,
    restName,
    type Harvestable,
  } from "$lib/core/utils";
  import { sumBy } from "es-toolkit";
  import { onMount } from "svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import MetricStrip from "$lib/components/layout/MetricStrip.svelte";
  import Metric from "$lib/components/layout/Metric.svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import ChartFrame from "$lib/components/ui/ChartFrame.svelte";
  import HarvestCard from "$lib/components/tax/HarvestCard.svelte";

  let isLoading = $state(true);
  let harvestables: Harvestable[] = $state([]);
  let selectedAccount: string = $state("");
  const isEmpty = $derived(!isLoading && harvestables.length === 0);

  let selectedHarvestable = $derived(
    harvestables.find((h) => h.account === selectedAccount) || harvestables[0],
  );

  // High-level portfolio metrics across all harvestable holdings
  let portfolioMetrics = $derived.by(() => {
    const totalHarvestableValue = sumBy(
      harvestables,
      (h) => h.harvestable_units * h.current_unit_price,
    );
    const totalUnrealizedGain = sumBy(
      harvestables,
      (h) => h.unrealized_gain,
    );
    const totalTaxableGain = sumBy(
      harvestables,
      (h) => h.taxable_unrealized_gain,
    );
    const totalUnits = sumBy(harvestables, (h) => h.total_units);
    const totalHarvestableUnits = sumBy(harvestables, (h) => h.harvestable_units);
    const overallRatio = totalUnits > 0 ? (totalHarvestableUnits / totalUnits) * 100 : 0;

    return {
      totalHarvestableValue,
      totalUnrealizedGain,
      totalTaxableGain,
      eligibleHoldingsCount: harvestables.length,
      overallRatio,
    };
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
      const response = await ajax("/api/harvest");
      harvestables = filterHarvestables(Object.values(response.harvestables));
      if (harvestables.length > 0) {
        selectedAccount = harvestables[0].account;
      }
    } finally {
      isLoading = false;
    }
  });
</script>

<svelte:head>
  <title>Tax Loss Harvesting - Paisa</title>
</svelte:head>

<Page width="analysis">
  <PageHeader
    title="Tax Loss Harvesting"
    description="Identify tax-saving opportunities by offsetting capital gains with losses"
  >
    {#snippet actions()}
      {#if !isEmpty && harvestables.length > 0}
        <div class="flex items-center gap-2">
          <label for="holding-select" class="text-xs font-medium text-[var(--paisa-muted-foreground)]">
            Holding:
          </label>
          <select
            id="holding-select"
            bind:value={selectedAccount}
            class="rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--paisa-text-primary)] shadow-sm transition-colors focus:border-[var(--paisa-brand-primary)] focus:outline-none"
          >
            {#each harvestables as h}
              <option value={h.account}>
                {restName(h.account)} ({h.tax_category})
              </option>
            {/each}
            <option value="all">All Holdings Overview</option>
          </select>
        </div>
      {/if}
    {/snippet}
  </PageHeader>

  <Section>
    <ChartFrame
      height="content"
      loading={isLoading}
      empty={!isLoading && isEmpty}
      emptyMessage="No harvestable tax-loss opportunities found"
    >
      <!-- Portfolio-Level Metric Strip -->
      <MetricStrip cols="auto">
        <Metric
          label="Total Harvestable Value"
          value={formatCurrency(portfolioMetrics.totalHarvestableValue)}
          secondary={`${portfolioMetrics.eligibleHoldingsCount} eligible holdings`}
        />
        <Metric
          label="Total Unrealized Gain"
          value={formatCurrency(portfolioMetrics.totalUnrealizedGain)}
          status={gainStatus(portfolioMetrics.totalUnrealizedGain)}
        />
        <Metric
          label="Taxable Unrealized Gain"
          value={formatCurrency(portfolioMetrics.totalTaxableGain)}
          status={gainStatus(portfolioMetrics.totalTaxableGain)}
        />
        <Metric
          label="Overall Harvestable Ratio"
          value={formatPercentage(portfolioMetrics.overallRatio / 100, 1)}
          secondary="of total held units"
        />
      </MetricStrip>

      <!-- Main Content Area -->
      {#if selectedAccount !== "all" && selectedHarvestable}
        <!-- Focused Single Holding Detail View -->
        <div class="mt-4" data-testid="harvestables">
          <HarvestCard harvestable={selectedHarvestable} />
        </div>
      {:else}
        <!-- Multi-Holding Summary Comparison Table -->
        <div class="mt-4 flex flex-col gap-[var(--paisa-space-6)]" data-testid="harvestables">
          <Card padding="none" class="w-full overflow-hidden">
            {#snippet header()}
              <div class="flex items-center justify-between">
                <span class="text-base font-semibold text-[var(--paisa-foreground)]">
                  All Harvestable Holdings Summary
                </span>
                <span class="text-xs font-medium text-[var(--paisa-muted-foreground)]">
                  {harvestables.length} holdings
                </span>
              </div>
            {/snippet}

            <div class="w-full overflow-x-auto">
              <table class="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr class="border-b border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-2)] text-left text-xs font-medium text-[var(--paisa-muted-foreground)]">
                    <th class="px-3.5 py-2.5">Holding Account</th>
                    <th class="px-3.5 py-2.5">Tax Category</th>
                    <th class="px-3.5 py-2.5 text-right">Harvestable Units</th>
                    <th class="px-3.5 py-2.5 text-right">Unit Price</th>
                    <th class="px-3.5 py-2.5 text-right">Harvestable Value</th>
                    <th class="px-3.5 py-2.5 text-right">Unrealized Gain</th>
                    <th class="px-3.5 py-2.5 text-right">Share %</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--paisa-border-subtle)]">
                  {#each harvestables as h (h.account)}
                    {@const val = h.harvestable_units * h.current_unit_price}
                    {@const pct = harvestablePercentage(h)}
                    <tr
                      class="cursor-pointer transition-colors hover:bg-[var(--paisa-surface-hover)]"
                      onclick={() => (selectedAccount = h.account)}
                    >
                      <td class="whitespace-nowrap px-3.5 py-2.5 font-semibold text-[var(--paisa-brand-primary)]">
                        {restName(h.account)}
                      </td>
                      <td class="whitespace-nowrap px-3.5 py-2.5">
                        <span class="inline-flex items-center rounded-[var(--paisa-radius-sm)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-2)] px-2 py-0.5 text-xs font-mono text-[var(--paisa-text-secondary)]">
                          {h.tax_category}
                        </span>
                      </td>
                      <td class="whitespace-nowrap px-3.5 py-2.5 text-right tabular-nums text-[var(--paisa-text-primary)]">
                        {formatFloat(h.harvestable_units)}
                        <span class="ml-1 text-[0.6875rem] text-[var(--paisa-text-muted)]">
                          / {formatFloat(h.total_units)}
                        </span>
                      </td>
                      <td class="whitespace-nowrap px-3.5 py-2.5 text-right tabular-nums text-[var(--paisa-text-secondary)]">
                        {formatCurrency(h.current_unit_price, 2)}
                      </td>
                      <td class="whitespace-nowrap px-3.5 py-2.5 text-right font-semibold tabular-nums text-[var(--paisa-text-primary)]">
                        {formatCurrency(val)}
                      </td>
                      <td class="whitespace-nowrap px-3.5 py-2.5 text-right font-semibold tabular-nums {gainClass(h.unrealized_gain)}">
                        {formatCurrency(h.unrealized_gain)}
                      </td>
                      <td class="whitespace-nowrap px-3.5 py-2.5 text-right tabular-nums text-[var(--paisa-positive)]">
                        {formatFloat(pct)}%
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </Card>

          <div class="flex flex-col gap-[var(--paisa-space-4)]">
            <h3 class="text-sm font-semibold uppercase tracking-wider text-[var(--paisa-text-secondary)]">
              All Holding Details & Simulators
            </h3>
            {#each harvestables as h (h.account)}
              <HarvestCard harvestable={h} />
            {/each}
          </div>
        </div>
      {/if}
    </ChartFrame>
  </Section>
</Page>
