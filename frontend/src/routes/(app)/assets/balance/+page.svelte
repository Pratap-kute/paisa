<script lang="ts">
import AssetsBalance from "$lib/features/assets/components/AssetsBalance.svelte";
import type { AssetBreakdown } from "$lib/domain/assets";
import { api } from "$lib/api";
import { onMount } from "svelte";
import Page from "$lib/shared/layout/Page.svelte";
import PageHeader from "$lib/shared/layout/PageHeader.svelte";
import Section from "$lib/shared/layout/Section.svelte";
import ZeroState from "$lib/shared/ui/ZeroState.svelte";

let breakdowns: Record<string, AssetBreakdown> = $state({});
let isLoading = $state(true);

let hasBreakdowns = $derived(Object.keys(breakdowns).length > 0);

onMount(async () => {
  try {
    const res = await api.assets.getAssetsBalance();
    breakdowns =
      (res.asset_breakdowns as unknown as Record<string, AssetBreakdown>) || {};
  } finally {
    isLoading = false;
  }
});
</script>

<svelte:head>
  <title>Asset Balance - Paisa</title>
</svelte:head>

<Page width="analysis">
  <PageHeader
    title="Asset Balance"
    description="Hierarchical balance tree across all asset accounts"
  />

  <Section
    title="Account Balances"
    subtitle="Market value, cost, and performance by account"
  >
    {#if isLoading}
      <div
        class="flex flex-col gap-[var(--paisa-space-2)] rounded-[var(--paisa-radius-md)] border border-border-subtle p-[var(--paisa-space-4)]"
        aria-hidden="true"
      >
        {#each Array(6) as _}
          <div class="h-5 animate-pulse rounded-[var(--paisa-radius-sm)] bg-surface-hover"></div>
        {/each}
      </div>
    {:else if !hasBreakdowns}
      <ZeroState item={[]}>
        <p class="text-sm text-muted-foreground">
          No asset account balances found.
        </p>
      </ZeroState>
    {:else}
      <div class="max-w-full overflow-auto rounded-[var(--paisa-radius-md)] border border-border-subtle">
        <AssetsBalance {breakdowns} />
      </div>
    {/if}
  </Section>
</Page>
