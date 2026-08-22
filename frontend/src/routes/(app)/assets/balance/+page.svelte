<script lang="ts">
  import AssetsBalance from "$lib/components/finance/AssetsBalance.svelte";
  import { ajax, type AssetBreakdown } from "$lib/core/utils";
  import { onMount } from "svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";

  let breakdowns: Record<string, AssetBreakdown> = $state({});
  let isLoading = $state(true);

  let hasBreakdowns = $derived(Object.keys(breakdowns).length > 0);

  onMount(async () => {
    try {
      ({ asset_breakdowns: breakdowns } = await ajax("/api/assets/balance"));
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
      <div class="paisa-balance-loading" aria-hidden="true">
        {#each Array(6) as _}
          <div class="paisa-balance-loading-row"></div>
        {/each}
      </div>
    {:else if !hasBreakdowns}
      <ZeroState item={[]}>
        <p class="text-sm text-[var(--paisa-muted-foreground)]">
          No asset account balances found.
        </p>
      </ZeroState>
    {:else}
      <div class="paisa-balance-table-wrap">
        <AssetsBalance {breakdowns} />
      </div>
    {/if}
  </Section>
</Page>

<style lang="scss">
  .paisa-balance-table-wrap {
    border: 1px solid var(--paisa-border-subtle);
    border-radius: var(--paisa-radius-md);
    overflow: auto;
    max-width: 100%;
  }

  .paisa-balance-loading {
    display: flex;
    flex-direction: column;
    gap: var(--paisa-space-2);
    padding: var(--paisa-space-4);
    border: 1px solid var(--paisa-border-subtle);
    border-radius: var(--paisa-radius-md);
  }

  .paisa-balance-loading-row {
    height: 1.25rem;
    border-radius: var(--paisa-radius-sm);
    background: linear-gradient(
      90deg,
      var(--paisa-surface-hover) 25%,
      var(--paisa-surface) 50%,
      var(--paisa-surface-hover) 75%
    );
    background-size: 200% 100%;
    animation: paisa-shimmer 1.2s ease-in-out infinite;
  }

  @keyframes paisa-shimmer {
    0% {
      background-position: 100% 0;
    }
    100% {
      background-position: -100% 0;
    }
  }
</style>
