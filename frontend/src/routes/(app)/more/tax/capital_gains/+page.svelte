<script lang="ts">
  import type { CapitalGain } from "$lib/core/utils";
  import CapitalGainCard from "$lib/components/finance/CapitalGainCard.svelte";
  import { ajax } from "$lib/core/utils";
  import { uniq } from "es-toolkit";
  import { onMount } from "svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";
import { values } from "$lib/core/collection";

  let years: string[] = $state([]);
  let capitalGains: CapitalGain[] = $state([]);
  let isLoading = $state(true);

  let hasYears = $derived(years.length > 0);

  onMount(async () => {
    try {
      const { capital_gains: capital_gains } = await ajax("/api/capital_gains");

      years = uniq(
        Object.values(capital_gains).flatMap((c: any) => Object.keys(c.fy)),
      )
        .sort()
        .reverse();

      capitalGains = values(capital_gains);
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
  />

  <Section>
    {#if isLoading}
      <div
        class="flex flex-col gap-[var(--paisa-space-4)]"
        aria-hidden="true"
      >
        {#each Array(2) as _}
          <div class="h-48 animate-pulse rounded-[var(--paisa-radius-md)] bg-[var(--paisa-surface-hover)]"></div>
        {/each}
      </div>
    {:else if !hasYears}
      <ZeroState item={[]}>
        <p class="text-sm text-[var(--paisa-muted-foreground)]">
          No capital gains recorded.
        </p>
      </ZeroState>
    {:else}
      <div class="flex flex-col gap-[var(--paisa-space-4)]">
        {#each years as year}
          <CapitalGainCard financialYear={year} {capitalGains} />
        {/each}
      </div>
    {/if}
  </Section>
</Page>
